// GUARD P0-4 LLM cost-cap circuit breaker (spec: guard-week1-security-spec-v2-cf §2).
// Use `preFlightCheck` before any Anthropic call; `recordCall` after it completes
// (success or error) to atomically bump counters and write the audit log row.
//
// Intentionally does NOT import @anthropic-ai/sdk — caller owns the SDK call
// so stubs and real implementations share the same guard surface.

import { sha256 } from './crypto';

export type CapReason =
  | 'kill_switch'
  | 'model_disallowed'
  | 'input_too_large'
  | 'user_hourly'
  | 'user_daily'
  | 'user_daily_cost'
  | 'global_hourly'
  | 'global_daily';

export class LlmCapExceeded extends Error {
  constructor(public reason: CapReason) { super(`LLM cap: ${reason}`); }
}

export interface LlmGuardEnv {
  DB: D1Database;
  STATE_KV?: KVNamespace;
  LLM_DISABLED?: string;
  LLM_ALLOWED_MODELS?: string;                 // csv
  LLM_MAX_INPUT_TOKENS?: string;
  LLM_MAX_OUTPUT_TOKENS?: string;
  LLM_USER_HOURLY_LIMIT?: string;              // default 20
  LLM_USER_DAILY_LIMIT?: string;               // default 100
  LLM_USER_DAILY_COST_USD_MICRO?: string;      // default 2_000_000 ($2)
  LLM_GLOBAL_HOURLY_COST_USD_MICRO?: string;   // default 5_000_000 ($5)
  LLM_GLOBAL_DAILY_COST_USD_MICRO?: string;    // default 50_000_000 ($50)
  LLM_GLOBAL_ALERT_THRESHOLD_PERMIL?: string;  // default 800 = 80%
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

function bucketHour(): number { return Math.floor(Date.now() / 3_600_000); }
function bucketDay(): string { return new Date().toISOString().slice(0, 10); }
function intEnv(v: string | undefined, dflt: number): number { const n = parseInt(v ?? '', 10); return Number.isFinite(n) ? n : dflt; }

// Pre-flight: kill switch + per-user + global caps. Throws LlmCapExceeded
// if any cap trips. Read-only — does not increment counters.
export async function preFlightCheck(env: LlmGuardEnv, opts: { userId: string; model: string; inputTokens: number }): Promise<void> {
  if (env.LLM_DISABLED === '1') throw new LlmCapExceeded('kill_switch');

  const allowed = (env.LLM_ALLOWED_MODELS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(opts.model)) throw new LlmCapExceeded('model_disallowed');

  const maxIn = intEnv(env.LLM_MAX_INPUT_TOKENS, 8000);
  if (opts.inputTokens > maxIn) throw new LlmCapExceeded('input_too_large');

  const hr = bucketHour();
  const day = bucketDay();

  const check = async (key: string, cap: number, reason: CapReason, col: 'count' | 'cost_usd_micro' = 'count') => {
    const row = await env.DB.prepare(`SELECT ${col} AS v FROM llm_counters WHERE key = ?`).bind(key).first<{ v: number }>();
    if ((row?.v ?? 0) >= cap) throw new LlmCapExceeded(reason);
  };

  await check(`user:${opts.userId}:hour:${hr}`, intEnv(env.LLM_USER_HOURLY_LIMIT, 20), 'user_hourly');
  await check(`user:${opts.userId}:day:${day}`, intEnv(env.LLM_USER_DAILY_LIMIT, 100), 'user_daily');
  await check(`user:${opts.userId}:cost:${day}`, intEnv(env.LLM_USER_DAILY_COST_USD_MICRO, 2_000_000), 'user_daily_cost', 'cost_usd_micro');
  await check(`global:hour:${hr}`, intEnv(env.LLM_GLOBAL_HOURLY_COST_USD_MICRO, 5_000_000), 'global_hourly', 'cost_usd_micro');

  const globalDayCap = intEnv(env.LLM_GLOBAL_DAILY_COST_USD_MICRO, 50_000_000);
  const globalDayKey = `global:day:${day}`;
  const globalDayRow = await env.DB.prepare('SELECT cost_usd_micro AS v FROM llm_counters WHERE key = ?').bind(globalDayKey).first<{ v: number }>();
  const globalDayCost = globalDayRow?.v ?? 0;
  if (globalDayCost >= globalDayCap) throw new LlmCapExceeded('global_daily');

  // 80% alert, deduped via KV for the day.
  const alertThreshold = globalDayCap * intEnv(env.LLM_GLOBAL_ALERT_THRESHOLD_PERMIL, 800) / 1000;
  if (globalDayCost >= alertThreshold && env.STATE_KV) {
    const alertKey = `llm:alert:${day}`;
    const already = await env.STATE_KV.get(alertKey);
    if (!already) {
      await env.STATE_KV.put(alertKey, '1', { expirationTtl: 86400 });
      await sendTelegramAlert(env, `⚠️ LLM daily spend ${(globalDayCost / 1e6).toFixed(2)} / ${(globalDayCap / 1e6).toFixed(2)} USD (${Math.round(globalDayCost / globalDayCap * 100)}%)`);
    }
  }
}

// Post-call: atomic counter bumps (5 keys) + audit row write.
// Caller passes either success usage (inputTokens/outputTokens/costMicroUsd)
// or error details (status='error' + errorCode).
export async function recordCall(env: LlmGuardEnv, opts: {
  requestId: string;
  userId: string | null;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costMicroUsd: number;
  latencyMs: number;
  status: 'success' | 'blocked_cap' | 'blocked_kill' | 'error';
  blockReason?: CapReason;
  errorCode?: string;
  prompt: string;         // will be SHA-256 hashed — NEVER stored raw
  ipAddress?: string;
}): Promise<void> {
  const promptHash = await sha256(opts.prompt);
  const day = bucketDay();
  const hr = bucketHour();
  const expHour = Math.floor(Date.now() / 1000) + 7200;
  const expDay = Math.floor(Date.now() / 1000) + 90000;
  const cost = opts.costMicroUsd | 0;
  const uid = opts.userId;

  // Only bump counters on success calls — blocked/error shouldn't consume quota.
  if (opts.status === 'success' && uid) {
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO llm_counters(key,count,cost_usd_micro,expires_at) VALUES(?,1,0,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(`user:${uid}:hour:${hr}`, expHour),
        env.DB.prepare('INSERT INTO llm_counters(key,count,cost_usd_micro,expires_at) VALUES(?,1,0,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(`user:${uid}:day:${day}`, expDay),
        env.DB.prepare('INSERT INTO llm_counters(key,count,cost_usd_micro,expires_at) VALUES(?,0,?,?) ON CONFLICT(key) DO UPDATE SET cost_usd_micro=cost_usd_micro+excluded.cost_usd_micro').bind(`user:${uid}:cost:${day}`, cost, expDay),
        env.DB.prepare('INSERT INTO llm_counters(key,count,cost_usd_micro,expires_at) VALUES(?,0,?,?) ON CONFLICT(key) DO UPDATE SET cost_usd_micro=cost_usd_micro+excluded.cost_usd_micro').bind(`global:hour:${hr}`, cost, expHour),
        env.DB.prepare('INSERT INTO llm_counters(key,count,cost_usd_micro,expires_at) VALUES(?,0,?,?) ON CONFLICT(key) DO UPDATE SET cost_usd_micro=cost_usd_micro+excluded.cost_usd_micro').bind(`global:day:${day}`, cost, expDay),
      ]);
    } catch {}
  }

