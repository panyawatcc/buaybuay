import { requireRole, encryptToken } from '../../_lib/auth';
import { upsertPagesFromUserToken, seedAdminFbTokenIfEmpty } from '../ai/post-booster/_lib/page-token';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

/**
 * POST /api/auth/connect-facebook
 * Body: { token: string, expires_at: number }
 * Encrypts and saves Facebook long-lived token to the authenticated user's row in DB.
 * Requires admin or manager role.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager']);

  if (auth.type !== 'ok') return auth.response;

  let body: { token?: string; expires_at?: number };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token = body.token;
  const expiresAt = body.expires_at;

  if (!token || typeof token !== 'string') {
    return Response.json({ error: 'token is required' }, { status: 400 });
  }

  if (expiresAt != null && typeof expiresAt !== 'number') {
    return Response.json({ error: 'expires_at must be a number' }, { status: 400 });
  }

  try {
    const encryptionKey = context.env.TOKEN_ENCRYPTION_KEY;

    if (!encryptionKey) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const encryptedToken = await encryptToken(token, encryptionKey);
    const now = Math.floor(Date.now() / 1000);

    await context.env.DB.prepare(
      `UPDATE users SET fb_token = ?, fb_token_expires_at = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(encryptedToken, expiresAt ?? null, now, auth.user.sub)
      .run();

    // Post Booster: fetch + cache per-page access tokens so subsequent
    // /api/ai/post-booster/pages doesn't re-hit FB. Best-effort — OAuth
    // success shouldn't fail just because /me/accounts call hiccups.
    const pagesCached = await upsertPagesFromUserToken(context.env.DB, auth.user.sub, token, encryptionKey);

    // Hybrid Agency: seed admin_fb_tokens from the user OAuth token only if
    // it's empty (first-time init). Subsequent admin reconnects must NOT
    // clobber an existing row, which typically holds a longer-lived System
    // User Token seeded via /api/dev/admin-token-set. Overwriting with a
    // 60-day personal User OAuth token loses BM-owned ad-account visibility
    // (2026-04-18 regression incident).
    let adminFbTokenSaved = false;
    if (auth.user.role === 'admin') {
      const r = await seedAdminFbTokenIfEmpty(
        context.env.DB, auth.user.sub, token, encryptionKey,
        expiresAt != null ? expiresAt : null,
      );
      adminFbTokenSaved = r.ok && !r.skipped;
    }

    return Response.json({ ok: true, pages_cached: pagesCached, admin_fb_token_saved: adminFbTokenSaved });
  } catch {
    return Response.json({ error: 'Failed to save Facebook connection' }, { status: 500 });
  }
};
