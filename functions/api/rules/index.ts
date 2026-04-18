import { requireRole, type Role } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const VALID_METRICS = [
  'roas', 'cpa', 'ctr', 'spend', 'conversions', 'cpc',
  'amount_spent', 'results', 'cost_per_result',
  'messaging_conversations', 'cost_per_messaging_conversation',
  'purchase_roas', 'purchases', 'cost_per_purchase', 'avg_purchase_conversion_value',
  'cpm', 'ctr_all', 'clicks_all', 'reach',
  'open_rate', 'open_rate_male',
];
const VALID_OPERATORS = ['gt', 'lt', 'gte', 'lte', 'eq'];
const VALID_ACTION_TYPES = ['budget_increase', 'budget_decrease', 'pause', 'enable', 'telegram_notify', 'bid_increase', 'bid_decrease', 'clone_ad', 'auto_pause', 'clone_winner'];
const VALID_UNITS = ['percent', 'fixed'];

function formatRule(row: any) {
  let conditions: any[] = [];
  if (row.conditions) { try { conditions = JSON.parse(row.conditions); } catch {} }
  if (conditions.length === 0 && row.condition_metric) {
    conditions = [{ metric: row.condition_metric, operator: row.condition_operator, value: row.condition_value, period: row.condition_period }];
  }
  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id,
    campaignIds: row.campaign_ids ? JSON.parse(row.campaign_ids) : null,
    isActive: !!row.is_active,
    condition: { metric: row.condition_metric, operator: row.condition_operator, value: row.condition_value, period: row.condition_period },
    conditions,
    conditionLogic: row.condition_logic || 'and',
    action: { type: row.action_type, value: row.action_value, unit: row.action_unit, maxBudget: row.action_max_budget },
    actions: row.actions ? (() => { try { return JSON.parse(row.actions); } catch { return []; } })()
      : [{ type: row.action_type, value: row.action_value, unit: row.action_unit, maxBudget: row.action_max_budget }],
    actionLogic: row.action_logic || 'and',
    targetLevel: row.target_level || 'campaign',
    targetIds: row.target_ids ? (() => { try { return JSON.parse(row.target_ids); } catch { return []; } })() : [],
    budgetReset: !!row.budget_reset,
    resetTime: row.reset_time || '00:00',
    originalBudget: row.original_budget,
    cooldownHours: row.cooldown_hours,
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Phase 2 — profitability
    targetRoas: row.target_roas,
    breakevenCpaOverride: row.breakeven_cpa_override,
    minPurchases: row.min_purchases,
    productAov: row.product_aov,
    productMarginPct: row.product_margin_pct,
    // Phase 3 — budget policy
    dailyBudgetCap: row.daily_budget_cap,
    scalingStepPct: row.scaling_step_pct,
    // Phase 4 — auto-actions
    autoPauseEnabled: !!row.auto_pause_enabled,
    autoPauseSpendMultiplier: row.auto_pause_spend_multiplier,
    cloneWinnerEnabled: !!row.clone_winner_enabled,
    cloneWinnerRoasMultiplier: row.clone_winner_roas_multiplier,
    cloneWinnerConsecutiveDays: row.clone_winner_consecutive_days,
    // Phase 5 — creative health
    maxFrequency: row.max_frequency,
    minCtr: row.min_ctr,
    // 2026-04-18 bundle — clone controls + safety caps
    cloneStatus: row.clone_status || 'PAUSED',
    cooldownMinutes: row.cooldown_minutes ?? 0,
    maxBudgetChangePercent: row.max_budget_change_percent ?? 100,
    // Bundle 0023 — incremental trigger mode + last-value checkpoint
    triggerMode: row.trigger_mode || 'absolute',
    lastMetricValue: row.last_metric_value,
  };
}

