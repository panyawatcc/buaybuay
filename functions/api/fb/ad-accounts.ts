import { requireAuth } from '../../_lib/auth';
import { fbFetch, fbErrorResponse } from '../../_lib/fb-fetch';
import { getFbContext, fbContextErrorResponse } from '../../_lib/fb-context';
import { checkUserRate } from '../../_lib/rate-limit-user';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  STATE_KV?: KVNamespace;
}

const CACHE_TTL_SEC = 300;
const STALE_GRACE_SEC = 1800;

/**
 * GET /api/fb/ad-accounts
 *
 * Admin (role=admin): returns every ad account the admin's FB token
 *   can access (live /me/adaccounts, cached 5 min, stale fallback on
 *   rate-limit).
 * Customer/manager/viewer: returns only the rows owned by this user
 *   in the ad_accounts table (DB-only, no FB call — fast and isolates
 *   per-tenant data without extra graph requests).
 *
 * Per spec §3.5. Replaces the old behavior which read the calling
 * user's own fb_token — now users never have personal FB tokens.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);
  if (auth.type === 'unauthorized') return auth.response;

  const rl = await checkUserRate(context.env.STATE_KV, auth.user.sub, 'fb-ad-accounts');
  if (rl) return rl;

  let ctx;
  try {
    ctx = await getFbContext(context.env, auth.user.sub);
  } catch (e) {
    return fbContextErrorResponse(e);
  }

  // Customer path — pure DB read. Fast, no FB call, no cache needed.
  if (ctx.role !== 'admin') {
    const rows = (await context.env.DB.prepare(`
      SELECT ad_account_id, account_name, currency, timezone, verified_at, last_sync_at, status
      FROM ad_accounts
      WHERE owner_user_id = ? AND status = 'active'
      ORDER BY verified_at DESC
    `).bind(auth.user.sub).all()).results as any[];

    const customerAccounts = rows.map(r => ({
      id: r.ad_account_id,
      name: r.account_name,
      currency: r.currency,
      timezone_name: r.timezone,
      verified_at: r.verified_at,
      last_sync_at: r.last_sync_at,
      status: r.status,
      is_admin_view: false,
    }));
    // Dual-shape response for FE back-compat (some hooks read `data`, newer ones read `ad_accounts`).
    // TODO(2026-04-18 regression unblock): drop `data` once FE commit 9318ff3 deploys.
    return Response.json({
      ad_accounts: customerAccounts,
      data: customerAccounts,
      role: ctx.role,
    });
  }

  // Admin path — live FB fetch with KV cache + stale fallback.
  const userId = auth.user.sub;
  const cacheKey = `fb_ad_accounts_admin:${userId}`;
  const kv = context.env.STATE_KV;

  if (kv) {
    try {
      const raw = await kv.get(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw) as { cachedAt: number; data: any };
        if (Date.now() - cached.cachedAt < CACHE_TTL_SEC * 1000) {
          return Response.json({ ...cached.data, role: 'admin' }, {
            headers: { 'Cache-Control': 'private, max-age=60', 'X-Cache': 'HIT' },
          });
        }
      }
    } catch {}
  }

  const url = new URL('https://graph.facebook.com/v25.0/me/adaccounts');
  url.searchParams.set('access_token', ctx.admin_token);
  url.searchParams.set(
    'fields',
    'id,name,account_id,account_status,currency,timezone_name,amount_spent,balance,business_name',
  );
  url.searchParams.set('limit', '200');

  const res = await fbFetch(url.toString(), { retries: 2 });

  if (res.ok) {
    const adAccounts = ((res.data as { data?: any[] })?.data ?? []).map((a: any) => ({ ...a, is_admin_view: true }));
    // Dual-shape payload for FE back-compat — see customer-path comment above.
    const payload = {
      ad_accounts: adAccounts,
      data: adAccounts,
    };
    if (kv) {
      try {
        await kv.put(cacheKey, JSON.stringify({ cachedAt: Date.now(), data: payload }), {
          expirationTtl: CACHE_TTL_SEC + STALE_GRACE_SEC,
        });
      } catch {}
    }
    return Response.json({ ...payload, role: 'admin' }, {
      headers: { 'Cache-Control': 'private, max-age=60', 'X-Cache': 'MISS' },
    });
  }

  // Rate-limited — return stale cache if available.
  if (res.rateLimited && kv) {
    try {
      const raw = await kv.get(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw) as { cachedAt: number; data: any };
        const ageSec = (Date.now() - cached.cachedAt) / 1000;
        if (ageSec < CACHE_TTL_SEC + STALE_GRACE_SEC) {
          return Response.json({ ...cached.data, role: 'admin' }, {
            headers: {
              'Cache-Control': 'private, max-age=60',
              'X-Cache': 'STALE',
              'X-Rate-Limited': '1',
              'Retry-After': String(res.retryAfterSec ?? 300),
            },
          });
        }
      }
    } catch {}
  }

  return fbErrorResponse(res);
};
