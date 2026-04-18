import { decryptToken, encryptToken } from '../../../../_lib/auth';

// Look up a user's decrypted page access token from page_tokens table.
// Returns null when (user, page) isn't cached — callers should fall back
// to the user token or refuse.
export async function getPageToken(
  db: D1Database,
  userId: string,
  pageId: string,
  encryptionKey: string,
): Promise<string | null> {
  const row = (await db.prepare(
    'SELECT token_encrypted FROM page_tokens WHERE user_id = ? AND page_id = ?',
  ).bind(userId, pageId).first()) as { token_encrypted: string | null } | null;
  if (!row?.token_encrypted) return null;
  return decryptToken(row.token_encrypted, encryptionKey);
}

// Seed the admin_fb_tokens row from a user OAuth token ONLY when no row
// exists yet (first-time init). For subsequent admin reconnects, the
// existing row — typically a System User Token seeded via
// /api/dev/admin-token-set — must NOT be overwritten: a personal User
// OAuth token is shorter-lived and loses Business-Manager-owned ad
// accounts visibility. Regression incident 2026-04-18 (restored from
// admin_fb_tokens_history via F4-1 audit trail). Call sites (callback.ts
// + connect-facebook.ts) should prefer this helper over direct
// upsertAdminFbToken() so reconnect is non-destructive by default.
export async function seedAdminFbTokenIfEmpty(
  db: D1Database,
  adminUserId: string,
  userToken: string,
  encryptionKey: string,
  expiresAtUnixMs: number | null = null,
): Promise<{ ok: boolean; skipped?: 'already_seeded'; fb_user_id?: string; reason?: string }> {
  const existing = await db
    .prepare('SELECT 1 AS present FROM admin_fb_tokens WHERE admin_user_id = ? LIMIT 1')
    .bind(adminUserId)
    .first();
  if (existing) return { ok: true, skipped: 'already_seeded' };
  return upsertAdminFbToken(db, adminUserId, userToken, encryptionKey, expiresAtUnixMs);
}

// Fetch GET /me with a user token and UPSERT into admin_fb_tokens.
// ⚠️ Destructive — overwrites the existing admin_fb_tokens row, which
// may hold a longer-lived System User Token. Prefer seedAdminFbTokenIfEmpty
// for OAuth-reconnect call sites. Use this directly only when a deliberate
// replacement is intended (e.g., /api/dev/admin-token-set, explicit admin
// rotation flows).
export async function upsertAdminFbToken(
  db: D1Database,
  adminUserId: string,
  userToken: string,
  encryptionKey: string,
  expiresAtUnixMs: number | null = null,
): Promise<{ ok: boolean; fb_user_id?: string; reason?: string }> {
  let fbUserId = '';
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/v25.0/me?fields=id&access_token=${encodeURIComponent(userToken)}`,
    );
    if (meRes.ok) {
      const me = (await meRes.json()) as { id?: string };
      fbUserId = me.id ?? '';
    } else {
      const body = await meRes.text().catch(() => '');
      console.log(`[admin-fb-token] /me !ok status=${meRes.status} body=${body.slice(0, 200)}`);
    }
  } catch (e) {
    console.log(`[admin-fb-token] /me exception ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!fbUserId) return { ok: false, reason: 'me_fetch_failed' };

  try {
    const enc = await encryptToken(userToken, encryptionKey);
    await db.prepare(`
      INSERT INTO admin_fb_tokens (admin_user_id, fb_token_encrypted, fb_user_id, scope_granted, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(admin_user_id) DO UPDATE SET
        fb_token_encrypted = excluded.fb_token_encrypted,
        fb_user_id         = excluded.fb_user_id,
        scope_granted      = excluded.scope_granted,
        expires_at         = excluded.expires_at,
        updated_at         = datetime('now')
    `).bind(
      adminUserId, enc, fbUserId,
      'ads_management,ads_read,business_management,pages_read_engagement,pages_show_list,pages_read_user_content',
      expiresAtUnixMs,
    ).run();
    console.log(`[admin-fb-token] upsert ok admin=${adminUserId} fb_user=${fbUserId}`);
    return { ok: true, fb_user_id: fbUserId };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.log(`[admin-fb-token] upsert fail admin=${adminUserId} reason=${reason.slice(0, 200)}`);
    return { ok: false, reason };
  }
}

// Fetch /me/accounts with a user access token and UPSERT each page's
// access token into page_tokens. Best-effort — caller should never
// block their success path on this. Returns count of pages cached
// (0 on any failure).
//
// Used by both the OAuth callback (server-side save with session cookie)
// and the explicit /api/auth/connect-facebook endpoint (JWT-authed save
// from FE after hash-fragment token hand-off).
export async function upsertPagesFromUserToken(
  db: D1Database,
  userId: string,
  userToken: string,
  encryptionKey: string,
): Promise<number> {
  let cached = 0;
  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,fan_count,access_token&limit=200&access_token=${userToken}`,
    );
    if (!pagesRes.ok) {
      // Capture FB error body so DEVOPS tail can see code/subcode/message
      // (hypothesis: FB App in dev mode blocks pages_show_list for non-listed
      // testers → 403 with message_requesting_app_permission). Still best-effort
      // so the OAuth/connect flow doesn't fail on logging.
      let body = '';
      try { body = (await pagesRes.text()).slice(0, 400); } catch {}
      console.log(`[page-token] /me/accounts !ok status=${pagesRes.status} body=${body}`);
      return 0;
    }
    const pd = (await pagesRes.json()) as { data?: { id: string; name?: string; fan_count?: number; access_token?: string }[] };
    for (const p of pd.data ?? []) {
      if (!p.id || !p.access_token) continue;
      const enc = await encryptToken(p.access_token, encryptionKey);
      await db.prepare(
        `INSERT INTO page_tokens (user_id, page_id, page_name, fan_count, token_encrypted, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, page_id) DO UPDATE SET
           page_name = excluded.page_name,
           fan_count = excluded.fan_count,
           token_encrypted = excluded.token_encrypted,
           updated_at = datetime('now')`,
      ).bind(userId, p.id, p.name ?? null, typeof p.fan_count === 'number' ? p.fan_count : null, enc).run();
      cached++;
    }
  } catch {}
  return cached;
}
