// Root license gate — CF Pages Functions runs this before every HTTP handler.
//
// Golf P0 lockdown vision: "ถ้าโค้ดหลุด ใช้งานได้น้อยที่สุด — ลูกค้าที่จ่าย
// license ยังต้อง extend feature ได้." Default-deny: every /api/* route
// requires a valid license EXCEPT an explicit public whitelist. Customers
// adding new endpoints under /api/* get gated automatically — no extra
// decoration needed per-handler. (Scattered-check requireLicense() is
// available for deeper defense-in-depth, see CONTRIBUTOR.md.)
//
// Phase map (B29 soft-cutoff):
//   active     → pass through (everything works)
//   warning    → pass through + banner headers (UI countdown, 7d before cutoff)
//   degrade    → reads pass, MUTATIONS 402 (Sketch-soft read-only window)
//   hard_block → all 402 (full lockout)
//   misconfigured → all 402 (ADBOT_LICENSE_JWT/DOMAIN not set)
//
// Response on block: HTTP 402 "Payment Required" with JSON body so the SPA
// can decide LicenseSetup vs renew-prompt. 402 is semantically correct —
// the gate is licensing, not authentication (401) or permanent forbidden (403).

import { checkLicense } from './_lib/license-guard';
import type { LicenseGuardEnv } from './_lib/license-guard';
import { hydrateLicenseEnv } from './_lib/license-storage';

type Env = LicenseGuardEnv & Record<string, unknown>;
type Context = EventContext<Env, string, Record<string, unknown>>;

// Public prefixes — explicit allow-list (default-deny). Match against both
// exact path and path-prefix (with '/' boundary) to avoid accidental prefix
// smuggling like /api/licensesomething.
const PUBLIC_PATH_PREFIXES = [
  '/api/license',           // license configuration + status — pre-license chicken-and-egg
  '/api/auth',              // login/register/logout/refresh — orthogonal to license
  '/api/cron',              // cron hits (heartbeat) — CRON_SECRET-gated, must reach brain even when revoked
  '/api/health',            // liveness probe (functions/api/health.ts)
  '/api/healthz',           // alt liveness
  '/api/telegram/webhook',  // Telegram webhook callback — external service, own secret verification
];

// HTTP methods that mutate state. Enforced during `degrade` phase: reads
// pass, writes 402. GET+HEAD+OPTIONS are always safe reads.
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function licenseRequired(
  mode: 'degrade_mutation' | 'hard_block' | 'misconfigured',
  reason: string,
  extras: Record<string, unknown> = {},
): Response {
  return Response.json(
    { error: 'license_required', mode, reason, ...extras },
    { status: 402 },  // Payment Required — license is a paid good
  );
}

export async function onRequest(context: Context): Promise<Response> {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // SPA assets + non-API routes pass through untouched.
  if (!pathname.startsWith('/api/') || isPublicPath(pathname)) {
    return context.next();
  }

  const env = await hydrateLicenseEnv(context.env as LicenseGuardEnv);
  const result = await checkLicense(env);

  // Active — full pass.
  if (result.ok && result.phase === 'active') {
    return context.next();
  }

  // Warning — full pass + headers so the SPA can render a yellow banner
  // without a second round-trip. Everything still works.
  if (result.ok && result.phase === 'warning') {
    const res = await context.next();
    res.headers.set('X-Adbot-License-State', 'warning');
    res.headers.set('X-Adbot-License-Warning', result.warning);
    res.headers.set('X-Adbot-License-Days-Remaining', String(result.days_remaining));
    if (result.grace_until) res.headers.set('X-Adbot-License-Grace-Until', String(result.grace_until));
    if (result.revoked_reason) res.headers.set('X-Adbot-License-Revoked-Reason', result.revoked_reason);
    return res;
  }

  // Degrade — Sketch-soft read-only window. GET passes; mutations 402.
  if (!result.ok && result.phase === 'degrade') {
    if (MUTATION_METHODS.has(context.request.method)) {
      return licenseRequired('degrade_mutation', result.reason, {
        revoked_reason: result.revoked_reason,
        days_remaining_hard: result.days_remaining_hard,
        grace_until: result.grace_until,
      });
    }
    // Read-through with headers — SPA can render orange banner + disable
    // mutation buttons based on X-Adbot-License-State.
    const res = await context.next();
    res.headers.set('X-Adbot-License-State', 'degrade');
    res.headers.set('X-Adbot-License-Days-Remaining-Hard', String(result.days_remaining_hard));
    if (result.revoked_reason) res.headers.set('X-Adbot-License-Revoked-Reason', result.revoked_reason);
    return res;
  }

  // Hard-block or misconfigured — all 402.
  if (!result.ok && result.phase === 'hard_block') {
    return licenseRequired('hard_block', result.reason, { revoked_reason: result.revoked_reason });
  }
  return licenseRequired('misconfigured', result.reason);
}
