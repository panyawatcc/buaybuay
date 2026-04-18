import { requireRole, type Role } from '../../../_lib/auth';
import { gateStub, type LlmGuardEnv } from '../../../_lib/llm-guard';

interface Env extends LlmGuardEnv { JWT_SECRET: string; }

// POST /api/ai/retargeting/configure
// STUB — accepts a retargeting config payload and returns mock audience/campaign IDs.
// TODO: wire Pixel events + FB Custom Audience API.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const gate = await gateStub(context.env, { userId: auth.user.sub, model: 'stub', inputTokens: 0 });
  if (!gate.ok) return Response.json({ error: 'llm_cap_exceeded', reason: gate.reason }, { status: 429 });

  let body: any = {};
  try { body = await context.request.json(); } catch {}

  return Response.json({
    stub: true,
    custom_audience_id: `aud_mock_${Date.now()}`,
    campaign_id: `camp_mock_${Date.now()}`,
    config_received: body,
    todo: 'wire Pixel events + FB Custom Audience API',
  });
};
