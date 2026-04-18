// CF Pages scheduled handler — fires on the cron expressions declared in
// wrangler.toml [triggers].crons. Current schedule: once per day at 00:00 UTC.
// Calls the shared heartbeat helper so HTTP (/api/cron/heartbeat) and the
// scheduled path share one implementation.

import { performHeartbeat } from './_lib/heartbeat';
import type { LicenseGuardEnv } from './_lib/license-guard';

export async function scheduled(
  _event: ScheduledEvent,
  env: LicenseGuardEnv,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(performHeartbeat(env).then((result) => {
    if (!result.sent) {
      console.warn(`[scheduled-heartbeat] skipped: ${result.skipped_reason ?? 'unknown'}`);
      return;
    }
    console.log(`[scheduled-heartbeat] status=${result.status}`);
  }));
}
