import { requireRole, encryptToken, type Role } from '../../../_lib/auth';
import { getFbContext, FbContextError } from '../../../_lib/fb-context';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

// Minutes a cached page_tokens row is fresh. After this we refresh from FB
// on the next call (lazy — cheap because typical user has <10 pages).
const CACHE_FRESH_MINUTES = 60;

/**
 * GET /api/ai/post-booster/pages
 * Returns user's FB pages with their cached page-level access tokens
 * (decrypted server-side is not surfaced — only page id/name/fan_count).
 * Refreshes from /me/accounts if cache is stale or empty.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager', 'viewer'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const userId = auth.user.sub;

  // 1) Read cache.
  const rows = (await context.env.DB.prepare(
    `SELECT page_id, page_name, fan_count, updated_at FROM page_tokens WHERE user_id = ?`,
  ).bind(userId).all()).results as any[];

  const freshCutoff = Date.now() - CACHE_FRESH_MINUTES * 60 * 1000;
  const haveFresh = rows.length > 0 && rows.every(r => new Date(r.updated_at + 'Z').getTime() > freshCutoff);

  if (haveFresh) {
    return Response.json({
      pages: rows.map(r => ({ id: r.page_id, name: r.page_name, fan_count: r.fan_count })),
      source: 'cache',
    });
  }

  // 2) Stale or empty — refresh from FB using the admin's token
  // (Hybrid Agency). NB semantic gap: /v25.0/me/accounts scoped to the
  // admin's FB user returns admin-owned pages. Customer-owned pages
  // Post Booster originally targeted need a separate model (customer
  // grants page access to admin via Business Manager) — flagged for
  // Post Booster Phase 2 product decision. For now, refreshing returns
  // pages the admin's token can see, same as any other FB call.
  let token: string;
  try {
    const ctx = await getFbContext(context.env, userId);
    token = ctx.admin_token;
  } catch (e) {
    const code = e instanceof FbContextError ? e.code : 'unknown';
    return Response.json({ pages: [], source: 'no_fb_context', reason: code });
  }

  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,fan_count,access_token&limit=200&access_token=${token}`,
    );
    if (!pagesRes.ok) {
      // Capture FB error body so DEVOPS tail surfaces code/subcode/message
      // for both code paths (this inline one + upsertPagesFromUserToken helper).
      let body = '';
      try { body = (await pagesRes.text()).slice(0, 400); } catch {}
      console.log(`[pages-endpoint] /me/accounts !ok status=${pagesRes.status} body=${body}`);
      // Fall back to stale cache if FB is unhappy.
      return Response.json({
        pages: rows.map(r => ({ id: r.page_id, name: r.page_name, fan_count: r.fan_count })),
        source: 'cache_stale',
        fb_status: pagesRes.status,
      });
    }
    const pd = (await pagesRes.json()) as { data?: { id: string; name?: string; fan_count?: number; access_token?: string }[] };
    const pages = pd.data ?? [];
    for (const p of pages) {
      if (!p.id || !p.access_token) continue;
      const enc = await encryptToken(p.access_token, context.env.TOKEN_ENCRYPTION_KEY);
      await context.env.DB.prepare(
        `INSERT INTO page_tokens (user_id, page_id, page_name, fan_count, token_encrypted, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, page_id) DO UPDATE SET
           page_name = excluded.page_name,
           fan_count = excluded.fan_count,
           token_encrypted = excluded.token_encrypted,
           updated_at = datetime('now')`,
      ).bind(userId, p.id, p.name ?? null, typeof p.fan_count === 'number' ? p.fan_count : null, enc).run();
    }
    return Response.json({
      pages: pages.map(p => ({ id: p.id, name: p.name, fan_count: p.fan_count })),
      source: 'fb_refresh',
    });
  } catch {
    return Response.json({
      pages: rows.map(r => ({ id: r.page_id, name: r.page_name, fan_count: r.fan_count })),
      source: 'cache_fallback',
    });
  }
};
