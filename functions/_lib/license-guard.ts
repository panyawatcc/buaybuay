// License guard — KV-cached license validation for self-host Functions.
// Contract: ~/shared/contracts/adbot-license-contract.json
// Brain impl: /Users/golfservera/projects/adbot-ai-brain B29 soft-cutoff
//
// Design (post-Golf-lockdown):
// - Default gate = middleware covers every /api/*. Customer adds a new
//   feature → just creates functions/api/custom/foo.ts, middleware picks it
//   up. No explicit requireLicense() needed for the common case.
// - requireLicense() = scattered-check defense (spec §9.2 #3). Called in
//   hot paths + feature modules with DISTINCT error messages so patchers
//   can't null-patch a single string to bypass the system.
// - 4-phase lifecycle (B29): active / warning / degrade / hard_block
//     active     → full pass
//     warning    → full pass + banner header (UI shows countdown)
//     degrade    → mutations blocked (402), reads pass (Sketch-soft RO window)
//     hard_block → all blocked (402)
// - ai/proxy at brain remains the hard anti-piracy gate regardless of phase.

import type { BrainClientEnv, ValidateResponse } from './brain-client';
import { validateLicense } from './brain-client';

export interface LicenseGuardEnv extends BrainClientEnv {
  STATE_KV?: KVNamespace;
}

const KV_KEY_PREFIX = 'license:cache:';
const FALLBACK_TTL_SEC = 3600;  // 1h if brain response omits cache_ttl_sec

// Result shape returned by the guard. 4 phases + misconfigured.
// Callers (middleware, requireLicense) switch on `phase` to decide what to
// do. `ok` is a convenience — true when the request should pass; for
// 'warning' that's still true (banner only).
export type GuardResult =
  | { ok: true;  phase: 'active';     validated: ValidateResponse & { valid: true } }
  | { ok: true;  phase: 'warning';    validated: ValidateResponse & { valid: true }; warning: string; days_remaining: number; grace_until?: number; revoked_reason?: string }
  | { ok: false; phase: 'degrade';    mode: 'read_only'; days_remaining_hard: number; revoked_reason?: string; grace_until?: number; reason: string }
  | { ok: false; phase: 'hard_block'; mode: 'blocked';   revoked_reason?: string; reason: string }
  | { ok: false; phase: 'misconfigured'; mode: 'blocked'; reason: string };

interface CacheEntry {
  stored_at: number;
  ttl_sec: number;
  body: ValidateResponse;
  status: number;
}

function kvKey(jwt: string): string {
  // Hash the JWT so keys stay bounded; license_id isn't known until validation.
  // Simple non-cryptographic fingerprint — KV key uniqueness, not security.
  let hash = 0;
  for (let i = 0; i < jwt.length; i++) {
    hash = ((hash << 5) - hash) + jwt.charCodeAt(i);
    hash |= 0;
  }
  return `${KV_KEY_PREFIX}${(hash >>> 0).toString(36)}`;
}

async function readCache(env: LicenseGuardEnv, jwt: string): Promise<CacheEntry | null> {
  if (!env.STATE_KV) return null;
  try {
    const raw = await env.STATE_KV.get(kvKey(jwt));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    const age = Math.floor(Date.now() / 1000) - entry.stored_at;
    if (age > entry.ttl_sec) return null;  // expired
    return entry;
  } catch {
    return null;
  }
}

async function writeCache(
  env: LicenseGuardEnv,
  jwt: string,
  status: number,
  body: ValidateResponse,
  ttl_sec: number,
): Promise<void> {
  if (!env.STATE_KV) return;
  const entry: CacheEntry = {
    stored_at: Math.floor(Date.now() / 1000),
    ttl_sec,
    body,
    status,
  };
  try {
    await env.STATE_KV.put(kvKey(jwt), JSON.stringify(entry), { expirationTtl: ttl_sec + 60 });
  } catch {}
}

