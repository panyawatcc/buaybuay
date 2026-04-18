// License storage (B15) — resolves the active license JWT + domain from the
// configured source. CF Pages has no filesystem, so "primary env / file fallback"
// from the spec becomes "primary env / KV fallback" here.
//
// Primary:   ADBOT_LICENSE_JWT + ADBOT_DOMAIN env bindings (CF Pages secrets
//            + plain vars set via `wrangler pages secret put` / dashboard).
// Fallback:  KV entry STATE_KV['license:self'] — populated by the /api/license/setup
//            endpoint when the customer enters values via the LicenseSetup UI.
//            Env wins on a tie so ops-set config always beats UI-edited values.

import type { LicenseGuardEnv } from './license-guard';

export interface StoredLicense {
  jwt: string;
  domain: string;
  brain_url?: string;
  anthropic_key?: string;
  // Acceptance audit trail (DPA §2 trigger — recorded when customer checks
  // the TOS + DPA box in LicenseSetup. Persisted here so ops can prove a
  // given deployment accepted the agreements at a specific time/IP).
  accepted_at?: number;       // unix seconds
  accepted_ip?: string;       // cf-connecting-ip from setup request
  accepted_tos_version?: string;
  accepted_dpa_version?: string;
}

const KV_KEY_SELF_LICENSE = 'license:self';

async function readKvEntry(env: LicenseGuardEnv): Promise<Partial<StoredLicense> | null> {
  if (!env.STATE_KV) return null;
  try {
    const raw = await env.STATE_KV.get(KV_KEY_SELF_LICENSE);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<StoredLicense>;
  } catch {
    return null;
  }
}

export async function loadLicense(env: LicenseGuardEnv): Promise<StoredLicense | null> {
  // Primary: env bindings (CF Pages secrets + plain vars) for jwt+domain,
  // but we still read the KV entry to merge acceptance fields (accepted_at,
  // accepted_*_version) — the accept-terms endpoint writes those to KV even
  // when env is the primary source, so the customer's "I accept" click has
  // an effect regardless of how jwt+domain got set.
  if (env.ADBOT_LICENSE_JWT && env.ADBOT_DOMAIN) {
    const kvExtras = await readKvEntry(env);
    return {
      jwt: env.ADBOT_LICENSE_JWT,
      domain: env.ADBOT_DOMAIN,
      brain_url: env.ADBOT_BRAIN_URL,
      accepted_at: kvExtras?.accepted_at,
      accepted_ip: kvExtras?.accepted_ip,
      accepted_tos_version: kvExtras?.accepted_tos_version,
      accepted_dpa_version: kvExtras?.accepted_dpa_version,
    };
  }

  // Fallback: KV entry written by /api/license/setup or /api/license/accept-terms.
  const parsed = await readKvEntry(env);
  if (parsed && typeof parsed.jwt === 'string' && typeof parsed.domain === 'string') {
    return parsed as StoredLicense;
  }

  return null;
}

export async function saveLicense(env: LicenseGuardEnv, value: StoredLicense): Promise<void> {
  if (!env.STATE_KV) {
    throw new Error('STATE_KV binding required to persist license via UI fallback');
  }
  await env.STATE_KV.put(KV_KEY_SELF_LICENSE, JSON.stringify(value));
  // Also invalidate any cached validation so the next guard pass picks up the
  // new JWT immediately. The cache key is derived from the JWT so old entries
  // just become unreachable — no explicit delete needed for correctness, but
  // we prune to avoid KV bloat.
  try {
    // No-op prune: unreachable entries expire on their own TTL. If we ever
    // need aggressive cleanup, iterate STATE_KV.list({ prefix: 'license:cache:' }).
  } catch {}
}

export async function clearLicense(env: LicenseGuardEnv): Promise<void> {
  if (!env.STATE_KV) return;
  try {
    await env.STATE_KV.delete(KV_KEY_SELF_LICENSE);
  } catch {}
}

// Populates env fields from KV fallback so downstream code (brain-client, guard)
// reads from env consistently regardless of storage source. Call this at the
// top of every Function / scheduled handler before touching license-aware APIs.
export async function hydrateLicenseEnv(env: LicenseGuardEnv): Promise<LicenseGuardEnv> {
  if (env.ADBOT_LICENSE_JWT && env.ADBOT_DOMAIN) return env;
  const stored = await loadLicense(env);
  if (!stored) return env;
  return {
    ...env,
    ADBOT_LICENSE_JWT: stored.jwt,
    ADBOT_DOMAIN: stored.domain,
    ADBOT_BRAIN_URL: stored.brain_url ?? env.ADBOT_BRAIN_URL,
  };
}
