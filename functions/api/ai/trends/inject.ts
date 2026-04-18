import { requireRole, type Role } from '../../../_lib/auth';
import { gateStub, type LlmGuardEnv } from '../../../_lib/llm-guard';

interface Env extends LlmGuardEnv { JWT_SECRET: string; }

// POST /api/ai/trends/inject — inject selected trend(s) into a copywriter/ad flow.
// Body: { keyword: string, target_ad_id?: string } | { keywords: string[] }
// TODO: call /api/ai/copywriter/trigger with keyword as prompt context.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const gate = await gateStub(context.env, { userId: auth.user.sub, model: 'stub', inputTokens: 0 });
  if (!gate.ok) return Response.json({ error: 'llm_cap_exceeded', reason: gate.reason }, { status: 429 });

  let body: any = {};
  try { body = await context.request.json(); } catch {}
  const keywords: string[] = Array.isArray(body?.keywords) ? body.keywords : body?.keyword ? [body.keyword] : [];

  const logs: string[] = [];
  for (const kw of keywords.slice(0, 5)) {
    const id = crypto.randomUUID();
    try {
      await context.env.DB.prepare(
        'INSERT INTO ai_trends_log (id, user_id, source, keyword, score, metadata) VALUES (?,?,?,?,?,?)',
      ).bind(id, auth.user.sub, 'manual', kw, null, JSON.stringify({ target_ad_id: body?.target_ad_id ?? null })).run();
      logs.push(id);
    } catch {}
  }

  return Response.json({
    stub: true,
    injected_count: logs.length,
    log_ids: logs,
    todo: 'chain into copywriter/trigger with trend context',
  });
};
