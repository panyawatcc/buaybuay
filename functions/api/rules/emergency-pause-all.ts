import { requireAuth } from '../../_lib/auth';
import { sendTelegramMessage } from '../telegram/_lib/send';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

/**
 * POST /api/rules/emergency-pause-all
 *
 * Kill-switch — disables every rule owned by the calling user in a single
 * atomic UPDATE. Intended for operators who spot runaway spending or need
 * to globally halt automation without editing rules one-by-one.
 *
 * Auth: any authenticated user (cookie session). Applies only to rules
 * owned by the caller (user_id scope) — not a global admin action.
 *
 * Body (optional): { confirm?: boolean }
 *   - Clients are encouraged to set confirm=true after a UI dialog, but
 *     it's not strictly required because the endpoint is already scoped
 *     to the caller's own rules. The field is accepted + echoed in the
 *     response audit for postmortem clarity.
 *
 * Idempotent: re-running has no effect on rules already is_active=0.
 *
 * Side effects:
 *   - UPDATE rules SET is_active=0, updated_at=now WHERE user_id=caller AND is_active=1
 *   - INSERT bot_actions row per newly-paused rule (status='skipped',
 *     action_type='emergency_pause', error_message='kill-switch by <email>')
 *   - Telegram alert to the caller's first active channel with the summary
 *
 * Added 2026-04-18 (bundle P0-C).
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);
  if (auth.type === 'unauthorized') return auth.response;

  let body: any = {};
  try { body = await context.request.json(); } catch { /* body optional */ }
  const confirm = !!body?.confirm;

  // Identify rules about to be paused BEFORE the UPDATE so we can emit
  // per-rule audit rows + a correct count on the telegram summary.
  const toPauseResults = await context.env.DB.prepare(
    'SELECT id, name, account_id FROM rules WHERE user_id = ? AND is_active = 1',
  ).bind(auth.user.sub).all();
  const toPause = (toPauseResults.results ?? []) as { id: string; name: string; account_id: string }[];

  if (toPause.length === 0) {
    return Response.json({
      ok: true,
      paused_count: 0,
      summary: 'no active rules — nothing to pause (idempotent no-op)',
      confirm,
    });
  }

  // Atomic pause.
  await context.env.DB.prepare(
    "UPDATE rules SET is_active = 0, updated_at = datetime('now') WHERE user_id = ? AND is_active = 1",
  ).bind(auth.user.sub).run();

  // Per-rule audit row — bot_actions with status='skipped' + action_type='emergency_pause'.
  // campaign_id uses each rule's account_id (bot_actions.campaign_id is NOT NULL; same pattern
  // as existing account-level audit at evaluate.ts:346).
  const actorEmail = auth.user.email || auth.user.sub;
  const reason = `emergency_pause_all by ${actorEmail}`;
  for (const r of toPause) {
    try {
      await context.env.DB.prepare(
        `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, status, error_message) VALUES (?,?,?,?,?,?,?,0,0,0,'skipped',?)`,
      ).bind(crypto.randomUUID(), auth.user.sub, r.account_id, r.id, r.name, r.account_id, 'emergency_pause', reason).run();
    } catch {}
  }

  // Telegram alert — use the caller's first-configured channel.
  try {
    const tgConn = (await context.env.DB
      .prepare('SELECT bot_token_encrypted, chat_id FROM telegram_connections WHERE user_id = ? AND chat_id IS NOT NULL LIMIT 1')
      .bind(auth.user.sub).first()) as any;
    if (tgConn?.chat_id) {
      const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      const lines = [
        `🚨 <b>EMERGENCY: กฎทั้งหมดถูกหยุด</b>`,
        `👤 ดำเนินการโดย: ${actorEmail}`,
        `🕐 เวลา: ${nowStr}`,
        `📊 จำนวนกฎที่ถูกหยุด: ${toPause.length}`,
        `🔧 การเปิดใหม่: ไปที่หน้า /rules แล้วกด enable ทีละกฎ`,
      ];
      await sendTelegramMessage(tgConn.bot_token_encrypted, tgConn.chat_id, lines.join('\n'), context.env.TOKEN_ENCRYPTION_KEY);
    }
  } catch {}

  return Response.json({
    ok: true,
    paused_count: toPause.length,
    paused_rule_ids: toPause.map(r => r.id),
    actor: actorEmail,
    summary: `paused ${toPause.length} active rule(s)`,
    confirm,
  });
};
