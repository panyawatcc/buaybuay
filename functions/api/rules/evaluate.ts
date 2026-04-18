import { requireRole, type Role } from '../../_lib/auth';
import { getFbContext, assertAdAccountAllowed, FbContextError, type FbContext } from '../../_lib/fb-context';
import { fbFetch, type FbFetchResult } from '../../_lib/fb-fetch';
import { cloneCampaignViaReconstruction } from '../../_lib/clone-campaign';
import { sendTelegramMessage } from '../telegram/_lib/send';
import { sendPushToUser } from '../notifications/_lib/push';
import { INSIGHTS_FIELDS, mapInsights } from '../fb/_lib/insights-fields';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  CRON_SECRET: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  DEBUG_RULES?: string;                       // '1' = include response.debug + emit console.log
}

const BATCH_LIMIT = 50; // max rules per evaluation run

// GUARD P0-1: sanitize debug strings for rule_executions.action_taken.
// - Truncate to 120 chars (table readable in history UI).
// - Redact fbtrace_id (Meta's internal correlation — attackers can probe).
// - Strip FB error body blobs (often include raw account/ad IDs).
function sanitizeAction(s: string): string {
  return String(s)
    .replace(/fbtrace_id["=:]+["]?[\w-]+/gi, 'fbtrace_id=<R>')
    .replace(/body=\{[^}]*\}/g, 'body=<R>')
    .replace(/body=[^\s]{60,}/g, 'body=<R>')
    .replace(/"error"\s*:\s*\{[^}]*\}/g, '"error":<R>')
    .slice(0, 120);
}

function evalCondition(current: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'gt': return current > threshold;
    case 'lt': return current < threshold;
    case 'gte': return current >= threshold;
    case 'lte': return current <= threshold;
    case 'eq': return current === threshold;
    default: return false;
  }
}

// Pre-action gate — runs after condition met, before action executes.
// Covers Phase 2 (profit), Phase 4 (kill switches), Phase 5 (creative health).
// Returns null = pass, or { skip: reason } = block with human-readable reason.
// Protective actions (pause, budget_decrease, auto_pause) bypass gate 2 so
// unprofitable ads can be reined in.
function profitGate(rule: any, mv: Record<string, number>): { skip: string } | null {
  // Phase 4: kill-switch gates — action type requested but feature disabled.
  if (rule.action_type === 'auto_pause' && rule.auto_pause_enabled != null && !rule.auto_pause_enabled) {
    return { skip: 'auto_pause_disabled' };
  }
  if (rule.action_type === 'clone_winner' && rule.clone_winner_enabled != null && !rule.clone_winner_enabled) {
    return { skip: 'clone_winner_disabled' };
  }

  // Phase 5: creative health — skip regardless of action_type when fatigued.
  const freq = mv.frequency ?? 0;
  if (rule.max_frequency != null && freq > +rule.max_frequency) {
    return { skip: `fatigue_max_frequency ${freq.toFixed(2)} greater than ${(+rule.max_frequency).toFixed(2)}` };
  }
  if (rule.min_ctr != null) {
    const ctr = mv.ctr ?? 0;
    if (ctr < +rule.min_ctr) {
      return { skip: `fatigue_min_ctr ${ctr.toFixed(2)} less than ${(+rule.min_ctr).toFixed(2)}` };
    }
  }

  // Phase 2: profitability
  const minP = rule.min_purchases ?? 0;
  const purchases = mv.purchases ?? 0;
  if (minP > 0 && purchases < minP) {
    return { skip: `below_min_purchases ${purchases} less than ${minP}` };
  }
  if (rule.target_roas != null) {
    const roas = mv.purchase_roas ?? 0;
    if (roas < rule.target_roas) {
      const isProtective = rule.action_type === 'pause' || rule.action_type === 'budget_decrease' || rule.action_type === 'auto_pause';
      if (!isProtective) {
        return { skip: `roas_below_target ${roas.toFixed(2)} less than ${(+rule.target_roas).toFixed(2)}` };
      }
    }
  }
  const breakevenCpa = rule.breakeven_cpa_override != null
    ? +rule.breakeven_cpa_override
    : (rule.product_aov != null && rule.product_margin_pct != null
        ? +rule.product_aov * +rule.product_margin_pct
        : null);
  if (breakevenCpa != null && rule.action_type === 'budget_increase') {
    const cpp = mv.cost_per_purchase ?? 0;
    if (cpp > breakevenCpa) {
      return { skip: `cpa_above_breakeven ${cpp.toFixed(2)} greater than ${breakevenCpa.toFixed(2)}` };
    }
  }
  // Phase 4: clone_winner requires N-day consecutive ROAS > target × multiplier.
  // MVP: consecutive-days check uses single-row insights (last_Nd aggregate);
  // true day-by-day check via time_increment=1 is a follow-up.
  if (rule.action_type === 'clone_winner' && rule.target_roas != null && rule.clone_winner_roas_multiplier != null) {
    const threshold = +rule.target_roas * +rule.clone_winner_roas_multiplier;
    const roas = mv.purchase_roas ?? 0;
    if (roas < threshold) {
      return { skip: `clone_winner_below_threshold ${roas.toFixed(2)} less than ${threshold.toFixed(2)}` };
    }
  }
  return null;
}

