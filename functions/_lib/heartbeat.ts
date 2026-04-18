// Heartbeat (B16) — shared helper called by both the CF Cron Trigger scheduled
// handler and the /api/cron/heartbeat HTTP ingress. Keeps ingress-agnostic
// business logic in one place so a single change doesn't need to be repeated.
//
// Contract: POST /v1/license/heartbeat with { version, uptime_sec, active_admins }
// On 403 revoked, log + degrade gracefully (don't throw — caller decides).

import { heartbeat } from './brain-client';
import type { LicenseGuardEnv } from './license-guard';
import { hydrateLicenseEnv } from './license-storage';

export interface HeartbeatResult {
  sent: boolean;
  status: number;
  body: unknown;
  skipped_reason?: string;
}

const APP_VERSION = '0.1.0';

async function countActiveAdmins(env: LicenseGuardEnv): Promise<number> {
  // Best-effort only. If D1 is bound and a `users` table exists, count admin
  // rows; otherwise return 0 so the field is always present.
  const maybeDb = (env as LicenseGuardEnv & { DB?: D1Database }).DB;
  if (!maybeDb) return 0;
  try {
    const row = await maybeDb
      .prepare(`SELECT COUNT(*) AS c FROM users WHERE role IN ('admin','owner') AND deleted_at IS NULL`)
      .first<{ c: number }>();
    return row?.c ?? 0;
  } catch {
    return 0;
  }
}

export async function performHeartbeat(env: LicenseGuardEnv): Promise<HeartbeatResult> {
  const hydrated = await hydrateLicenseEnv(env);
  if (!hydrated.ADBOT_LICENSE_JWT || !hydrated.ADBOT_DOMAIN) {
    return { sent: false, status: 0, body: null, skipped_reason: 'no_license_configured' };
  }

  const admins = await countActiveAdmins(hydrated);
  const body = {
    version: APP_VERSION,
    uptime_sec: 86400,  // CF Functions are stateless; report nominal 24h window
    active_admins: admins,
  };

  try {
    const r = await heartbeat(hydrated, hydrated.ADBOT_LICENSE_JWT, body);
    if (r.status === 403 && 'revoked' in r.body) {
      // Graceful degrade: do NOT throw. Scattered checks elsewhere gate access;
      // heartbeat's job is to report + log, not to enforce.
      console.warn(`[heartbeat] license revoked: reason=${r.body.revoked_reason} grace_until=${r.body.grace_until}`);
    }
    return { sent: true, status: r.status, body: r.body };
  } catch (err) {
    console.error(`[heartbeat] brain unreachable: ${err instanceof Error ? err.message : String(err)}`);
    return { sent: false, status: 0, body: null, skipped_reason: 'brain_unreachable' };
  }
}
