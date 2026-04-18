// POST /api/cron/heartbeat — HTTP ingress for the daily heartbeat job.
// Either CF Workers Cron or an external scheduler (cron-job.org, etc.) hits
// this URL every 24h. Shares logic with the CF Pages scheduled handler
// (functions/_scheduled.ts) via _lib/heartbeat.ts.
//
// Security: gate with a shared-secret header `X-Adbot-Cron-Secret` to prevent
// public triggering. Secret value is bound as CRON_SECRET env var. If unset,
// endpoint returns 503 (fail closed — deployments must configure it).

import { performHeartbeat } from '../../_lib/heartbeat';
import type { LicenseGuardEnv } from '../../_lib/license-guard';

type Env = LicenseGuardEnv & { CRON_SECRET?: string } & Record<string, unknown>;
type Context = EventContext<Env, string, Record<string, unknown>>;

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestPost(context: Context): Promise<Response> {
  const env = context.env;
  if (!env.CRON_SECRET) {
    return Response.json({ error: 'cron_secret_not_configured' }, { status: 503 });
  }
  const provided = context.request.headers.get('X-Adbot-Cron-Secret') ?? '';
  if (!constantTimeEqual(provided, env.CRON_SECRET)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await performHeartbeat(env);
  return Response.json(result, {
    status: result.sent ? 200 : 202,
  });
}