/**
 * GET /api/rules?account_id=act_xxx
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const accountId = new URL(context.request.url).searchParams.get('account_id');

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  try {
    const result = await context.env.DB.prepare(
      'SELECT * FROM rules WHERE user_id = ? AND account_id = ? ORDER BY created_at DESC',
    )
      .bind(auth.user.sub, accountId)
      .all();

    return Response.json({ rules: (result.results || []).map(formatRule) });
  } catch {
    return Response.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
};

/**
 * POST /api/rules
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  let body: any;

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate + sanitize XSS
  if (!body.name || typeof body.name !== 'string') {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }
  body.name = body.name.replace(/<[^>]*>/g, '').trim();

  if (!body.accountId?.startsWith('act_')) {
    return Response.json({ error: 'accountId (act_*) is required' }, { status: 400 });
  }

  const conditionsArr: any[] = body.conditions || (body.condition ? [body.condition] : []);
  if (conditionsArr.length === 0) return Response.json({ error: 'At least one condition is required' }, { status: 400 });
  for (const c of conditionsArr) {
    if (!c || !VALID_METRICS.includes(c.metric) || !VALID_OPERATORS.includes(c.operator) || typeof c.value !== 'number') {
      return Response.json({ error: `condition requires metric, operator, and numeric value` }, { status: 400 });
    }
  }
  const condLogic = body.conditionLogic || 'and';
  if (!['and', 'or'].includes(condLogic)) return Response.json({ error: 'conditionLogic must be "and" or "or"' }, { status: 400 });
  const cond = conditionsArr[0];

  const actionsArr: any[] = body.actions || (body.action ? [body.action] : []);
  if (actionsArr.length === 0) return Response.json({ error: 'At least one action is required' }, { status: 400 });
  for (const a of actionsArr) {
    if (!a || !VALID_ACTION_TYPES.includes(a.type) || typeof a.value !== 'number') return Response.json({ error: 'action requires type and numeric value' }, { status: 400 });
    if (a.unit && !VALID_UNITS.includes(a.unit)) return Response.json({ error: `action.unit must be ${VALID_UNITS}` }, { status: 400 });
  }
  const actLogic = body.actionLogic || 'and';
  if (!['and', 'or'].includes(actLogic)) return Response.json({ error: 'actionLogic must be "and" or "or"' }, { status: 400 });
  const action = actionsArr[0];

  try {
    const id = `rule_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const targetLevel = body.targetLevel || 'campaign';
    const targetIds = Array.isArray(body.targetIds) ? body.targetIds : [];

    // 2026-04-18 bundle fields — validate clone_status enum; numeric defaults preserve backward-compat behavior.
    const cloneStatusVal: 'PAUSED' | 'ACTIVE' = body.cloneStatus === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    const cooldownMinutesVal = Number.isFinite(+body.cooldownMinutes) ? Math.max(0, Math.floor(+body.cooldownMinutes)) : 0;
    const maxBudgetChangePctVal = Number.isFinite(+body.maxBudgetChangePercent) ? Math.max(0, Math.min(100, Math.floor(+body.maxBudgetChangePercent))) : 100;
    // Bundle 0023 — incremental trigger mode (server-managed last_metric_value stays NULL on create).
    const triggerModeVal: 'absolute' | 'incremental' = body.triggerMode === 'incremental' ? 'incremental' : 'absolute';

    await context.env.DB.prepare(
      `INSERT INTO rules (id, user_id, account_id, name, campaign_ids, condition_metric, condition_operator,
        condition_value, condition_period, conditions, condition_logic,
        action_type, action_value, action_unit, action_max_budget, actions, action_logic,
        target_level, target_ids, budget_reset, reset_time,
        cooldown_hours, created_at, updated_at,
        target_roas, breakeven_cpa_override, min_purchases, product_aov, product_margin_pct,
        daily_budget_cap, scaling_step_pct,
        auto_pause_enabled, auto_pause_spend_multiplier,
        clone_winner_enabled, clone_winner_roas_multiplier, clone_winner_consecutive_days,
        max_frequency, min_ctr,
        clone_status, cooldown_minutes, max_budget_change_percent,
        trigger_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?,
               ?, ?,
               ?, ?,
               ?, ?, ?,
               ?, ?,
               ?, ?, ?,
               ?)`,
    )
      .bind(
        id, auth.user.sub, body.accountId, body.name,
        body.campaignIds ? JSON.stringify(body.campaignIds) : null,
        cond.metric, cond.operator, cond.value, cond.period || 'last_7d',
        JSON.stringify(conditionsArr), condLogic,
        action.type, action.value, action.unit || 'percent', action.maxBudget ?? null,
        JSON.stringify(actionsArr), actLogic,
        targetLevel, targetIds.length > 0 ? JSON.stringify(targetIds) : null,
        body.budgetReset ? 1 : 0, body.resetTime || '00:00',
        body.cooldownHours ?? 24, now, now,
        // Phase 2
        body.targetRoas ?? null,
        body.breakevenCpaOverride ?? null,
        body.minPurchases ?? 0,
        body.productAov ?? null,
        body.productMarginPct ?? 0.3,
        // Phase 3
        body.dailyBudgetCap ?? null,
        body.scalingStepPct ?? 0.15,
        // Phase 4
        body.autoPauseEnabled ? 1 : 0,
        body.autoPauseSpendMultiplier ?? 1.5,
        body.cloneWinnerEnabled ? 1 : 0,
        body.cloneWinnerRoasMultiplier ?? 2.0,
        body.cloneWinnerConsecutiveDays ?? 3,
        // Phase 5
        body.maxFrequency ?? 3.5,
        body.minCtr ?? null,
        // 2026-04-18 bundle — clone controls + safety caps
        cloneStatusVal,
        cooldownMinutesVal,
        maxBudgetChangePctVal,
        // Bundle 0023 — trigger mode (last_metric_value left NULL by schema default)
        triggerModeVal,
      )
      .run();

    const created = await context.env.DB.prepare('SELECT * FROM rules WHERE id = ?').bind(id).first();

    return Response.json(formatRule(created), { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to create rule' }, { status: 500 });
  }
};
