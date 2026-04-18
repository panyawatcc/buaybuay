// POST /api/auth/register
//
// Hybrid C lockdown (Golf): first-ever register MUST submit a valid license
// JWT. No license = no first admin = dead system. After the first admin is
// created + license stored, subsequent register calls inherit the stored
// license (don't re-submit).
//
// Body shape:
//   { email, password, name, license_jwt?, domain?, brain_url?, anthropic_key? }
//
//   license_jwt + domain REQUIRED iff this is the first user. On subsequent
//   registers they're ignored — the stored license wins, so a second admin
//   can't swap the license out by submitting a different JWT.
//
// Endpoint itself stays in PUBLIC_PATH_PREFIXES (/api/auth/*) so the
// middleware doesn't gate it — we handle the license check inline here,
// because the FIRST register is the very moment the license gets written.

import { hashPassword, signJWT, buildSessionCookie, type Role } from '../../_lib/auth';
import { checkRateLimit } from '../../_lib/rate-limit';
import { validateLicense as brainValidate } from '../../_lib/brain-client';
import { loadLicense, saveLicense } from '../../_lib/license-storage';
import { checkLicense } from '../../_lib/license-guard';
import type { LicenseGuardEnv } from '../../_lib/license-guard';
import { CURRENT_TOS_VERSION, CURRENT_DPA_VERSION } from '../../_lib/legal-versions';

interface Env extends LicenseGuardEnv {
  DB: D1Database;
  JWT_SECRET: string;
  STATE_KV: KVNamespace;
}