/**
 * POST /api/rules/evaluate
 * Cron trigger (X-Cron-Secret) or manual (admin JWT).
 * Evaluates active rules → checks conditions → executes actions.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Auth: cron secret with timestamp OR admin JWT (GUARD #4 + #2 timestamp)
  const cronSecret = context.request.headers.get('X-Cron-Secret');
  let isCron = cronSecret && context.env.CRON_SECRET && cronSecret === context.env.CRON_SECRET;

  if (isCron) {
    const ts = context.request.headers.get('X-Cron-Timestamp');
    if (ts && Math.abs(Date.now() / 1000 - parseInt(ts, 10)) > 60) isCron = false;
  }

  if (!isCron) {
    const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin'] as Role[]);
    if (auth.type !== 'ok') return auth.response;
  }

  try {
    // Fetch active rules (batch limit)
    const rulesResult = await context.env.DB.prepare(
      'SELECT * FROM rules WHERE is_active = 1 ORDER BY created_at ASC LIMIT ?',
    )
      .bind(BATCH_LIMIT)
      .all();

    const rules = rulesResult.results || [];

    if (rules.length === 0) {
      return Response.json({ evaluated: 0, triggered: 0, skippedCooldown: 0, skippedCondition: 0, results: [] });
    }

    const now = new Date();
    let triggered = 0;
    let skippedCooldown = 0;
    let skippedCondition = 0;
    const results: any[] = [];

    // GUARD P0-1 helpers (env-gated debug + dual-write exec rows).
    const includeDebug = context.env.DEBUG_RULES === '1';
    const dbgLog = (msg: string) => { if (includeDebug) console.log(msg); };
    const writeExecDebug = async (ruleId: string, dbg: string, currentVal: number): Promise<void> => {
      const execId = crypto.randomUUID();
      try {
        await context.env.DB.prepare('INSERT INTO rule_executions (id, rule_id, current_value, triggered, action_taken) VALUES (?,?,?,0,?)')
          .bind(execId, ruleId, currentVal, sanitizeAction(dbg)).run();
        await context.env.DB.prepare('INSERT INTO rule_executions_debug (execution_id, rule_id, full_debug) VALUES (?,?,?)')
          .bind(execId, ruleId, dbg).run();
      } catch {}
    };

    // GUARD F1-F4 (2026-04-18): when an FB action POST fails, write a
    // structured failure row so audit trail reflects reality (no silent
    // drop via `continue` and no false-positive success row). Keeps the
    // same rule_executions shape used by successful actions — just with
    // triggered=0 and a prefixed 'failed:' action_taken.
    const writeActionFailure = async (
      rule: any,
      reason: string,
      res: { status: number; error?: { code?: number; subcode?: number; message?: string } | null; userMessage?: string } | null,
      campaignId?: string | null,
    ): Promise<void> => {
      const code = res?.error?.code;
      const subcode = res?.error?.subcode;
      const msg = sanitizeAction(
        `failed:${reason} camp=${campaignId ?? 'account'} fb=${code ?? res?.status ?? '-'}${subcode != null ? `/${subcode}` : ''} ${res?.userMessage || ''}`,
      );
      try {
        await context.env.DB.prepare(
          'INSERT INTO rule_executions (id, rule_id, current_value, triggered, action_taken) VALUES (?,?,?,0,?)',
        ).bind(crypto.randomUUID(), rule.id, 0, msg).run();
      } catch {}
    };

    // Per-user fb-context cache — rules frequently share a user, so fetching
    // the admin token + allowed_ad_accounts once per user (not per rule) cuts
    // DB/FB roundtrips in a batched cron run.
    const fbCtxCache: Map<string, FbContext | null> = new Map();
    const loadCtx = async (userId: string): Promise<FbContext | null> => {
      if (fbCtxCache.has(userId)) return fbCtxCache.get(userId) ?? null;
      try {
        const ctx = await getFbContext(context.env, userId);
        fbCtxCache.set(userId, ctx);
        return ctx;
      } catch (e) {
        fbCtxCache.set(userId, null);
        const code = e instanceof FbContextError ? e.code : 'unknown';
        dbgLog(`[evaluate] fb-context fail user=${userId} code=${code}`);
        return null;
      }
    };

    for (const rule of rules as any[]) {
      // Check cooldown (GUARD condition #8 + 2026-04-18 bundle A — cooldown_minutes).
      // Precedence: if cooldown_minutes > 0, use minutes-precision; else fall back
      // to cooldown_hours (backward compat for rules that predate migration 0022).
      if (rule.last_triggered_at) {
        const lastTriggered = new Date(rule.last_triggered_at);
        const minutesSince = (now.getTime() - lastTriggered.getTime()) / (1000 * 60);
        const cooldownMins = rule.cooldown_minutes > 0
          ? rule.cooldown_minutes
          : (rule.cooldown_hours || 0) * 60;

        if (cooldownMins > 0 && minutesSince < cooldownMins) {
          skippedCooldown++;
          const remaining = Math.ceil(cooldownMins - minutesSince);
          // Queryable audit (bundle A): bot_actions row with status='skipped'.
          // Uses rule.account_id as campaign_id since cooldown is per-rule not per-campaign.
          try {
            await context.env.DB.prepare(
              `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, status, error_message) VALUES (?,?,?,?,?,?,?,0,0,0,'skipped',?)`,
            ).bind(
              crypto.randomUUID(), rule.user_id, rule.account_id, rule.id, rule.name, rule.account_id, rule.action_type,
              `cooldown_active: ${Math.floor(minutesSince)}/${cooldownMins} min elapsed (wait ~${remaining} more)`,
            ).run();
          } catch {}
          results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'cooldown', remaining_minutes: remaining });
          continue;
        }
      }

      // GUARD #5: Daily execution limit per rule (max 3/day)
      const dailyCount = (await context.env.DB.prepare(
        "SELECT COUNT(*) as c FROM bot_actions WHERE rule_id = ? AND date(executed_at) = date('now')",
      ).bind(rule.id).first()) as any;

      if (dailyCount?.c >= 3) {
        results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'daily_limit_reached' });
        continue;
      }

      // Load FB context (admin token + allowed_ad_accounts) scoped to the
      // rule owner. Hybrid-agency model: customers don't hold their own
      // FB token — app makes FB calls with the admin's token and filters
      // which ad_account_ids each user can touch via ad_accounts table.
      const ctx = await loadCtx(rule.user_id);
      if (!ctx) {
        results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'no_fb_context' });
        continue;
      }

      // Per-tenant isolation: reject rules whose target ad_account isn't
      // in the rule owner's allowed set. Admins see every account the
      // admin FB token can reach; customers only see their own ad_accounts
      // rows. Note: 'ad_account_not_allowed' here usually means the
      // customer's partner access got revoked — they need to re-verify.
      if (!assertAdAccountAllowed(ctx, rule.account_id)) {
        results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'ad_account_not_allowed' });
        continue;
      }

      const fbToken = ctx.admin_token;

      // Determine mode: account-level or campaign-level
      let campaignIds: string[] = [];
      try { campaignIds = rule.campaign_ids ? JSON.parse(rule.campaign_ids) : []; } catch { /* account mode */ }
      const isCampaignMode = campaignIds.length > 0 && campaignIds[0] !== 'all';

      function toMetricValues(raw: any, objective?: string): Record<string, number> {
        const m = mapInsights(raw, objective);
        if (!m) return {};
        return { spend: m.spend, amount_spent: m.spend, impressions: m.impressions, clicks: m.clicks, reach: m.reach, ctr: m.ctr, ctr_all: m.ctr, clicks_all: m.clicks, cpc: m.clicks > 0 ? +(m.spend / m.clicks).toFixed(2) : 0, cpm: m.cpm, roas: m.roas, purchase_roas: m.roas, cpa: m.purchases > 0 ? +(m.spend / m.purchases).toFixed(2) : 0, conversions: m.purchases, results: m.results, cost_per_result: m.costPerResult, purchases: m.purchases, cost_per_purchase: m.costPerPurchase, messaging_conversations: m.messages, cost_per_messaging_conversation: m.costPerMessage };
      }

      const period = rule.condition_period || 'last_7d';
      const dateParam = (period !== 'all_time' && period !== 'custom') ? `&date_preset=${period}` : '';
      // URL-encode the JSON array value for action_attribution_windows — matches working fb/insights.ts:49 pattern
      const insFields = `${INSIGHTS_FIELDS}&action_attribution_windows=${encodeURIComponent('["7d_click","1d_view"]')}`;

      let accountName = rule.account_id;
      try { const ar = await fetch(`https://graph.facebook.com/v25.0/${rule.account_id}?fields=name&access_token=${fbToken}`); if (ar.ok) { const ad = (await ar.json()) as { name?: string }; if (ad.name) accountName = `${ad.name} (${rule.account_id})`; } } catch {}

      // Helper: send Telegram
      const sendTg = async (msgLines: string[]) => {
        try {
          const tgConn = (await context.env.DB.prepare(`SELECT tc.bot_token_encrypted, tc.chat_id FROM telegram_connections tc LEFT JOIN notification_settings ns ON tc.user_id = ns.user_id WHERE tc.user_id = ? AND tc.chat_id IS NOT NULL AND (ns.telegram_alerts IS NULL OR ns.telegram_alerts = 1) ORDER BY CASE WHEN tc.account_id = ? THEN 0 ELSE 1 END LIMIT 1`).bind(rule.user_id, rule.account_id).first()) as any;
          if (tgConn?.chat_id) await sendTelegramMessage(tgConn.bot_token_encrypted, tgConn.chat_id, msgLines.join('\n'), context.env.TOKEN_ENCRYPTION_KEY);
        } catch {}
      };
      const opMap: Record<string, string> = { gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=' };
      const actMap: Record<string, string> = { budget_increase: 'เพิ่มงบ', budget_decrease: 'ลดงบ', pause: 'หยุดโฆษณา', enable: 'เปิดโฆษณา', telegram_notify: 'แจ้งเตือน', bid_increase: 'เพิ่ม Bid', bid_decrease: 'ลด Bid', clone_ad: 'โคลนแอด' };

      // Parse multi-conditions (backward compat)
      let conditions: { metric: string; operator: string; value: number; period?: string }[] = [];
      if (rule.conditions) { try { conditions = JSON.parse(rule.conditions); } catch {} }
      if (conditions.length === 0) conditions = [{ metric: rule.condition_metric, operator: rule.condition_operator, value: rule.condition_value, period: rule.condition_period }];
      const condLogic: 'and' | 'or' = rule.condition_logic === 'or' ? 'or' : 'and';
      function evalMulti(mv: Record<string, number>): boolean {
        const r = conditions.map(c => evalCondition(mv[c.metric] ?? 0, c.operator, c.value));
        return condLogic === 'and' ? r.every(Boolean) : r.some(Boolean);
      }

      if (!isCampaignMode) {
        // ===== ACCOUNT-LEVEL =====
        const mr = await fetch(`https://graph.facebook.com/v25.0/${rule.account_id}/insights?fields=${insFields}${dateParam}&level=account&limit=1&access_token=${fbToken}`);
        if (!mr.ok) {
          const errBody = await mr.text().catch(() => '');
          const dbg = `DBG-P1 acct !ok status=${mr.status} body=${errBody.slice(0, 240)}`;
          dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id} acct=${rule.account_id}`);
          await writeExecDebug(rule.id, dbg, 0);
          results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'fb_api_error', ...(includeDebug ? { debug: dbg } : {}) });
          continue;
        }
        const mdText = await mr.text();
        let md: { data?: any[] } = {};
        try { md = JSON.parse(mdText); } catch {}
        const row = md.data?.[0];
        if (!row) {
          const dbg = `DBG-P1 acct no_data period=${period} body=${mdText.slice(0, 240)}`;
          dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id} acct=${rule.account_id}`);
          await writeExecDebug(rule.id, dbg, 0);
          results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'no_data', ...(includeDebug ? { debug: dbg } : {}) });
          continue;
        }
        const mv = toMetricValues(row); const currentValue = mv[conditions[0].metric] ?? 0;
        if (!evalMulti(mv)) {
          const dbg = `DBG-P1 acct evalMulti=false metric=${conditions[0].metric} mvVal=${mv[conditions[0].metric]} cond=${JSON.stringify(conditions[0])} spend=${mv.spend} roas=${mv.roas} purchases=${mv.purchases}`;
          dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id}`);
          skippedCondition++;
          await writeExecDebug(rule.id, dbg, currentValue);
          results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'condition_not_met', ...(includeDebug ? { debug: dbg } : {}) });
          continue;
        }
        if (rule.action_type === 'clone_ad' || rule.action_type === 'clone_winner') {
          results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'clone_ad_requires_campaigns' });
          continue;
        }
        const gate = profitGate(rule, mv);
        if (gate) {
          await context.env.DB.prepare('INSERT INTO rule_executions (id, rule_id, current_value, triggered, action_taken) VALUES (?,?,?,0,?)').bind(crypto.randomUUID(), rule.id, currentValue, `gate_skip: ${gate.skip}`).run();
          results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: gate.skip });
          continue;
        }
        // Incremental trigger mode (migration 0023): only fire if the evaluated
        // metric value has moved strictly past the last checkpoint. Prevents
        // same-value re-triggers where cooldown expires but the metric hasn't
        // moved. last_metric_value = NULL means first run → pass.
        if (rule.trigger_mode === 'incremental' && rule.last_metric_value != null) {
          if (currentValue <= +rule.last_metric_value) {
            const msg = `no_delta_skip: current=${currentValue.toFixed(2)} <= last=${(+rule.last_metric_value).toFixed(2)}`;
            try {
              await context.env.DB.prepare(
                `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, status, error_message) VALUES (?,?,?,?,?,?,?,?,0,0,'skipped',?)`,
              ).bind(crypto.randomUUID(), rule.user_id, rule.account_id, rule.id, rule.name, rule.account_id, rule.action_type, currentValue, msg).run();
            } catch {}
            results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'no_delta', currentValue, lastValue: rule.last_metric_value });
            continue;
          }
        }
        let actionTaken = ''; const actionId = crypto.randomUUID();
        if (rule.action_type === 'telegram_notify') { actionTaken = `แจ้งเตือน: ${rule.condition_metric} = ${(+currentValue).toFixed(2)}`; }
        else if (rule.action_type === 'pause' || rule.action_type === 'enable' || rule.action_type === 'auto_pause') {
          // GUARD F1 (2026-04-18): account-level pause/enable migrated to fbFetch so
          // 429/5xx retry + Thai error messages + audit-on-failure all apply.
          // Previously a silent for-loop that swallowed every FB error — customer
          // saw "rule triggered, 0/5 campaigns paused" on dashboard and assumed
          // "nothing matched" when actually FB rate-limited every POST.
          const clr = await fbFetch<{ data?: { id: string }[] }>(
            `https://graph.facebook.com/v25.0/${rule.account_id}/campaigns?fields=id&limit=500&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&access_token=${fbToken}`,
            { retries: 2 },
          );
          if (!clr.ok) {
            await writeActionFailure(rule, `list_campaigns_failed_${rule.action_type}`, clr);
            await sendTg([
              `⚠️ <b>กฎ ${actMap[rule.action_type] || rule.action_type} ทำงานไม่สมบูรณ์</b>`,
              `📋 กฎ: ${rule.name}`,
              `❌ ดึงรายการแคมเปญล้มเหลว: ${clr.userMessage}`,
              `📢 บัญชี: ${accountName}`,
            ]);
            results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'list_campaigns_failed', fb_code: clr.error?.code ?? clr.status });
            continue;
          }
          const camps = clr.data?.data ?? [];
          const st = rule.action_type === 'enable' ? 'ACTIVE' : 'PAUSED';
          let ok = 0, failed = 0;
          const failureDetails: string[] = [];
          for (const c of camps) {
            const r = await fbFetch(
              `https://graph.facebook.com/v25.0/${c.id}?access_token=${fbToken}`,
              { retries: 2, init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: st }) } },
            );
            if (r.ok) ok++;
            else {
              failed++;
              failureDetails.push(`${c.id}: ${r.error?.code ?? r.status} ${r.userMessage}`);
              await writeActionFailure(rule, `${rule.action_type}_failed`, r, c.id);
            }
          }
          actionTaken = `${rule.action_type} ${ok}/${camps.length} campaigns${failed > 0 ? ` (${failed} FAILED)` : ''}`;
          if (failed > 0) {
            await sendTg([
              `⚠️ <b>กฎ ${actMap[rule.action_type] || rule.action_type} — ล้มเหลวบางส่วน</b>`,
              `📋 กฎ: ${rule.name}`,
              `✅ สำเร็จ: ${ok}/${camps.length}`,
              `❌ ล้มเหลว: ${failed}`,
              `📢 บัญชี: ${accountName}`,
              `🔍 ${failureDetails.slice(0, 3).join('; ')}`,
            ]);
          }
        } else if (rule.action_type === 'budget_increase' || rule.action_type === 'budget_decrease' || rule.action_type === 'bid_increase' || rule.action_type === 'bid_decrease') {
          // GUARD F2 P0 (2026-04-18): account-level budget previously had two bugs:
          //   1. Silent-fail on FB POST rejection (same class as F1).
          //   2. **Audit-trail corruption** — bot_actions INSERT ran UNCONDITIONALLY
          //      regardless of FB response. Dashboard claimed "budget 500 → 750 (+50%)"
          //      when FB had returned 429 and the budget never changed.
          // Fix: fbFetch for retry + rate-limit + message. Move bot_actions INSERT
          // INSIDE if (r.ok). Failure branch writes rule_executions failure row.
          const clr = await fbFetch<{ data?: { id: string; name?: string; daily_budget?: string }[] }>(
            `https://graph.facebook.com/v25.0/${rule.account_id}/campaigns?fields=id,name,daily_budget&limit=500&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&access_token=${fbToken}`,
            { retries: 2 },
          );
          if (!clr.ok) {
            await writeActionFailure(rule, `list_campaigns_failed_${rule.action_type}`, clr);
            await sendTg([
              `⚠️ <b>กฎ ${actMap[rule.action_type] || rule.action_type} ทำงานไม่สมบูรณ์</b>`,
              `📋 กฎ: ${rule.name}`,
              `❌ ดึงรายการแคมเปญล้มเหลว: ${clr.userMessage}`,
              `📢 บัญชี: ${accountName}`,
            ]);
            results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, reason: 'list_campaigns_failed', fb_code: clr.error?.code ?? clr.status });
            continue;
          }
          const camps = clr.data?.data ?? [];
          const capPct = rule.scaling_step_pct != null ? +rule.scaling_step_pct * 100 : 50;
          const pct = rule.action_unit === 'percent' ? Math.min(rule.action_value, capPct) : rule.action_value;
          let ok = 0, failed = 0;
          const budgetChanges: string[] = [];
          const failureDetails: string[] = [];
          for (const camp of camps) {
            const cur = parseInt(camp.daily_budget || '0', 10) / 100;
            if (cur <= 0) continue;
            let nv = (rule.action_type === 'budget_increase' || rule.action_type === 'bid_increase')
              ? (rule.action_unit === 'percent' ? cur * (1 + pct / 100) : cur + pct)
              : (rule.action_unit === 'percent' ? cur * (1 - pct / 100) : cur - pct);
            if (rule.action_max_budget && nv > rule.action_max_budget) nv = rule.action_max_budget;
            if (nv < 1) nv = 1;
            if (rule.action_type === 'budget_increase' && rule.daily_budget_cap != null && nv > +rule.daily_budget_cap) {
              budgetChanges.push(`${camp.name || camp.id}: SKIP daily_cap_reached ${nv.toFixed(2)} >= cap ${(+rule.daily_budget_cap).toFixed(2)}`);
              continue;
            }
            // Don't decrease budget on budget_increase (max_budget cap edge case)
            if (rule.action_type === 'budget_increase' && nv <= cur) continue;
            if (rule.action_type === 'budget_decrease' && nv >= cur) continue;
            // Bundle B (2026-04-18): max_budget_change_percent safety cap.
            // If the actual delta exceeds the per-rule cap, block this campaign +
            // audit + telegram. Default 100 = no extra constraint (backward compat).
            const maxBudgetChangePct = rule.max_budget_change_percent ?? 100;
            if (maxBudgetChangePct < 100 && cur > 0) {
              const actualDeltaPct = Math.abs((nv - cur) / cur * 100);
              if (actualDeltaPct > maxBudgetChangePct) {
                failed++;
                const detail = `${camp.name || camp.id}: blocked delta=${actualDeltaPct.toFixed(1)}% > cap=${maxBudgetChangePct}%`;
                failureDetails.push(detail);
                budgetChanges.push(detail);
                await writeActionFailure(rule, `${rule.action_type}_budget_cap_exceeded`, { status: 0, error: null, userMessage: `ขอเปลี่ยนงบ ${actualDeltaPct.toFixed(1)}% เกิน limit ${maxBudgetChangePct}%` }, camp.id);
                continue;
              }
            }
            const newBudgetCents = Math.round(nv * 100);
            const r = await fbFetch(
              `https://graph.facebook.com/v25.0/${camp.id}?access_token=${fbToken}`,
              { retries: 2, init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ daily_budget: newBudgetCents }) } },
            );
            if (r.ok) {
              ok++;
              budgetChanges.push(`${camp.name || camp.id}: ฿${cur}→฿${+(nv).toFixed(2)}`);
              // Audit row is NOW conditional — only write when FB accepted the POST.
              // (Before fix, this ran unconditionally = dashboard lied about budget changes.)
              const campActionId = crypto.randomUUID();
              await context.env.DB.prepare(
                `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent) VALUES (?,?,?,?,?,?,?,?,?,?)`,
              ).bind(campActionId, rule.user_id, rule.account_id, rule.id, rule.name, camp.id, rule.action_type, cur, +(nv).toFixed(2), +(((nv - cur) / cur) * 100).toFixed(1)).run();
            } else {
              failed++;
              failureDetails.push(`${camp.name || camp.id}: ${r.error?.code ?? r.status} ${r.userMessage}`);
              await writeActionFailure(rule, `${rule.action_type}_failed`, r, camp.id);
            }
          }
          actionTaken = `${rule.action_type} ${rule.action_value}${rule.action_unit === 'percent' ? '%' : ''} → ${ok}/${camps.length} campaigns${failed > 0 ? ` (${failed} FAILED)` : ''} (${budgetChanges.join(', ')})`;
          if (failed > 0) {
            await sendTg([
              `⚠️ <b>กฎ ${actMap[rule.action_type] || rule.action_type} — ล้มเหลวบางส่วน</b>`,
              `📋 กฎ: ${rule.name}`,
              `✅ สำเร็จ: ${ok}/${camps.length}`,
              `❌ ล้มเหลว: ${failed}`,
              `📢 บัญชี: ${accountName}`,
              `🔍 ${failureDetails.slice(0, 3).join('; ')}`,
            ]);
          }
        } else { actionTaken = `${rule.action_type} ${rule.action_value}${rule.action_unit === 'percent' ? '%' : ''} (account-level)`; }
        // Log account-level action only for non-budget actions (budget actions log per-campaign in loop above)
        if (rule.action_type === 'telegram_notify' || rule.action_type === 'pause' || rule.action_type === 'enable') {
          await context.env.DB.prepare(`INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent) VALUES (?,?,?,?,?,?,?,?,?,0)`).bind(actionId, rule.user_id, rule.account_id, rule.id, rule.name, rule.account_id, rule.action_type, currentValue, currentValue).run();
        }
        await context.env.DB.prepare('INSERT INTO rule_executions (id, rule_id, current_value, triggered, action_taken, bot_action_id) VALUES (?,?,?,1,?,?)').bind(crypto.randomUUID(), rule.id, currentValue, actionTaken, actionId).run();
        // Bundle 0023: record last_metric_value so next incremental check has a watermark.
        await context.env.DB.prepare("UPDATE rules SET last_triggered_at = datetime('now'), last_metric_value = ? WHERE id = ?").bind(currentValue, rule.id).run();
        const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        await sendTg([`🤖 <b>กฎอัตโนมัติทำงาน!</b>`, `📋 กฎ: ${rule.name}`, `📊 เงื่อนไข: ${rule.condition_metric.toUpperCase()} ${opMap[rule.condition_operator] || rule.condition_operator} ${rule.condition_value}`, `📈 ค่าปัจจุบัน: ${(+currentValue).toFixed(2)}`, `🎯 การกระทำ: ${actMap[rule.action_type] || rule.action_type} ${rule.action_value}${rule.action_unit === 'percent' ? '%' : ''}`, `📢 บัญชี: ${accountName}`, `🕐 เวลา: ${nowStr}`]);
        triggered++; results.push({ ruleId: rule.id, ruleName: rule.name, triggered: true, actionTaken }); continue;
      }

      // ===== CAMPAIGN-LEVEL =====
      const campResults: string[] = []; let anyTriggered = false;
      // Bundle 0023: track the MAX evaluated metric value across matched campaigns
      // so the rule-level checkpoint (last_metric_value) reflects the most-extreme
      // watermark for next incremental check.
      let maxCvThisRun = -Infinity;
      const campDebug: string[] = [];
      // P0-2 clone_ad telemetry — distinguishes clone_rejected from no_campaigns_met_condition
      let anyCloneRejected = false;
      const cloneStats = { total: 0, ineligible: 0, copied: 0, copyFailed: 0, errorCodes: [] as number[] };
      for (const campId of campaignIds) {
        let campName = campId; let campObjective: string | undefined;
        try { const cnr = await fetch(`https://graph.facebook.com/v25.0/${campId}?fields=name,objective&access_token=${fbToken}`); if (cnr.ok) { const cn = (await cnr.json()) as { name?: string; objective?: string }; if (cn.name) campName = cn.name; campObjective = cn.objective; } } catch {}
        const cir = await fetch(`https://graph.facebook.com/v25.0/${campId}/insights?fields=${insFields}${dateParam}&limit=1&access_token=${fbToken}`);
        if (!cir.ok) {
          const errBody = await cir.text().catch(() => '');
          const dbg = `DBG-P1 camp=${campId} !ok status=${cir.status} body=${errBody.slice(0, 200)}`;
          dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id}`);
          campDebug.push(dbg);
          await writeExecDebug(rule.id, dbg, 0);
          continue;
        }
        const cirText = await cir.text();
        let cid: { data?: any[] } = {};
        try { cid = JSON.parse(cirText); } catch {}
        let cr = cid.data?.[0];
        if (!cr) {
          // Empty insights = no recent activity = treat as 0 spend, allow rules to fire.
          // Previously: silent `continue` which blocked any rule test on a campaign
          // without accumulated data (fresh campaigns, paused campaigns, off-hours).
          // Keep a debug marker so ops can still see "synthesized" vs real data.
          const dbg = `DBG-P1 camp=${campId} no_data_synthesized_zero period=${period} body=${cirText.slice(0, 120)}`;
          dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id}`);
          campDebug.push(dbg);
          await writeExecDebug(rule.id, dbg, 0);
          cr = { spend: '0', impressions: '0', clicks: '0', actions: [], action_values: [] };
        }
        const mv = toMetricValues(cr, campObjective); const cv = mv[conditions[0].metric] ?? 0;
        if (!evalMulti(mv)) {
          const dbg = `DBG-P1 camp=${campId}(${campName}) evalMulti=false metric=${conditions[0].metric} mvVal=${mv[conditions[0].metric]} cond=${JSON.stringify(conditions[0])} spend=${mv.spend} roas=${mv.roas} purchases=${mv.purchases}`;
          dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id}`);
          campDebug.push(dbg);
          await writeExecDebug(rule.id, dbg, cv);
          continue;
        }
        const campGate = profitGate(rule, mv);
        if (campGate) {
          await context.env.DB.prepare('INSERT INTO rule_executions (id, rule_id, current_value, triggered, action_taken) VALUES (?,?,?,0,?)').bind(crypto.randomUUID(), rule.id, cv, `gate_skip:${campName}: ${campGate.skip}`).run();
          continue;
        }
        // Incremental trigger mode (migration 0023) — same semantic as account-level.
        // For campaign-level rules the checkpoint is rule-scoped (shared across
        // matched campaigns in a run): skip each campaign whose evaluated value
        // hasn't moved past the prior watermark.
        if (rule.trigger_mode === 'incremental' && rule.last_metric_value != null) {
          if (cv <= +rule.last_metric_value) {
            const msg = `no_delta_skip camp=${campName}: current=${cv.toFixed(2)} <= last=${(+rule.last_metric_value).toFixed(2)}`;
            try {
              await context.env.DB.prepare(
                `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, status, error_message) VALUES (?,?,?,?,?,?,?,?,0,0,'skipped',?)`,
              ).bind(crypto.randomUUID(), rule.user_id, rule.account_id, rule.id, rule.name, campId, rule.action_type, cv, msg).run();
            } catch {}
            continue;
          }
        }
        let actionTaken = ''; const actionId = crypto.randomUUID();
        // Hoisted so success-path audit INSERT (after the if-chain) can reference them
        // for clone_ad / clone_winner actions without reaching into an inner scope.
        let cloneSourceAdId: string | null = null;
        let cloneTargetAdId: string | null = null;
        if (rule.action_type === 'telegram_notify') { actionTaken = `แจ้งเตือน: ${campName} — ${rule.condition_metric} = ${(+cv).toFixed(2)}`; }
        else if (rule.action_type === 'pause' || rule.action_type === 'enable' || rule.action_type === 'auto_pause') {
          // GUARD F3 (2026-04-18): campaign-level pause migrated to fbFetch.
          // Previously detected failure (!r.ok) but the subsequent `continue`
          // skipped ALL DB writes + telegram alert → customer saw blank
          // rule_executions and thought "rule didn't fire". Now writes a
          // structured failure row so the audit trail reflects reality.
          // Phase 4 auto_pause is a pause variant gated on auto_pause_enabled (via profitGate).
          const st = rule.action_type === 'enable' ? 'ACTIVE' : 'PAUSED';
          const r = await fbFetch(
            `https://graph.facebook.com/v25.0/${campId}?access_token=${fbToken}`,
            { retries: 2, init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: st }) } },
          );
          if (!r.ok) {
            await writeActionFailure(rule, `${rule.action_type}_failed`, r, campId);
            campResults.push(`❌ ${campName}: ${r.userMessage}`);
            continue;
          }
          actionTaken = `${rule.action_type} ${campName}`;
        } else if (rule.action_type === 'budget_increase' || rule.action_type === 'budget_decrease') {
          // GUARD F4 (2026-04-18): same pattern as F3 — use fbFetch + failure row on POST error.
          const bdr = await fbFetch<{ daily_budget?: string }>(
            `https://graph.facebook.com/v25.0/${campId}?fields=daily_budget&access_token=${fbToken}`,
            { retries: 1 },
          );
          if (!bdr.ok) {
            await writeActionFailure(rule, `${rule.action_type}_fetch_budget_failed`, bdr, campId);
            campResults.push(`❌ ${campName}: ดึงงบประมาณล้มเหลว — ${bdr.userMessage}`);
            continue;
          }
          const cur = parseInt(bdr.data?.daily_budget || '0', 10) / 100;
          const capPct = rule.scaling_step_pct != null ? +rule.scaling_step_pct * 100 : 50;
          const pct = rule.action_unit === 'percent' ? Math.min(rule.action_value, capPct) : rule.action_value;
          let nv = rule.action_type === 'budget_increase' ? (rule.action_unit === 'percent' ? cur * (1 + pct / 100) : cur + pct) : (rule.action_unit === 'percent' ? cur * (1 - pct / 100) : cur - pct);
          if (rule.action_max_budget && nv > rule.action_max_budget) nv = rule.action_max_budget; if (nv < 1) nv = 1;
          if (rule.action_type === 'budget_increase' && rule.daily_budget_cap != null && nv > +rule.daily_budget_cap) {
            await context.env.DB.prepare('INSERT INTO rule_executions (id, rule_id, current_value, triggered, action_taken) VALUES (?,?,?,0,?)').bind(crypto.randomUUID(), rule.id, cv, `gate_skip:${campName}: daily_cap_reached ${nv.toFixed(2)} >= cap ${(+rule.daily_budget_cap).toFixed(2)}`).run();
            continue;
          }
          // Bundle B (2026-04-18): max_budget_change_percent cap (campaign-level).
          const maxBudgetChangePctCamp = rule.max_budget_change_percent ?? 100;
          if (maxBudgetChangePctCamp < 100 && cur > 0) {
            const actualDeltaPctCamp = Math.abs((nv - cur) / cur * 100);
            if (actualDeltaPctCamp > maxBudgetChangePctCamp) {
              await writeActionFailure(rule, `${rule.action_type}_budget_cap_exceeded`, { status: 0, error: null, userMessage: `ขอเปลี่ยนงบ ${actualDeltaPctCamp.toFixed(1)}% เกิน limit ${maxBudgetChangePctCamp}%` }, campId);
              campResults.push(`❌ ${campName}: budget-cap ${actualDeltaPctCamp.toFixed(1)}% > ${maxBudgetChangePctCamp}%`);
              await sendTg([
                `🚧 <b>เปลี่ยนงบถูกบล็อก (safety cap)</b>`,
                `📋 กฎ: ${rule.name}`,
                `📢 แคมเปญ: ${campName}`,
                `❌ ขอเปลี่ยน: ${actualDeltaPctCamp.toFixed(1)}%`,
                `🚧 limit: ${maxBudgetChangePctCamp}%`,
              ]);
              continue;
            }
          }
          const r = await fbFetch(
            `https://graph.facebook.com/v25.0/${campId}?access_token=${fbToken}`,
            { retries: 2, init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ daily_budget: Math.round(nv * 100) }) } },
          );
          if (!r.ok) {
            await writeActionFailure(rule, `${rule.action_type}_failed`, r, campId);
            campResults.push(`❌ ${campName}: ${r.userMessage}`);
            continue;
          }
          actionTaken = `${rule.action_type} ${campName} (${cur}→${+nv.toFixed(0)})`;
        } else if (rule.action_type === 'clone_ad' || rule.action_type === 'clone_winner') {
          // Phase 4 clone_winner reuses clone_ad pipeline. The clone_winner-specific
          // ROAS × multiplier gate is enforced in profitGate() (skip before reaching here).
          // List ads under campaign (cap 500 per FB API default)
          const adsRes = await fetch(`https://graph.facebook.com/v25.0/${campId}/ads?fields=id,name&limit=500&access_token=${fbToken}`);
          if (!adsRes.ok) {
            const body = await adsRes.text().catch(() => '');
            const dbg = `DBG-P1 clone_ad camp=${campId} !adsRes.ok status=${adsRes.status} body=${body.slice(0, 200)}`;
            dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id}`);
            campDebug.push(dbg);
            await writeExecDebug(rule.id, dbg, cv);
            // P2: audit fail path — list ads API call failed before we could try any ad.
            await context.env.DB.prepare(
              `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, status, error_message) VALUES (?,?,?,?,?,?,?,?,?,0,'failure',?)`,
            ).bind(crypto.randomUUID(), rule.user_id, rule.account_id, rule.id, rule.name, campId, 'clone_ad', cv, cv, `list_ads_api_failed status=${adsRes.status} body=${body.slice(0, 200)}`).run();
            actionTaken = `FAILED list ads ${campName}`;
            continue;
          }
          const adsText = await adsRes.text();
          let adsData: { data?: { id: string; name?: string }[] } = {};
          try { adsData = JSON.parse(adsText); } catch {}
          const ads = adsData.data || [];
          if (ads.length === 0) {
            const dbg = `DBG-P1 clone_ad camp=${campId} no_ads body=${adsText.slice(0, 200)}`;
            dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id}`);
            campDebug.push(dbg);
            await writeExecDebug(rule.id, dbg, cv);
            // P2: audit fail path — campaign had no ads to clone.
            await context.env.DB.prepare(
              `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, status, error_message) VALUES (?,?,?,?,?,?,?,?,?,0,'failure',?)`,
            ).bind(crypto.randomUUID(), rule.user_id, rule.account_id, rule.id, rule.name, campId, 'clone_ad', cv, cv, 'no_ads_under_campaign').run();
            actionTaken = `no_ads ${campName}`;
            continue;
          }
          cloneStats.total += ads.length;
          // P0-2: pre-validate each ad — skip if not ACTIVE or creative/post missing.
          // Also capture adset_id + creative.id so we can POST new ads directly
          // (creative-reference path — see 2026-04-18 incident: /{adId}/copies fails
          // on Outcome-Driven campaigns with deprecated Standard Enhancements creative).
          // Batch via /?ids=a,b,c&fields=effective_status,adset_id,creative{id,effective_object_story_id}.
          const adIds = ads.map(a => a.id);
          const valRes = await fetch(`https://graph.facebook.com/v25.0/?ids=${adIds.join(',')}&fields=effective_status,adset_id,creative{id,effective_object_story_id}&access_token=${fbToken}`);
          const validAds: { id: string; name?: string; adset_id?: string; creative_id?: string }[] = [];
          if (valRes.ok) {
            const valData = (await valRes.json()) as Record<string, any>;
            for (const ad of ads) {
              const info = valData[ad.id];
              if (!info) { cloneStats.ineligible++; continue; }
              if (info.effective_status && info.effective_status !== 'ACTIVE') { cloneStats.ineligible++; continue; }
              if (!info.creative?.effective_object_story_id) { cloneStats.ineligible++; continue; }
              if (!info.adset_id || !info.creative?.id) { cloneStats.ineligible++; continue; }
              validAds.push({ ...ad, adset_id: info.adset_id, creative_id: info.creative.id });
            }
          } else {
            // Validation call itself failed — skip pre-validate, push shells (will fail in POST loop without adset_id/creative_id).
            validAds.push(...ads);
          }
          if (validAds.length === 0) {
            const dbg = `DBG-P1 clone_ad camp=${campId} all_ineligible total=${ads.length} ineligible=${cloneStats.ineligible}`;
            dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id}`);
            campDebug.push(dbg);
            await writeExecDebug(rule.id, dbg, cv);
            // P2: audit fail path — all ads ineligible (not ACTIVE or missing creative).
            await context.env.DB.prepare(
              `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, status, error_message, source_ad_id) VALUES (?,?,?,?,?,?,?,?,?,0,'failure',?,?)`,
            ).bind(crypto.randomUUID(), rule.user_id, rule.account_id, rule.id, rule.name, campId, 'clone_ad', cv, cv, `all_${ads.length}_ads_ineligible`, ads[0]?.id ?? null).run();
            actionTaken = `clone_rejected ${campName}: no eligible ads`;
            anyCloneRejected = true;
            continue;
          }
          const cloned: string[] = [];
          const copyErrs: string[] = [];
          let okCount = 0;
          // Creative-reference clone path (replaces /{adId}/copies as of 2026-04-18).
          // For each source ad we POST /act_<account>/ads with
          //   { name, adset_id, creative: { creative_id: source_creative_id }, status: 'PAUSED' }
          // This creates a fresh ad under the same adset that shares the source's
          // existing creative — avoiding FB's /copies validation which rejects
          // ads whose creatives use deprecated "Standard Enhancements" flags
          // (subcode 3858504) and the sync-copy size limit (subcode 1885194).
          // Evidence: /api/dev/clone-probe (commit bef1ecc) tested 7 paths, g
          // (this approach) was the only one returning HTTP 200.
          const adAccountRef = `act_${rule.account_id.replace(/^act_/, '')}`;
          // clone_status (migration 0021) — operator-controlled status for cloned ads.
          // Default PAUSED preserves prior behaviour; ACTIVE spawns live-spending clones.
          const cloneStatus: 'PAUSED' | 'ACTIVE' = rule.clone_status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
          for (const ad of validAds) {
            if (!ad.adset_id || !ad.creative_id) {
              cloneStats.copyFailed++;
              copyErrs.push(`ad=${ad.id} skipped-missing-adset-or-creative-id (pre-validate shell fallback)`);
              continue;
            }
            const cloneName = `${ad.name || 'ad'} (auto-clone ${new Date().toISOString().slice(0, 10)})`;
            const cr = await fetch(`https://graph.facebook.com/v25.0/${adAccountRef}/ads?access_token=${fbToken}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: cloneName,
                adset_id: ad.adset_id,
                creative: { creative_id: ad.creative_id },
                status: cloneStatus,
              }),
            });
            const crText = await cr.text();
            if (cr.ok) {
              try {
                const cd = JSON.parse(crText) as { id?: string };
                if (cd.id) { cloned.push(cd.id); okCount++; cloneStats.copied++; }
                else {
                  cloneStats.copyFailed++;
                  copyErrs.push(`ad=${ad.id} ok-but-no-id body=${crText.slice(0, 120)}`);
                }
              } catch {
                cloneStats.copyFailed++;
                copyErrs.push(`ad=${ad.id} ok-parse-fail body=${crText.slice(0, 120)}`);
              }
            } else {
              cloneStats.copyFailed++;
              try {
                const errJson = JSON.parse(crText);
                const code = errJson?.error?.code;
                const subcode = errJson?.error?.error_subcode;
                if (typeof code === 'number') cloneStats.errorCodes.push(code);
                if (typeof subcode === 'number') cloneStats.errorCodes.push(subcode);
              } catch {}
              const perAdDbg = `DBG-P1 clone_ad create-ad !ok ad=${ad.id} status=${cr.status} body=${crText.slice(0, 180)}`;
              dbgLog(`[DEBUG-P1] ${perAdDbg} rule=${rule.id}`);
              copyErrs.push(`ad=${ad.id} status=${cr.status} body=${crText.slice(0, 180)}`);
            }
          }
          if (okCount === 0) {
            const dbg = `DBG-P1 clone_ad okCount=0 camp=${campId} ads=${ads.length} errs=[${copyErrs.slice(0, 3).join(' | ').slice(0, 400)}]`;
            dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id}`);
            campDebug.push(dbg);
            await writeExecDebug(rule.id, dbg, cv);
            // P2: audit fail path — all /copies calls returned error.
            await context.env.DB.prepare(
              `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, status, error_message, source_ad_id) VALUES (?,?,?,?,?,?,?,?,?,0,'failure',?,?)`,
            ).bind(crypto.randomUUID(), rule.user_id, rule.account_id, rule.id, rule.name, campId, 'clone_ad', cv, cv, `all_${validAds.length}_copies_failed; ${copyErrs.slice(0, 2).join(' | ').slice(0, 400)}`, validAds[0]?.id ?? null).run();
            // GUARD F5 (2026-04-18): customer-visible telegram alert when clone_ad fails.
            // If the FB error set includes subcode 3858504 (Standard Enhancements deprecated),
            // surface actionable guidance with the FB doc link so the customer knows how to fix
            // their source ad's creative. Otherwise a generic failure line.
            const hasStdEnhancements = cloneStats.errorCodes.includes(3858504);
            if (hasStdEnhancements) {
              await sendTg([
                `⚠️ <b>Clone โฆษณา ล้มเหลว — โฆษณาต้นฉบับใช้การตั้งค่าที่เลิกใช้</b>`,
                `📋 กฎ: ${rule.name}`,
                `📢 แคมเปญ: ${campName}`,
                `❌ สาเหตุ: Standard Enhancements ใน creative ถูกเลิกใช้ (FB 2024)`,
                `🔧 วิธีแก้: แก้ไขโฆษณาต้นฉบับใน Ads Manager → เลือกเปิดฟีเจอร์เพิ่มประสิทธิภาพทีละรายการแทน`,
                `🔗 ข้อมูลเพิ่มเติม: https://fburl.com/hyth50xo`,
              ]);
            } else {
              const firstCode = cloneStats.errorCodes[0];
              await sendTg([
                `⚠️ <b>Clone โฆษณา ล้มเหลว</b>`,
                `📋 กฎ: ${rule.name}`,
                `📢 แคมเปญ: ${campName}`,
                `❌ โฆษณาทั้งหมด ${validAds.length} ตัว clone ไม่สำเร็จ`,
                firstCode ? `🔍 FB error code: ${firstCode}` : `🔍 ${copyErrs[0]?.slice(0, 100) ?? 'ไม่ทราบสาเหตุ'}`,
              ]);
            }
            actionTaken = `clone_rejected ${campName}: all ${validAds.length} copies failed`;
            anyCloneRejected = true;
            continue;
          }
          const preview = cloned.slice(0, 3).join(',');
          actionTaken = `clone_ad (${cloneStatus}) ${okCount}/${ads.length} ads in ${campName} → [${preview}${cloned.length > 3 ? `,+${cloned.length - 3}` : ''}]`;
          cloneSourceAdId = validAds[0]?.id ?? null;
          cloneTargetAdId = cloned[0] ?? null;
        } else if (rule.action_type === 'clone_campaign') {
          // Full-reconstruction clone (2026-04-18): create a fresh campaign +
          // adsets + ads under the same ad account, using Path G for each ad
          // so FB's /copies deprecations/size-limits never apply. Source
          // campaign stays untouched (keep running / under its own budget).
          // clone_status (migration 0021) controls whether the new entities
          // are PAUSED (default, safe) or ACTIVE (immediate spending — emit
          // extra warning telegram so operator has clear confirmation).
          // Helper in _lib/clone-campaign.ts is shared with /api/dev/clone-campaign-probe.
          const adAccountRef = `act_${rule.account_id.replace(/^act_/, '')}`;
          const cloneStatus: 'PAUSED' | 'ACTIVE' = rule.clone_status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
          if (cloneStatus === 'ACTIVE') {
            // Pre-flight warning — cloned campaign will start spending immediately.
            await sendTg([
              `⚠️ <b>Clone แคมเปญ (ACTIVE) กำลังเริ่ม</b>`,
              `📋 กฎ: ${rule.name}`,
              `📢 ต้นทาง: ${campName}`,
              `💸 แคมเปญใหม่จะเริ่มใช้งบประมาณทันทีเมื่อ clone เสร็จ`,
            ]);
          }
          const cloneRes = await cloneCampaignViaReconstruction(campId, adAccountRef, fbToken, { clone_status: cloneStatus });
          if (!cloneRes.ok || !cloneRes.new_campaign_id) {
            const errSummary = sanitizeAction(`clone_campaign failed stage=${cloneRes.stage ?? '-'} fb=${cloneRes.fb_code ?? '-'} ${cloneRes.error ?? ''}`);
            const dbg = `DBG-P1 clone_campaign camp=${campId} !ok ${errSummary}`;
            dbgLog(`[DEBUG-P1] ${dbg} rule=${rule.id}`);
            campDebug.push(dbg);
            await writeExecDebug(rule.id, dbg, cv);
            await context.env.DB.prepare(
              `INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, status, error_message) VALUES (?,?,?,?,?,?,?,?,?,0,'failure',?)`,
            ).bind(crypto.randomUUID(), rule.user_id, rule.account_id, rule.id, rule.name, campId, 'clone_campaign', cv, cv, errSummary).run();
            await sendTg([
              `⚠️ <b>Clone แคมเปญ ล้มเหลว</b>`,
              `📋 กฎ: ${rule.name}`,
              `📢 แคมเปญต้นทาง: ${campName}`,
              `❌ stage=${cloneRes.stage ?? '-'} ${cloneRes.error ?? ''}`.slice(0, 300),
            ]);
            actionTaken = `clone_campaign_failed ${campName}: stage=${cloneRes.stage}`;
            anyCloneRejected = true;
            continue;
          }
          const adsetCount = cloneRes.adset_results.length;
          const adCount = cloneRes.adset_results.reduce((acc, a) => acc + a.ad_results.filter(x => x.new_ad_id).length, 0);
          const adFailCount = cloneRes.adset_results.reduce((acc, a) => acc + a.ad_results.filter(x => x.error).length, 0);
          actionTaken = `clone_campaign (${cloneStatus}) ${campName} → ${cloneRes.new_campaign_id} (${adsetCount} adsets, ${adCount} ads${adFailCount > 0 ? `, ${adFailCount} ad_failures` : ''})`;
          // Reuse clone_ad's audit hoists for the bot_actions row — use the first
          // source ad across all adsets as source_ad_id so the audit trail is queryable.
          const firstAdset = cloneRes.adset_results[0];
          cloneSourceAdId = firstAdset?.ad_results[0]?.source_ad_id ?? null;
          cloneTargetAdId = cloneRes.new_campaign_id ?? null;  // new_campaign_id for clone_campaign (not an ad id, but documented below)
          // Notify customer of the successful clone on a separate telegram line.
          await sendTg([
            `✅ <b>Clone แคมเปญสำเร็จ</b>`,
            `📋 กฎ: ${rule.name}`,
            `📢 ต้นทาง: ${campName}`,
            `🆕 แคมเปญใหม่: ${cloneRes.new_campaign_name ?? cloneRes.new_campaign_id}`,
            `📊 ${adsetCount} adsets, ${adCount} ads (${cloneStatus})`,
            adFailCount > 0 ? `⚠️ ads clone ล้มเหลว: ${adFailCount}` : '',
          ].filter(Boolean));
        } else { actionTaken = `${rule.action_type} ${campName}`; }
        // Success-path audit — includes source/target for clone_ad so the record is queryable.
        await context.env.DB.prepare(`INSERT INTO bot_actions (id, user_id, account_id, rule_id, rule_name, campaign_id, action_type, previous_value, new_value, change_percent, source_ad_id, target_ad_id) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`).bind(actionId, rule.user_id, rule.account_id, rule.id, rule.name, campId, rule.action_type, cv, cv, cloneSourceAdId, cloneTargetAdId).run();
        await context.env.DB.prepare('INSERT INTO rule_executions (id, rule_id, current_value, triggered, action_taken, bot_action_id) VALUES (?,?,?,1,?,?)').bind(crypto.randomUUID(), rule.id, cv, actionTaken, actionId).run();
        campResults.push(`${campName} (${campId})`); anyTriggered = true;
        if (cv > maxCvThisRun) maxCvThisRun = cv;
      }
      if (!anyTriggered) {
        skippedCondition++;
        // P0-2: clone_rejected is a distinct outcome from condition-miss.
        // If ANY campaign matched condition but all /copies failed OR all ads
        // ineligible, prefer clone_rejected so the UI can show the right
        // Thai message ("โฆษณาต้นฉบับไม่สามารถ clone ได้").
        const reason = anyCloneRejected ? 'clone_rejected' : 'no_campaigns_met_condition';
        const details = anyCloneRejected ? {
          total_ads: cloneStats.total,
          ineligible: cloneStats.ineligible,
          copied: cloneStats.copied,
          copy_failed: cloneStats.copyFailed,
          fb_error_subcodes: Array.from(new Set(cloneStats.errorCodes)),
        } : undefined;
        results.push({
          ruleId: rule.id, ruleName: rule.name, triggered: false, reason,
          ...(details ? { details } : {}),
          ...(includeDebug ? { debug: campDebug.slice(0, 10) } : {}),
        });
        continue;
      }
      // Bundle 0023: write the MAX cv across matched campaigns as the rule-level
      // watermark for next incremental check. Only update when we actually have
      // a finite value (protects against the -Infinity sentinel if the path got
      // here via a degenerate branch).
      if (Number.isFinite(maxCvThisRun)) {
        await context.env.DB.prepare("UPDATE rules SET last_triggered_at = datetime('now'), last_metric_value = ? WHERE id = ?").bind(maxCvThisRun, rule.id).run();
      } else {
        await context.env.DB.prepare("UPDATE rules SET last_triggered_at = datetime('now') WHERE id = ?").bind(rule.id).run();
      }
      const nowStr2 = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      await sendTg([`🤖 <b>กฎอัตโนมัติทำงาน!</b>`, `📋 กฎ: ${rule.name}`, `📊 เงื่อนไข: ${rule.condition_metric.toUpperCase()} ${opMap[rule.condition_operator] || rule.condition_operator} ${rule.condition_value}`, `🎯 การกระทำ: ${actMap[rule.action_type] || rule.action_type} ${rule.action_value}${rule.action_unit === 'percent' ? '%' : ''}`, `📢 แคมเปญที่ trigger: ${campResults.join(', ')}`, `🕐 เวลา: ${nowStr2}`]);
      triggered++; results.push({ ruleId: rule.id, ruleName: rule.name, triggered: true });
    }

    return Response.json({
      evaluated: rules.length,
      triggered,
      skippedCooldown,
      skippedCondition,
      results,
    });
  } catch {
    return Response.json({ error: 'Evaluation failed' }, { status: 500 });
  }
};
