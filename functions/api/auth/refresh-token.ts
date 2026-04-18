import { decryptToken, encryptToken } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  TOKEN_ENCRYPTION_KEY: string;
  CRON_SECRET: string;
  FB_APP_ID: string;
  FB_APP_SECRET: string;
}

/**
 * POST /api/auth/refresh-token
 * Cron: check all FB tokens, refresh if expiring within 14 days.
 * Auth: X-Cron-Secret only.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const cronSecret = context.request.headers.get('X-Cron-Secret');

  if (!context.env.CRON_SECRET || cronSecret !== context.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ts = context.request.headers.get('X-Cron-Timestamp');
  if (ts && Math.abs(Date.now() / 1000 - parseInt(ts, 10)) > 60) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = (await context.env.DB.prepare(
      'SELECT id, email, fb_token, fb_token_expires_at FROM users WHERE fb_token IS NOT NULL',
    ).all()).results || [];

    let checked = 0, refreshed = 0, expiringSoon = 0, failed = 0;

    for (const user of users as any[]) {
      checked++;

      const token = await decryptToken(user.fb_token, context.env.TOKEN_ENCRYPTION_KEY);

      if (!token) { failed++; continue; }

      // Check token validity via FB debug_token
      try {
        const debugUrl = `https://graph.facebook.com/v25.0/debug_token?input_token=${token}&access_token=${context.env.FB_APP_ID}|${context.env.FB_APP_SECRET}`;
        const debugRes = await fetch(debugUrl);
        const debugData = (await debugRes.json()) as any;
        const tokenData = debugData.data;

        if (!tokenData?.is_valid) {
          failed++;
          continue;
        }

        const expiresAt = tokenData.expires_at; // unix seconds, 0 = never expires
        const now = Math.floor(Date.now() / 1000);
        const daysLeft = expiresAt > 0 ? (expiresAt - now) / 86400 : 999;

        if (daysLeft > 14) continue; // Still fresh

        expiringSoon++;

        // Exchange for new long-lived token
        const exchangeUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token');
        exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token');
        exchangeUrl.searchParams.set('client_id', context.env.FB_APP_ID);
        exchangeUrl.searchParams.set('client_secret', context.env.FB_APP_SECRET);
        exchangeUrl.searchParams.set('fb_exchange_token', token);

        const exchangeRes = await fetch(exchangeUrl.toString());
        const exchangeData = (await exchangeRes.json()) as any;

        if (exchangeData.access_token) {
          const newEncrypted = await encryptToken(exchangeData.access_token, context.env.TOKEN_ENCRYPTION_KEY);
          const newExpiry = exchangeData.expires_in
            ? Date.now() + exchangeData.expires_in * 1000
            : null;

          await context.env.DB.prepare(
            'UPDATE users SET fb_token = ?, fb_token_expires_at = ? WHERE id = ?',
          )
            .bind(newEncrypted, newExpiry, user.id)
            .run();

          refreshed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return Response.json({ checked, refreshed, expiringSoon, failed });
  } catch {
    return Response.json({ error: 'Token refresh failed' }, { status: 500 });
  }
};
