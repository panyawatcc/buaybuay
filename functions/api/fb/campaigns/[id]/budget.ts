import { requireRole, type Role } from '../../../../_lib/auth';
import { getFbToken } from '../../../../_lib/fb-token';
import { fbFetch, fbErrorResponse } from '../../../../_lib/fb-fetch';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

/**
 * POST /api/fb/campaigns/:id/budget
 * Adjust campaign daily budget via Facebook API.
 * Admin/Manager only. Logs to bot_actions.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const fbAuth = await getFbToken(context.request, context.env);

  if (fbAuth.type === 'error') return fbAuth.response;

  const campaignId = (context.params as any).id;

  let body: { accountId?: string; dailyBudget?: number; reason?: string; ruleId?: string; previousBudget?: number; maxBudget?: number };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { accountId, dailyBudget, reason, ruleId, previousBudget, maxBudget } = body;

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'accountId (act_*) is required' }, { status: 400 });
  }

  if (typeof dailyBudget !== 'number' || dailyBudget <= 0) {
    return Response.json({ error: 'dailyBudget must be a positive number' }, { status: 400 });
  }

  // maxBudget hard cap — enforce BEFORE FB API call (GUARD condition #3)
  if (maxBudget && dailyBudget > maxBudget) {
    return Response.json({
      error: `Budget ${dailyBudget} exceeds maxBudget cap ${maxBudget}`,
      capped: maxBudget,
    }, { status: 400 });
  }

  try {
    // Call Facebook API — budget in cents
    const fbUrl = new URL(`https://graph.facebook.com/v25.0/${campaignId}`);
    fbUrl.searchParams.set('access_token', fbAuth.token);

    const fbRes = await fbFetch(fbUrl.toString(), {
      retries: 2,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_budget: Math.round(dailyBudget * 100) }),
      },
    });
    if (!fbRes.ok) return fbErrorResponse(fbRes);

    // Log to bot_actions BEFORE return success (GUARD condition #13)
    const actionId = crypto.randomUUID();
    const changePercent = previousBudget && previousBudget > 0
      ? +((dailyBudget - previousBudget) / previousBudget * 100).toFixed(1)
      : 0;

    await context.env.DB.prepare(
      `INSERT INTO bot_actions (id, user_id, account_id, rule_id, campaign_id, action_type, previous_value, new_value, change_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        actionId, auth.user.sub, accountId, ruleId || null, campaignId,
        dailyBudget > (previousBudget || 0) ? 'budget_increase' : 'budget_decrease',
        previousBudget || 0, dailyBudget, changePercent,
      )
      .run();

    return Response.json({
      success: true,
      previousBudget: previousBudget || 0,
      newBudget: dailyBudget,
      actionId,
      reason: reason || null,
    });
  } catch {
    return Response.json({ error: 'Failed to adjust budget' }, { status: 500 });
  }
};
