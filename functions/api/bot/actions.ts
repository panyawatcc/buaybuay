import { requireAuth } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * GET /api/bot/actions?account_id=act_xxx&page=1&limit=20
 * Returns paginated bot action log from D1.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);

  if (auth.type === 'unauthorized') return auth.response;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');
  const page = Math.max(1, parseInt(reqUrl.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(reqUrl.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  try {
    const [actionsResult, countResult] = await Promise.all([
      context.env.DB.prepare(
        `SELECT id, rule_id, rule_name, campaign_id, campaign_name, action_type,
                previous_value, new_value, change_percent, executed_at, undone_at
         FROM bot_actions
         WHERE user_id = ? AND account_id = ?
         ORDER BY executed_at DESC
         LIMIT ? OFFSET ?`,
      )
        .bind(auth.user.sub, accountId, limit, offset)
        .all(),
      context.env.DB.prepare(
        'SELECT COUNT(*) as total FROM bot_actions WHERE user_id = ? AND account_id = ?',
      )
        .bind(auth.user.sub, accountId)
        .first(),
    ]);

    const actions = (actionsResult.results || []).map((row: any) => ({
      id: row.id,
      ruleId: row.rule_id,
      ruleName: row.rule_name,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      actionType: row.action_type,
      previousValue: row.previous_value,
      newValue: row.new_value,
      changePercent: row.change_percent,
      executedAt: row.executed_at,
      canUndo: !row.undone_at,
    }));

    return Response.json({
      actions,
      total: (countResult as any)?.total || 0,
      page,
    });
  } catch {
    return Response.json({ error: 'Failed to fetch bot actions' }, { status: 500 });
  }
};