// Main entry — reads env, consults cache, calls brain on miss/expiry, returns
// a typed GuardResult for the caller (middleware or feature check) to act on.
export async function checkLicense(env: LicenseGuardEnv): Promise<GuardResult> {
  const jwt = env.ADBOT_LICENSE_JWT;
  const domain = env.ADBOT_DOMAIN;
  if (!jwt || !domain) {
    return { ok: false, phase: 'misconfigured', mode: 'blocked', reason: 'missing_ADBOT_LICENSE_JWT_or_ADBOT_DOMAIN' };
  }

  const cached = await readCache(env, jwt);
  if (cached) {
    return interpretValidation(cached.status, cached.body);
  }

  let status: number;
  let body: ValidateResponse;
  try {
    const r = await validateLicense(env, jwt, domain);
    status = r.status;
    body = r.body;
  } catch (err) {
    // Brain unreachable — fail closed rather than open. Better to block
    // sessions than silently allow a revoked license through.
    return {
      ok: false,
      phase: 'hard_block',
      mode: 'blocked',
      reason: `brain_unreachable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const ttl = body.valid && 'cache_ttl_sec' in body ? body.cache_ttl_sec : FALLBACK_TTL_SEC;
  await writeCache(env, jwt, status, body, ttl);

  return interpretValidation(status, body);
}

function interpretValidation(status: number, body: ValidateResponse): GuardResult {
  // Active or warning — both valid:true. Distinguish via `status` field.
  if (status === 200 && body.valid === true) {
    if (body.status === 'warning') {
      return {
        ok: true,
        phase: 'warning',
        validated: body,
        warning: body.warning ?? 'license_expiring',
        days_remaining: body.days_remaining ?? 0,
        grace_until: body.grace_until,
        revoked_reason: body.revoked_reason,
      };
    }
    return { ok: true, phase: 'active', validated: body };
  }
  // Degrade — 200 + valid:false + mode:'read_only'.
  if (status === 200 && body.valid === false && 'mode' in body && body.mode === 'read_only') {
    return {
      ok: false,
      phase: 'degrade',
      mode: 'read_only',
      days_remaining_hard: body.days_remaining_hard ?? 0,
      revoked_reason: body.revoked_reason,
      grace_until: body.grace_until,
      reason: body.reason,
    };
  }
  // Hard-block — 403 + valid:false + mode:'blocked' (or any non-200 shape).
  if (body.valid === false && 'mode' in body && body.mode === 'blocked') {
    return {
      ok: false,
      phase: 'hard_block',
      mode: 'blocked',
      revoked_reason: body.revoked_reason,
      reason: body.reason,
    };
  }
  // 401 invalid / unknown shape — fail closed.
  return {
    ok: false,
    phase: 'hard_block',
    mode: 'blocked',
    reason: body.valid === false ? `invalid: ${body.reason}` : `unexpected_status: ${status}`,
  };
}

// ─── Scattered-check helper (spec §9.2 point #3) ───────────────────────────
// Every feature module imports this with its own feature name. Distinct
// error strings per call site so a cracker can't grep one sentinel and
// null-patch. Honored across all 4 phases: passes on active + warning,
// throws on degrade/hard_block/misconfigured.
export class LicenseRequiredError extends Error {
  constructor(public feature: string, public reason: string) {
    super(`LICENSE:${feature}:${reason}`);
  }
}

export async function requireLicense(
  env: LicenseGuardEnv,
  feature: string,
): Promise<ValidateResponse & { valid: true }> {
  const result = await checkLicense(env);
  if (result.ok) {
    // Per-feature gate: if license.features is not ['all'] and doesn't
    // include this feature, treat as blocked with a distinct code.
    const feats = result.validated.features;
    const allowsAll = feats.includes('all');
    if (!allowsAll && !feats.includes(feature)) {
      throw new LicenseRequiredError(feature, 'tier_does_not_include_feature');
    }
    return result.validated;
  }
  // Degrade still throws for mutation-class callers (scattered checks sit
  // in mutation hot-paths; the middleware handles read/write distinction
  // at the HTTP layer for endpoints that use the default gate).
  if (result.phase === 'degrade') {
    throw new LicenseRequiredError(feature, `read_only_${result.revoked_reason ?? 'revoked'}`);
  }
  if (result.phase === 'hard_block') {
    throw new LicenseRequiredError(feature, `hard_block_${result.revoked_reason ?? result.reason}`);
  }
  throw new LicenseRequiredError(feature, 'misconfigured');
}

// ─── UI surface (/api/license/status) ──────────────────────────────────────
// Exposes phase + banner metadata so the SPA can render the right UI
// (hidden / yellow warning / orange read-only / red hard-block).
export async function getLicenseStatusForUi(env: LicenseGuardEnv): Promise<{
  status: 'active' | 'warning' | 'degrade' | 'hard_block' | 'misconfigured';
  mode: 'active' | 'read_only' | 'blocked';
  tier?: string;
  seats?: number;
  expires_at?: number;
  warning?: string;
  days_remaining?: number;
  days_remaining_hard?: number;
  grace_until?: number;
  revoked_reason?: string;
}> {
  const result = await checkLicense(env);
  if (result.ok && result.phase === 'active') {
    return {
      status: 'active',
      mode: 'active',
      tier: result.validated.tier,
      seats: result.validated.seats,
      expires_at: result.validated.expires_at,
    };
  }
  if (result.ok && result.phase === 'warning') {
    return {
      status: 'warning',
      mode: 'active',
      tier: result.validated.tier,
      seats: result.validated.seats,
      expires_at: result.validated.expires_at,
      warning: result.warning,
      days_remaining: result.days_remaining,
      grace_until: result.grace_until,
      revoked_reason: result.revoked_reason,
    };
  }
  if (!result.ok && result.phase === 'degrade') {
    return {
      status: 'degrade',
      mode: 'read_only',
      days_remaining_hard: result.days_remaining_hard,
      grace_until: result.grace_until,
      revoked_reason: result.revoked_reason,
    };
  }
  if (!result.ok && result.phase === 'hard_block') {
    return {
      status: 'hard_block',
      mode: 'blocked',
      revoked_reason: result.revoked_reason,
    };
  }
  return { status: 'misconfigured', mode: 'blocked' };
}
