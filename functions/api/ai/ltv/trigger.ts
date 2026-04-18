import { requireRole, type Role } from '../../../_lib/auth';
import { gateStub, type LlmGuardEnv } from '../../../_lib/llm-guard';

interface Env extends LlmGuardEnv { JWT_SECRET: string; }

// POST /api/ai/ltv/trigger — act on an LTV prediction (create campaign, push notification, etc).
// Body: { user_ids?: string[], action?: 'campaign' | 'notify' }
// TODO: chain into retargeting configure/run once real data lands.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const gate = await gateStub(context.env, { userId: auth.user.sub, model: 'stub', inputTokens: 0 });
  if (!gate.ok) return Response.json({ error: 'llm_cap_exceeded', reason: gate.reason }, { status: 429 });

  let body: any = {};
  try { body = await context.request.json(); } catch {}
  const userIds: string[] = Array.isArray(body?.user_ids) ? body.user_ids : [];

  const logs: string[] = [];
  for (const uid of userIds.slice(0, 100)) {
    const id = crypto.randomUUID();
    try {
      await context.env.DB.prepare(
        'INSERT INTO ai_ltv_predictions (id, user_id, customer_identifier, predicted_ltv, repurchase_ready, suggested_upsell) VALUES (?,?,?,?,?,?)',
      ).bind(id, auth.user.sub, uid, null, 1, JSON.stringify(body?.upsell ?? [])).run();
      logs.push(id);
    } catch {}
  }

  return Response.json({
    stub: true,
    action: body?.action ?? 'campaign',
    logged_predictions: logs.length,
    mock_campaign_id: `camp_ltv_mock_${Date.now()}`,
    todo: 'chain into retargeting configure/run',
  });
};