function licenseRequired(
  mode: 'first_register_needs_license' | 'invalid' | 'missing_domain' | 'hard_block' | 'misconfigured' | 'degrade',
  reason: string,
  extras: Record<string, unknown> = {},
): Response {
  return Response.json(
    { error: 'license_required', mode, reason, ...extras },
    { status: 402 },
  );
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const rateLimitResp = await checkRateLimit(context.env.STATE_KV, context.request, 'auth', {
    max: 5,
    windowSec: 60,
  });
  if (rateLimitResp) return rateLimitResp;

  let body: {
    email?: string;
    password?: string;
    name?: string;
    license_jwt?: string;
    domain?: string;
    brain_url?: string;
    anthropic_key?: string;
    /** True when the customer ticked the TOS+DPA+Full-Mirror checkbox in
     *  the register UI. Stamps accepted_at/ip + version strings. Required
     *  on the first-admin path (FE checkbox gates submit; backend
     *  enforces too as belt-and-suspenders for DPA §7 audit trail). */
    accept_terms?: boolean;
  };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim();

  if (!email || !password || !name) {
    return Response.json({ error: 'email, password, and name are required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email format' }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  // ─── License gate — FIRST register needs a valid license ──────────────
  //
  // Two branches:
  //
  //   A. System already has a stored license (first admin exists).
  //      → Just verify the stored license is still valid. Register
  //        proceeds normally; body.license_jwt is ignored.
  //
  //   B. System has NO stored license yet (brand-new deploy).
  //      → body.license_jwt + body.domain are REQUIRED. Validate against
  //        brain. On 402 pass, save the license to KV so future /api/*
  //        calls can use it.

  const existingLicense = await loadLicense(context.env);
  const isFirstAdmin = !existingLicense;

  if (isFirstAdmin) {
    const jwt = body.license_jwt?.trim();
    const domain = body.domain?.trim() || context.env.ADBOT_DOMAIN;
    if (!jwt) {
      return licenseRequired('first_register_needs_license', 'No existing license and license_jwt missing from body');
    }
    if (!domain) {
      return licenseRequired('missing_domain', 'license_jwt provided but domain missing (needed for X-Adbot-Domain)');
    }

    // Brain validation — uses the submitted JWT + domain; env vars may not
    // be set yet since this IS the setup flow.
    let brainResult: { status: number; body: any };
    try {
      brainResult = await brainValidate(
        { ADBOT_BRAIN_URL: body.brain_url ?? context.env.ADBOT_BRAIN_URL },
        jwt,
        domain,
      );
    } catch (err) {
      return licenseRequired('hard_block', `brain_unreachable: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (brainResult.status !== 200 || brainResult.body.valid !== true) {
      return licenseRequired(
        'invalid',
        brainResult.body.reason ?? `brain_status_${brainResult.status}`,
        { brain_status: brainResult.status },
      );
    }

    // Enforce the TOS+DPA+Full-Mirror acceptance on first-admin register.
    // The UI checkbox gates the submit button, but we enforce here too so
    // (a) the acceptance audit trail is guaranteed complete even if a
    // client bypasses the UI, and (b) DPA §7 processor-obligations can
    // prove which version was agreed to, when, and from what IP.
    if (body.accept_terms !== true) {
      return Response.json(
        { error: 'terms_not_accepted', detail: 'accept_terms: true is required on first-admin register; UI must show TOS + DPA + Full Mirror disclosure checkbox' },
        { status: 400 },
      );
    }

    // License is good + terms accepted. Persist it BEFORE we create the
    // user so the middleware for subsequent requests finds it (and so a
    // failure between here and user-create doesn't leave the system
    // license-less-but-user-populated).
    const acceptedAt = Math.floor(Date.now() / 1000);
    await saveLicense(context.env, {
      jwt,
      domain,
      brain_url: body.brain_url ?? context.env.ADBOT_BRAIN_URL,
      anthropic_key: body.anthropic_key?.trim() || undefined,
      // Full acceptance trail — timestamp + IP + version strings. Versions
      // come from functions/_lib/legal-versions.ts (same source of truth
      // /api/license/setup uses), so re-accept prompts after a version
      // bump compare apples-to-apples.
      accepted_at: acceptedAt,
      accepted_ip: context.request.headers.get('cf-connecting-ip') ?? undefined,
      accepted_tos_version: CURRENT_TOS_VERSION,
      accepted_dpa_version: CURRENT_DPA_VERSION,
    });
  } else {
    // Existing license — check it's still valid before allowing new admins
    // to register. A hard-blocked or misconfigured license should not
    // let a new account in.
    const hydrated: LicenseGuardEnv = {
      ...context.env,
      ADBOT_LICENSE_JWT: existingLicense.jwt,
      ADBOT_DOMAIN: existingLicense.domain,
      ADBOT_BRAIN_URL: existingLicense.brain_url ?? context.env.ADBOT_BRAIN_URL,
    };
    const result = await checkLicense(hydrated);
    if (!result.ok) {
      if (result.phase === 'degrade') {
        // degrade is read-only — blocking mutations. A new account
        // creation IS a mutation. Block.
        return licenseRequired('degrade', 'License in read-only mode; cannot create new admin', {
          revoked_reason: result.revoked_reason,
          days_remaining_hard: result.days_remaining_hard,
        });
      }
      return licenseRequired(result.phase, result.reason, {
        revoked_reason: 'revoked_reason' in result ? result.revoked_reason : undefined,
      });
    }
  }

  // ─── User creation (existing flow) ────────────────────────────────────

  try {
    const existing = await context.env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();
    if (existing) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Multi-admin SaaS model (2026-04-18): every successful register → admin.
    // Isolation enforced by (a) admin_fb_tokens.admin_user_id UNIQUE per
    // migration 0017 and (b) fb-context.ts:getFbContext filtering
    // admin_fb_tokens by caller for admin role (commit 273d2f8).
    const role: Role = 'admin';

    const { hash, salt } = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await context.env.DB.prepare(
      `INSERT INTO users (id, email, name, password_hash, password_salt, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(userId, email, name, hash, salt, role, now, now)
      .run();

    const jwt = await signJWT({ sub: userId, email, role }, context.env.JWT_SECRET);

    return Response.json(
      { user: { id: userId, email, name, role }, first_admin: isFirstAdmin },
      {
        status: 201,
        headers: { 'Set-Cookie': buildSessionCookie(jwt) },
      },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Registration failed' },
      { status: 500 },
    );
  }
};
