import { requireRole, type Role } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * PUT /api/rules/:id — update rule
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const ruleId = (context.params as any).id;

  // Verify ownership
  const existing = await context.env.DB.prepare('SELECT id FROM rules WHERE id = ? AND user_id = ?')
    .bind(ruleId, auth.user.sub)
    .first();

  if (!existing) {
    return Response.json({ error: 'Rule not found' }, { status: 404 });
  }

  let body: any;

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: any[] = [];

    if (body.name != null) { sets.push('name = ?'); vals.push(body.name); }
    if (body.isActive != null) { sets.push('is_active = ?'); vals.push(body.isActive ? 1 : 0); }
    if (body.campaignIds !== undefined) { sets.push('campaign_ids = ?'); vals.push(body.campaignIds ? JSON.stringify(body.campaignIds) : null); }

    if (body.condition) {
      const c = body.condition;
      if (c.metric) { sets.push('condition_metric = ?'); vals.push(c.metric); }
      if (c.operator) { sets.push('condition_operator = ?'); vals.push(c.operator); }
      if (c.value != null) { sets.push('condition_value = ?'); vals.push(c.value); }
      if (c.period) { sets.push('condition_period = ?'); vals.push(c.period); }
    }

    if (body.action) {
      const a = body.action;
      if (a.type) { sets.push('action_type = ?'); vals.push(a.type); }
      if (a.value != null) { sets.push('action_value = ?'); vals.push(a.value); }
      if (a.unit) { sets.push('action_unit = ?'); vals.push(a.unit); }
      if (a.maxBudget !== undefined) { sets.push('action_max_budget = ?'); vals.push(a.maxBudget); }
    }

    if (body.cooldownHours != null) { sets.push('cooldown_hours = ?'); vals.push(body.cooldownHours); }

    // Phase 2 — profitability
    if (body.targetRoas !== undefined) { sets.push('target_roas = ?'); vals.push(body.targetRoas); }
    if (body.breakevenCpaOverride !== undefined) { sets.push('breakeven_cpa_override = ?'); vals.push(body.breakevenCpaOverride); }
    if (body.minPurchases !== undefined) { sets.push('min_purchases = ?'); vals.push(body.minPurchases); }
    if (body.productAov !== undefined) { sets.push('product_aov = ?'); vals.push(body.productAov); }
    if (body.productMarginPct !== undefined) { sets.push('product_margin_pct = ?'); vals.push(body.productMarginPct); }
    // Phase 3 — budget policy
    if (body.dailyBudgetCap !== undefined) { sets.push('daily_budget_cap = ?'); vals.push(body.dailyBudgetCap); }
    if (body.scalingStepPct !== undefined) { sets.push('scaling_step_pct = ?'); vals.push(body.scalingStepPct); }
    // Phase 4 — auto-actions
    if (body.autoPauseEnabled !== undefined) { sets.push('auto_pause_enabled = ?'); vals.push(body.autoPauseEnabled ? 1 : 0); }
    if (body.autoPauseSpendMultiplier !== undefined) { sets.push('auto_pause_spend_multiplier = ?'); vals.push(body.autoPauseSpendMultiplier); }
    if (body.cloneWinnerEnabled !== undefined) { sets.push('clone_winner_enabled = ?'); vals.push(body.cloneWinnerEnabled ? 1 : 0); }
    if (body.cloneWinnerRoasMultiplier !== undefined) { sets.push('clone_winner_roas_multiplier = ?'); vals.push(body.cloneWinnerRoasMultiplier); }
    if (body.cloneWinnerConsecutiveDays !== undefined) { sets.push('clone_winner_consecutive_days = ?'); vals.push(body.cloneWinnerConsecutiveDays); }
    // Phase 5 — creative health
    if (body.maxFrequency !== undefined) { sets.push('max_frequency = ?'); vals.push(body.maxFrequency); }
    if (body.minCtr !== undefined) { sets.push('min_ctr = ?'); vals.push(body.minCtr); }
    // 2026-04-18 bundle — clone controls + safety caps
    if (body.cloneStatus !== undefined) {
      const v = body.cloneStatus === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
      sets.push('clone_status = ?'); vals.push(v);
    }
    if (body.cooldownMinutes !== undefined) {
      const v = Number.isFinite(+body.cooldownMinutes) ? Math.max(0, Math.floor(+body.cooldownMinutes)) : 0;
      sets.push('cooldown_minutes = ?'); vals.push(v);
    }
    if (body.maxBudgetChangePercent !== undefined) {
      const v = Number.isFinite(+body.maxBudgetChangePercent) ? Math.max(0, Math.min(100, Math.floor(+body.maxBudgetChangePercent))) : 100;
      sets.push('max_budget_change_percent = ?'); vals.push(v);
    }
    // Bundle 0023 — trigger mode (last_metric_value is server-managed, not client-updatable).
    if (body.triggerMode !== undefined) {
      const v = body.triggerMode === 'incremental' ? 'incremental' : 'absolute';
      sets.push('trigger_mode = ?'); vals.push(v);
    }

    if (sets.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    sets.push('updated_at = ?');
    vals.push(now);
    vals.push(ruleId);

    await context.env.DB.prepare(`UPDATE rules SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Failed to update rule' }, { status: 500 });
  }
};

// PATCH uses same logic as PUT (partial update)
export const onRequestPatch: PagesFunction<Env> = onRequestPut;

/**
 * DELETE /api/rules/:id
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const ruleId = (context.params as any).id;

  try {
    const result = await context.env.DB.prepare('DELETE FROM rules WHERE id = ? AND user_id = ?')
      .bind(ruleId, auth.user.sub)
      .run();

    if (!result.meta.changes) {
      return Response.json({ error: 'Rule not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
};
