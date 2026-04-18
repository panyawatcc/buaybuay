// Brain-server client — typed wrapper over adbot-ai-brain HTTPS endpoints.
// Contract: ~/shared/contracts/adbot-license-contract.json (v1.1)
// Brain impl: /Users/golfservera/projects/adbot-ai-brain commit 5e8dd29
//
// ⚠️ ARCHITECTURAL RULE — ALL Claude API calls MUST go through this proxy.
//    Direct @anthropic-ai/sdk import is an anti-pattern (anti-piracy violation
//    per Hybrid C spec §5). Future PRs adding `from '@anthropic-ai/sdk'` or
//    `new Anthropic(` should be GUARD-flagged. Use aiProxy() below instead.
//
// Self-host Functions use this client instead of touching brain URLs directly.
// Every call sends Authorization + X-Adbot-Domain per contract endpoints section.

export interface BrainClientEnv {
  ADBOT_LICENSE_JWT?: string;      // CF Pages secret — JWT minted by brain issuer CLI
  ADBOT_DOMAIN?: string;           // Plain env — customer's public domain (must match JWT.domain)
  ADBOT_BRAIN_URL?: string;        // Plain env — defaults to https://api.adbot.io
}

const DEFAULT_BRAIN_URL = 'https://api.adbot.io';

function brainUrl(env: BrainClientEnv): string {
  return (env.ADBOT_BRAIN_URL ?? DEFAULT_BRAIN_URL).replace(/\/$/, '');
}

function authHeaders(jwt: string, domain: string): HeadersInit {
  return {
    'Authorization': `Bearer ${jwt}`,
    'X-Adbot-Domain': domain,
    'Content-Type': 'application/json',
  };
}

// ─── /v1/license/validate ──────────────────────────────────────────────────

// Phase-aware types — brain's B29 soft-cutoff response shapes.
// `status` distinguishes active vs warning while `valid: true` is the same
// for both. `mode` appears on degrade/hard_block so middleware can
// decide read-only vs full-block.

export interface ValidateResponseValid {
  valid: true;
  status: 'active' | 'warning';
  license_id: string;
  domain: string;
  tier: string;
  seats: number;
  features: string[];
  max_campaigns: number | null;
  expires_at: number;
  cache_ttl_sec: number;
  // Present only when status === 'warning' (banner phase).
  mode?: 'active';
  warning?: string;          // e.g. 'license_expiring', 'license_revoked_grace'
  days_remaining?: number;
  grace_until?: number;
  revoked_reason?: string;
}

export interface ValidateResponseDegrade {
  valid: false;
  reason: 'revoked' | 'expired';
  mode: 'read_only';
  days_remaining_hard: number;
  revoked_reason?: string;
  grace_until?: number;
}

export interface ValidateResponseHardBlock {
  valid: false;
  reason: 'revoked' | 'expired';
  mode: 'blocked';
  revoked_reason?: string;
}

export interface ValidateResponseInvalid {
  valid: false;
  reason: 'invalid';
}

export type ValidateResponse =
  | ValidateResponseValid
  | ValidateResponseDegrade
  | ValidateResponseHardBlock
  | ValidateResponseInvalid;

export async function validateLicense(
  env: BrainClientEnv,
  jwt: string,
  domain: string,
): Promise<{ status: number; body: ValidateResponse }> {
  const res = await fetch(`${brainUrl(env)}/v1/license/validate`, {
    method: 'POST',
    headers: authHeaders(jwt, domain),
  });
  const body = (await res.json()) as ValidateResponse;
  return { status: res.status, body };
}

// ─── /v1/ai/proxy ──────────────────────────────────────────────────────────

export interface AiProxyRequest {
  model: string;
  messages: unknown[];
  max_tokens: number;
  stream?: boolean;
}

export interface AiProxyBody {
  anthropic_key: string;
  request: AiProxyRequest;
}

// Returns the raw Response so callers can read body + headers (brain sets
// X-Adbot-Brain-License-Id on 200 per contract, useful for audit).
// Callers MUST NOT log the anthropic_key — contract security_invariants enforces.
export async function aiProxy(
  env: BrainClientEnv,
  jwt: string,
  domain: string,
  body: AiProxyBody,
): Promise<Response> {
  return fetch(`${brainUrl(env)}/v1/ai/proxy`, {
    method: 'POST',
    headers: authHeaders(jwt, domain),
    body: JSON.stringify(body),
  });
}

// ─── /v1/license/heartbeat ─────────────────────────────────────────────────

export interface HeartbeatBody {
  version: string;
  uptime_sec: number;
  active_admins: number;
}

export interface HeartbeatResponseOk {
  ack: true;
  next_heartbeat_sec: number;
}

export interface HeartbeatResponseRevoked {
  revoked: true;
  revoked_reason: string;
  grace_until: number;
}

export async function heartbeat(
  env: BrainClientEnv,
  jwt: string,
  body: HeartbeatBody,
): Promise<{ status: number; body: HeartbeatResponseOk | HeartbeatResponseRevoked }> {
  const res = await fetch(`${brainUrl(env)}/v1/license/heartbeat`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const respBody = (await res.json()) as HeartbeatResponseOk | HeartbeatResponseRevoked;
  return { status: res.status, body: respBody };
}

// ─── /v1/license/migrate-domain ────────────────────────────────────────────

export interface MigrateDomainBody {
  new_domain: string;
  reason: string;
}

export async function migrateDomain(
  env: BrainClientEnv,
  jwt: string,
  body: MigrateDomainBody,
): Promise<Response> {
  return fetch(`${brainUrl(env)}/v1/license/migrate-domain`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── revoked_reason_ux lookup (contract §revoked_reason_ux) ─────────────────
// Customer-facing strings for /v1/license/validate revoked responses. UI layer
// reads the JWT's `revoked_reason` field, passes it here, and renders the
// localized copy. The brain's internal `notes` field is operator-only and
// MUST NOT leak to customers.

export type RevokedReason =
  | 'fraud'
  | 'chargeback'
  | 'tos_violation'
  | 'migration_pending'
  | 'key_compromise'
  | 'operator_error'
  | 'other';

const REVOKED_REASON_UX: Record<RevokedReason, { en: string; th: string }> = {
  fraud:             { en: 'License suspended. Contact vendor.',      th: 'License ถูกระงับ ติดต่อผู้ขาย' },
  chargeback:        { en: 'License on hold. Contact billing.',        th: 'License ถูกระงับชั่วคราว ติดต่อฝ่ายการเงิน' },
  tos_violation:     { en: 'License revoked. Contact support.',        th: 'License ถูกยกเลิก ติดต่อฝ่ายบริการ' },
  migration_pending: { en: 'License is migrating. New key incoming.',  th: 'กำลังย้ายโดเมน คีย์ใหม่จะมาถึงเร็วๆ นี้' },
  key_compromise:    { en: 'Security revoke. Contact support.',        th: 'ระงับด้านความปลอดภัย ติดต่อฝ่ายบริการ' },
  operator_error:    { en: 'Temporary issue. Restoration incoming.',   th: 'ข้อผิดพลาดชั่วคราว กำลังดำเนินการแก้ไข' },
  other:             { en: 'License revoked. Contact support.',        th: 'License ถูกยกเลิก ติดต่อฝ่ายบริการ' },
};

export function revokedReasonUx(reason: string, lang: 'en' | 'th' = 'th'): string {
  const key = (reason in REVOKED_REASON_UX ? reason : 'other') as RevokedReason;
  return REVOKED_REASON_UX[key][lang];
}