  try {
    await env.DB.prepare(`
      INSERT INTO llm_audit_log
        (id, user_id, feature, model, request_id, input_tokens, output_tokens,
         cache_read_tokens, cache_write_tokens, cost_usd_micro, latency_ms,
         status, block_reason, prompt_hash, error_code, ip_address)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      crypto.randomUUID(), uid, opts.feature, opts.model, opts.requestId,
      opts.inputTokens | 0, opts.outputTokens | 0,
      (opts.cacheReadTokens ?? 0) | 0, (opts.cacheWriteTokens ?? 0) | 0,
      cost, opts.latencyMs | 0,
      opts.status, opts.blockReason ?? null, promptHash, opts.errorCode ?? null,
      opts.ipAddress ?? null,
    ).run();
  } catch {}
}

async function sendTelegramAlert(env: LlmGuardEnv, text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
    });
  } catch {}
}

// Convenience used by stubs: pre-flight gate without running any LLM call.
// Returns {ok: true, reason: undefined} to proceed, or {ok: false, reason}
// when a cap trips. Caller can log 'blocked_cap' via recordCall on !ok.
export async function gateStub(env: LlmGuardEnv, opts: { userId: string; model: string; inputTokens: number }): Promise<{ ok: boolean; reason?: CapReason }> {
  try {
    await preFlightCheck(env, opts);
    return { ok: true };
  } catch (e) {
    if (e instanceof LlmCapExceeded) return { ok: false, reason: e.reason };
    throw e;
  }
}
