import { checkRateLimit } from '../../_lib/rate-limit';
import { encryptToken, getSessionUser } from '../../_lib/auth';
import { upsertPagesFromUserToken, seedAdminFbTokenIfEmpty } from '../ai/post-booster/_lib/page-token';

/**
 * GET /api/auth/callback
 * Facebook redirects here with ?code=xxx&state=yyy after user consent.
 * - Rate limited: 5 req/min/IP
 * - Validates state (CSRF protection — one-time use from KV)
 * - Exchange code for long-lived token (60 days)
 * - Delivers token via URL fragment (not query) → not leaked to Referer/logs
 * - Stores expires_at in fragment so frontend can proactively refresh
 * - When a valid app session cookie is present, also UPDATEs users.fb_token
 *   and UPSERTs page_tokens directly so reconnects don't need a follow-up
 *   /api/auth/connect-facebook round-trip. If no session (uncommon — user
 *   is usually logged in when clicking Connect), the FE hash-fragment flow
 *   still works as before.
 */
export const onRequestGet: PagesFunction<{
  FB_APP_ID: string;
  FB_APP_SECRET: string;
  FB_REDIRECT_URI: string;
  STATE_KV: KVNamespace;
  DB?: D1Database;
  JWT_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
}> = async (context) => {
  const url = new URL(context.request.url);
  const origin = url.origin;

  // P0 #2: Rate limit
  const rateLimitResp = await checkRateLimit(context.env.STATE_KV, context.request, 'auth', {
    max: 5,
    windowSec: 60,
  });

  if (rateLimitResp) return rateLimitResp;

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code) {
    const errorDesc = url.searchParams.get('error_description') || 'Login cancelled';
    return Response.redirect(`${origin}/settings?error=${encodeURIComponent(errorDesc)}`, 302);
  }

  // P0 #1: Validate state (CSRF protection, one-time use)
  if (!state) {
    return Response.redirect(`${origin}/settings?error=missing_state`, 302);
  }

  const storedState = await context.env.STATE_KV.get(`state:${state}`);

  if (!storedState) {
    return Response.redirect(`${origin}/settings?error=invalid_or_expired_state`, 302);
  }

  // Delete immediately — one-time use
  await context.env.STATE_KV.delete(`state:${state}`);

  const appId = context.env.FB_APP_ID;
  const appSecret = context.env.FB_APP_SECRET;
  const redirectUri = context.env.FB_REDIRECT_URI || `${origin}/api/auth/callback`;

  try {
    // Exchange code for short-lived token
    const tokenUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message: string } };

    if (!tokenRes.ok || !tokenData.access_token) {
      const msg = tokenData.error?.message || 'Token exchange failed';
      return Response.redirect(`${origin}/settings?error=${encodeURIComponent(msg)}`, 302);
    }

    // Exchange for long-lived token (60 days)
    const longUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token');
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', appId);
    longUrl.searchParams.set('client_secret', appSecret);
    longUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

    const longRes = await fetch(longUrl.toString());
    const longData = (await longRes.json()) as { access_token?: string; expires_in?: number };

    const finalToken = longData.access_token || tokenData.access_token;

    // P1 #4: Store expires_at so frontend can validate/refresh
    const expiresIn = longData.expires_in || 60 * 24 * 3600; // default 60 days
    const expiresAt = Date.now() + expiresIn * 1000;

    // Server-side save when a valid app session cookie is present.
    // Best-effort — OAuth still succeeds if any of this fails.
    let serverSaved = 0;
    try {
      if (context.env.DB && context.env.JWT_SECRET && context.env.TOKEN_ENCRYPTION_KEY) {
        const session = await getSessionUser(context.request, context.env.JWT_SECRET);
        if (session?.sub) {
          const encrypted = await encryptToken(finalToken, context.env.TOKEN_ENCRYPTION_KEY);
          await context.env.DB.prepare(
            `UPDATE users SET fb_token = ?, fb_token_expires_at = ?, updated_at = ? WHERE id = ?`,
          ).bind(encrypted, expiresAt, Math.floor(Date.now() / 1000), session.sub).run();
          serverSaved = await upsertPagesFromUserToken(
            context.env.DB, session.sub, finalToken, context.env.TOKEN_ENCRYPTION_KEY,
          );
          // Hybrid Agency: seed admin_fb_tokens only when empty (first-time
          // init). Don't clobber an existing System User Token on reconnect —
          // that downgrade is what caused the 2026-04-18 regression.
          if (session.role === 'admin') {
            await seedAdminFbTokenIfEmpty(
              context.env.DB, session.sub, finalToken, context.env.TOKEN_ENCRYPTION_KEY, expiresAt,
            );
          }
        }
      }
    } catch {}

    /*
     * P0 #3: Token via URL fragment (not query) — fragment is NOT sent to:
     * - Server logs
     * - Referer header (when clicking external links)
     * - Analytics tools
     * Frontend AuthSuccess reads window.location.hash
     */
    const fragment = new URLSearchParams();
    fragment.set('token', finalToken);
    fragment.set('expires_at', String(expiresAt));
    if (serverSaved > 0) fragment.set('pages_cached', String(serverSaved));

    return Response.redirect(`${origin}/auth/success#${fragment.toString()}`, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.redirect(`${origin}/settings?error=${encodeURIComponent(msg)}`, 302);
  }
};
