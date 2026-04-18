import { requireRole, type Role } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * GET /api/rules/history?account_id=act_xxx&rule_id=xxx&page=1&limit=50
 * Execution history: join rule_executions + bot_actions + rules.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const reqUrl = new URL(context.request.url);
  const accountId = reqUrl.searchParams.get('account_id');
  const ruleId = reqUrl.searchParams.get('rule_id');
  const page = Math.max(1, parseInt(reqUrl.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(reqUrl.searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  try {
    let query = `
      SELECT re.id, re.rule_id, re.evaluated_at, re.triggered, re.current_value, re.action_taken, re.bot_action_id,
             r.name as rule_name, r.condition_value as threshold, r.condition_metric,
             ba.campaign_name, ba.previous_value as previous_budget, ba.new_value as new_budget, ba.undone_at
      FROM rule_executions re
      JOIN rules r ON re.rule_id = r.id
      LEFT JOIN bot_actions ba ON re.bot_action_id = ba.id
      WHERE r.user_id = ? AND r.account_id = ?
    `;
    const params: any[] = [auth.user.sub, accountId];

    if (ruleId) {
      query += ' AND re.rule_id = ?';
      params.push(ruleId);
    }

    query += ' ORDER BY re.evaluated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await context.env.DB.prepare(query).bind(...params).all();

    // Count
    let countQuery = `
      SELECT COUNT(*) as total FROM rule_executions re
      JOIN rules r ON re.rule_id = r.id
      WHERE r.user_id = ? AND r.account_id = ?
    `;
    const countParams: any[] = [auth.user.sub, accountId];

    if (ruleId) {
      countQuery += ' AND re.rule_id = ?';
      countParams.push(ruleId);
    }

    const countResult = await context.env.DB.prepare(countQuery).bind(...countParams).first() as any;

    const executions = (result.results || []).map((row: any) => ({
      id: row.id,
      ruleId: row.rule_id,
      ruleName: row.rule_name,
      evaluatedAt: row.evaluated_at,
      triggered: !!row.triggered,
      currentValue: row.current_value,
      threshold: row.threshold,
      metric: row.condition_metric,
      actionTaken: row.action_taken,
      campaignName: row.campaign_name,
      previousBudget: row.previous_budget,
      newBudget: row.new_budget,
      undone: !!row.undone_at,
    }));

    return Response.json({ executions, total: countResult?.total || 0, page });
  } catch {
    return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
};
