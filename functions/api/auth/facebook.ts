import { checkRateLimit } from '../../_lib/rate-limit';

/**
 * GET /api/auth/facebook
 * Redirect user to Facebook OAuth consent screen.
 * - Rate limited: 5 req/min/IP
 * - State stored in KV for CSRF protection (10 min TTL, one-time use in callback)
 */
export const onRequestGet: PagesFunction<{
  FB_APP_ID: string;
  FB_REDIRECT_URI: string;
  STATE_KV: KVNamespace;
}> = async (context) => {
  // P0 #2: Rate limit
  const rateLimitResp = await checkRateLimit(context.env.STATE_KV, context.request, 'auth', {
    max: 5,
    windowSec: 60,
  });

  if (rateLimitResp) return rateLimitResp;

  const appId = context.env.FB_APP_ID;
  // Self-host: FB_REDIRECT_URI must be set to the customer's deployed origin
  // (e.g., https://adbot.example.com/api/auth/callback) AND registered in
  // Meta Developer Console → App Settings → Facebook Login → Valid OAuth
  // Redirect URIs. See META_DEV_CONSOLE.md for the operations playbook.
  const redirectUri = context.env.FB_REDIRECT_URI;
  if (!redirectUri) {
    return Response.json(
      { error: 'FB_REDIRECT_URI not configured', hint: 'Set this secret to https://<your-domain>/api/auth/callback then redeploy' },
      { status: 500 },
    );
  }

  const scopes = [
    'ads_management',
    'ads_read',
    'business_management',
    'pages_read_engagement',
    'pages_show_list',           // Post Booster F-B: list user pages
    'pages_read_user_content',   // Post Booster F-B: read page posts for keyword search
  ].join(',');

  // P0 #1: Store state in KV for CSRF validation (10 min TTL)
  const state = crypto.randomUUID();
  await context.env.STATE_KV.put(`state:${state}`, '1', { expirationTtl: 600 });

  const url = new URL('https://www.facebook.com/v25.0/dialog/oauth');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  // Force FB to re-prompt the consent dialog even when user previously
  // granted. Prior OAuth runs cached an old scope set (no pages_show_list /
  // pages_read_user_content) and silently re-issued a token without the
  // new scopes — /me/accounts then 403'd. auth_type=rerequest ensures the
  // user sees the fresh permission list and can approve the added scopes.
  url.searchParams.set('auth_type', 'rerequest');

  return Response.redirect(url.toString(), 302);
};
