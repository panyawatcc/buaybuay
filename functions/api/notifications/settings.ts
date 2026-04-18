import { requireAuth } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * GET /api/notifications/settings — current user's notification preferences
 * PUT /api/notifications/settings — update preferences
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);

  if (auth.type === 'unauthorized') return auth.response;

  try {
    const row = (await context.env.DB.prepare(
      `SELECT budget_change, rule_triggered, daily_summary,
              telegram_alerts, telegram_daily_summary, push_alerts, push_daily_summary
       FROM notification_settings WHERE user_id = ?`,
    )
      .bind(auth.user.sub)
      .first()) as any;

    return Response.json({
      budgetChange: row ? !!row.budget_change : true,
      ruleTriggered: row ? !!row.rule_triggered : true,
      dailySummary: row ? !!row.daily_summary : true,
      telegramAlerts: row ? !!row.telegram_alerts : true,
      telegramDailySummary: row ? !!row.telegram_daily_summary : true,
      pushAlerts: row ? !!row.push_alerts : true,
      pushDailySummary: row ? !!row.push_daily_summary : false,
    });
  } catch {
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);

  if (auth.type === 'unauthorized') return auth.response;

  let body: any;

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    await context.env.DB.prepare(
      `INSERT INTO notification_settings
         (user_id, budget_change, rule_triggered, daily_summary, telegram_alerts, telegram_daily_summary, push_alerts, push_daily_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         budget_change = excluded.budget_change,
         rule_triggered = excluded.rule_triggered,
         daily_summary = excluded.daily_summary,
         telegram_alerts = excluded.telegram_alerts,
         telegram_daily_summary = excluded.telegram_daily_summary,
         push_alerts = excluded.push_alerts,
         push_daily_summary = excluded.push_daily_summary`,
    )
      .bind(
        auth.user.sub,
        body.budgetChange !== false ? 1 : 0,
        body.ruleTriggered !== false ? 1 : 0,
        body.dailySummary !== false ? 1 : 0,
        body.telegramAlerts !== false ? 1 : 0,
        body.telegramDailySummary !== false ? 1 : 0,
        body.pushAlerts !== false ? 1 : 0,
        body.pushDailySummary === true ? 1 : 0,
      )
      .run();

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
};
