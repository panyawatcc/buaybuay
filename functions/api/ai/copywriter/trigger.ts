import { requireRole, type Role } from '../../../_lib/auth';
import { sha256 } from '../../../_lib/crypto';
import { gateStub, type LlmGuardEnv } from '../../../_lib/llm-guard';

interface Env extends LlmGuardEnv { JWT_SECRET: string; }

// POST /api/ai/copywriter/trigger
// STUB — returns mock data matching UI expectations.
// GUARD hardening: raw prompts NEVER stored — only SHA-256 hash (prompt_hash).
// Rate-limit gate: kill switch + per-user/global caps enforced even on stubs.
// TODO: swap gateStub → guardedCreate once ANTHROPIC_API_KEY is wired.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const gate = await gateStub(context.env, { userId: auth.user.sub, model: 'stub', inputTokens: 0 });
  if (!gate.ok) return Response.json({ error: 'llm_cap_exceeded', reason: gate.reason }, { status: 429 });

  let body: any = {};
  try { body = await context.request.json(); } catch {}

  const id = crypto.randomUUID();
  const generatedCaptions = [
    'ลดพิเศษวันนี้เท่านั้น! โปรฯ ไม่มีในเว็บทั่วไป กดสั่งเลยก่อนของหมด 🔥',
    'ลูกค้าชม "ดีเกินคาด!" — ของแท้ ส่งไว รับประกัน 30 วัน 💎',
    'ตัวเดียวคุ้ม ใช้ได้ทั้งครอบครัว — คลิกดูรายละเอียดก่อนหมดเวลา ⏳',
  ];
  const newAdIds = [`mock_ad_${Date.now()}_1`, `mock_ad_${Date.now()}_2`, `mock_ad_${Date.now()}_3`];
  const promptHash = body?.prompt ? await sha256(String(body.prompt)) : null;

  try {
    await context.env.DB.prepare(
      'INSERT INTO ai_copywriter_logs (id, user_id, source_ad_id, prompt_hash, generated_captions, new_ad_ids, llm_model) VALUES (?,?,?,?,?,?,?)',
    ).bind(
      id, auth.user.sub, body?.source_ad_id ?? null, promptHash,
      JSON.stringify(generatedCaptions), JSON.stringify(newAdIds), 'stub',
    ).run();
  } catch {}

  return Response.json({
    id,
    stub: true,
    generated_captions: generatedCaptions,
    new_ad_ids: newAdIds,
    todo: 'wire Claude API + FB ad create once ANTHROPIC_API_KEY is set',
  });
};
