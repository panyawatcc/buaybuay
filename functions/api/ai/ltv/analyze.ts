import { requireRole, type Role } from '../../../_lib/auth';
import { gateStub, type LlmGuardEnv } from '../../../_lib/llm-guard';

interface Env extends LlmGuardEnv { JWT_SECRET: string; }

// POST /api/ai/ltv/analyze
// STUB — analyzes historical orders (ai_crm_orders) to predict repurchase-ready customers.
// No orders table exists pre-Phase 4, so stub emits deterministic mock data.
// TODO: real order cycle analysis — median days-between-orders × customer recency.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const gate = await gateStub(context.env, { userId: auth.user.sub, model: 'stub', inputTokens: 0 });
  if (!gate.ok) return Response.json({ error: 'llm_cap_exceeded', reason: gate.reason }, { status: 429 });

  const repurchaseReady = [
    { user_id: 'mock_user_001', customer: '+66812340001', last_order_at: '2026-03-20', predicted_ltv: 2400 },
    { user_id: 'mock_user_002', customer: '+66812340002', last_order_at: '2026-03-15', predicted_ltv: 1850 },
    { user_id: 'mock_user_003', customer: '+66812340003', last_order_at: '2026-03-10', predicted_ltv: 3200 },
  ];
  const suggestedUpsell = [
    { sku: 'SKU-A2', reason: 'bundled with SKU-A1 in 72% of prior orders' },
    { sku: 'SKU-B7', reason: 'complement to most-recent purchase' },
  ];

  return Response.json({
    stub: true,
    repurchase_ready: repurchaseReady,
    suggested_upsell: suggestedUpsell,
    analyzed_at: new Date().toISOString(),
    todo: 'wire real order-cycle analysis from ai_crm_orders once CRM webhooks populate data',
  });
};
