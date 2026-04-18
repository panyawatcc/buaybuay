import { decryptToken } from './auth';

export type UserRole = 'admin' | 'customer' | 'manager' | 'viewer';

export interface FbContext {
  admin_token: string;
  allowed_ad_accounts: string[];    // ['act_123', ...]
  role: UserRole;
  admin_user_id: string;
  admin_fb_user_id: string;
  admin_fb_business_id: string | null;
}

export interface FbContextEnv {
  DB: D1Database;
  TOKEN_ENCRYPTION_KEY: string;
}

export class FbContextError extends Error {
  constructor(public code: 'user_not_found' | 'no_admin_token' | 'decrypt_failed' | 'admin_fetch_failed', message?: string) {
    super(message ?? code);
    this.name = 'FbContextError';
  }
}

/**
 * Load FB calling context for a given user.
 *
 * Hybrid agency model: the app only ever holds the admin's FB token.
 * Customers have no FB token of their own — instead they get access via
 * Business Manager partner sharing, and the ad_accounts table records
 * which ad_account_ids each customer is allowed to see/act on.
 *
 * - admin role: allowed_ad_accounts populated live from /me/adaccounts.
 * - customer / manager / viewer: allowed_ad_accounts populated from
 *   the ad_accounts table (status='active' only).
 *
 * Throws FbContextError on structural failures (missing user, missing
 * admin token, decrypt failure, admin live-fetch failure). Endpoints
 * should catch + return appropriate HTTP error.
 */
export async function getFbContext(env: FbContextEnv, userId: string): Promise<FbContext> {
  const user = (await env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(userId).first()) as { id: string; role: UserRole | null } | null;
  if (!user) throw new FbContextError('user_not_found');
  const role: UserRole = (user.role ?? 'customer') as UserRole;

  // Multi-admin SaaS isolation (2026-04-18): when caller is an admin,
  // return THEIR own admin_fb_tokens row (scoped by admin_user_id), not any
  // random admin's `LIMIT 1`. For non-admin callers (viewer/manager in the
  // hybrid-agency model), keep the legacy `LIMIT 1` lookup — customers without
  // a personal FB token currently rely on SOME admin's token to serve their
  // scoped ad_accounts table reads. Long-term the non-admin path should be
  // replaced with an owning_admin_id foreign key (tracked separately in
  // backend-user-onboarding-flow-verify.md).
  const adminRow = (role === 'admin'
    ? await env.DB.prepare(`
        SELECT admin_user_id, fb_token_encrypted, fb_user_id, fb_business_id
        FROM admin_fb_tokens
        WHERE admin_user_id = ?
        LIMIT 1
      `).bind(userId).first()
    : await env.DB.prepare(`
        SELECT a.admin_user_id, a.fb_token_encrypted, a.fb_user_id, a.fb_business_id
        FROM admin_fb_tokens a
        JOIN users u ON u.id = a.admin_user_id
        WHERE u.role = 'admin'
        LIMIT 1
      `).first()) as {
    admin_user_id: string;
    fb_token_encrypted: string;
    fb_user_id: string;
    fb_business_id: string | null;
  } | null;
  if (!adminRow?.fb_token_encrypted) throw new FbContextError('no_admin_token');

  const decrypted = await decryptToken(adminRow.fb_token_encrypted, env.TOKEN_ENCRYPTION_KEY);
  if (!decrypted) throw new FbContextError('decrypt_failed');

  let allowed: string[];
  if (role === 'admin') {
    // Admin: live list from FB so newly-granted accounts surface without a DB sync.
    try {
      const res = await fetch(`https://graph.facebook.com/v25.0/me/adaccounts?fields=id&limit=200&access_token=${decrypted}`);
      if (!res.ok) {
        // Capture FB error body so the 502 we emit surfaces the actual FB code/subcode
        // (2026-04-18 incident — User Token vs System User Token diagnosis). Truncate
        // so we don't leak excessive response data into client-visible error messages.
        let fbBody = '';
        try { fbBody = (await res.text()).slice(0, 500); } catch {}
        console.log(`[fb-context] /me/adaccounts !ok status=${res.status} body=${fbBody}`);
        throw new FbContextError('admin_fetch_failed', `status=${res.status} body=${fbBody}`);
      }
      const body = (await res.json()) as { data?: { id: string }[] };
      allowed = (body.data ?? []).map(a => a.id).filter(Boolean);
    } catch (e) {
      if (e instanceof FbContextError) throw e;
      throw new FbContextError('admin_fetch_failed', e instanceof Error ? e.message : String(e));
    }
  } else {
    const rows = (await env.DB.prepare(
      "SELECT ad_account_id FROM ad_accounts WHERE owner_user_id = ? AND status = 'active'",
    ).bind(userId).all()).results as { ad_account_id: string }[];
    allowed = rows.map(r => r.ad_account_id);
  }

  return {
    admin_token: decrypted,
    allowed_ad_accounts: allowed,
    role,
    admin_user_id: adminRow.admin_user_id,
    admin_fb_user_id: adminRow.fb_user_id,
    admin_fb_business_id: adminRow.fb_business_id,
  };
}

// Guard: is the given ad_account_id reachable from this context?
// Use after getFbContext to enforce per-tenant isolation at every
// endpoint that takes an ad_account_id as input.
export function assertAdAccountAllowed(ctx: FbContext, adAccountId: string): boolean {
  if (!adAccountId) return false;
  return ctx.allowed_ad_accounts.includes(adAccountId);
}

// Standard 403 response for out-of-scope access. Mirrors the Thai
// messaging tone used by fb-fetch.ts.
export function adAccountForbiddenResponse(adAccountId: string): Response {
  return Response.json(
    {
      error: 'Ad account นี้ไม่อยู่ในสิทธิ์การเข้าถึงของคุณ',
      ad_account_id: adAccountId,
      hint: 'ติดต่อ admin เพื่อเพิ่มสิทธิ์ผ่าน Business Manager',
    },
    { status: 403 },
  );
}

// Translate FbContextError instances into HTTP responses with Thai-
// friendly messaging. Endpoints typically do:
//   try { ctx = await getFbContext(env, userId); }
//   catch (e) { return fbContextErrorResponse(e); }
export function fbContextErrorResponse(err: unknown): Response {
  if (err instanceof FbContextError) {
    switch (err.code) {
      case 'no_admin_token':
        return Response.json(
          { error: 'ระบบยังไม่ได้ตั้งค่า Facebook admin token', admin_action_required: true },
          { status: 503 },
        );
      case 'decrypt_failed':
        return Response.json(
          { error: 'Facebook token ถอดรหัสไม่สำเร็จ — ติดต่อ admin' },
          { status: 500 },
        );
      case 'admin_fetch_failed':
        return Response.json(
          { error: 'ดึงรายการ ad account จาก Facebook ไม่สำเร็จ', fb_hint: err.message },
          { status: 502 },
        );
      case 'user_not_found':
        return Response.json({ error: 'Session invalid' }, { status: 401 });
    }
  }
  return Response.json({ error: 'fb_context_load_failed' }, { status: 500 });
}
