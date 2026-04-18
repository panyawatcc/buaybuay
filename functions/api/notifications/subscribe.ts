import { requireAuth } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * POST /api/notifications/subscribe
 * Body: { endpoint, keys: { p256dh, auth } }
 * Stores Web Push subscription for the authenticated user.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);

  if (auth.type === 'unauthorized') return auth.response;

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: 'endpoint, keys.p256dh, and keys.auth are required' }, { status: 400 });
  }

  try {
    const id = crypto.randomUUID();

    // Upsert: delete old subs for this endpoint, insert new
    await context.env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
      .bind(auth.user.sub, endpoint)
      .run();

    await context.env.DB.prepare(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(id, auth.user.sub, endpoint, keys.p256dh, keys.auth)
      .run();

    return Response.json({ ok: true, id });
  } catch {
    return Response.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
};
