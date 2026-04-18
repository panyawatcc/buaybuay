import { requireAuth } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * GET /api/settings/display — currency display preferences
 * PUT /api/settings/display — update preferences
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);

  if (auth.type === 'unauthorized') return auth.response;

  try {
    const row = (await context.env.DB.prepare(
      'SELECT currency, exchange_rate, show_original FROM display_settings WHERE user_id = ?',
    )
      .bind(auth.user.sub)
      .first()) as any;

    return Response.json({
      currency: row?.currency || 'USD',
      exchangeRate: row?.exchange_rate ?? 35.0,
      showOriginalCurrency: row ? !!row.show_original : true,
    });
  } catch {
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);

  if (auth.type === 'unauthorized') return auth.response;

  let body: { currency?: string; exchangeRate?: number; showOriginalCurrency?: boolean };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const currency = body.currency || 'USD';

  if (!['USD', 'THB'].includes(currency)) {
    return Response.json({ error: 'currency must be USD or THB' }, { status: 400 });
  }

  const rate = body.exchangeRate ?? 35.0;

  if (typeof rate !== 'number' || rate <= 0) {
    return Response.json({ error: 'exchangeRate must be a positive number' }, { status: 400 });
  }

  try {
    await context.env.DB.prepare(
      `INSERT INTO display_settings (user_id, currency, exchange_rate, show_original)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         currency = excluded.currency,
         exchange_rate = excluded.exchange_rate,
         show_original = excluded.show_original`,
    )
      .bind(auth.user.sub, currency, rate, body.showOriginalCurrency !== false ? 1 : 0)
      .run();

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
};
