import { requireRole, type Role } from '../../../_lib/auth';
import { gateStub, type LlmGuardEnv } from '../../../_lib/llm-guard';

interface Env extends LlmGuardEnv { JWT_SECRET: string; }

// POST /api/ai/retargeting/run
// STUB — triggers an already-configured retargeting workflow. Returns mock audience/campaign IDs.
// TODO: read stored config, push audience updates to FB, launch campaign via Marketing API.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const gate = await gateStub(context.env, { userId: auth.user.sub, model: 'stub', inputTokens: 0 });
  if (!gate.ok) return Response.json({ error: 'llm_cap_exceeded', reason: gate.reason }, { status: 429 });

  return Response.json({
    stub: true,
    custom_audience_id: `aud_mock_${Date.now()}`,
    campaign_id: `camp_mock_${Date.now()}`,
    status: 'queued',
    todo: 'wire FB Custom Audience update + campaign launch',
  });
};
