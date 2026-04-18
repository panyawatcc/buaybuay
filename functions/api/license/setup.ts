// POST /api/license/setup — UI setup endpoint (B16 per COMMANDER dispatch).
// Customer submits their license JWT + domain (+ optional brain URL override).
// Stored in STATE_KV['license:self']. Env bindings win on hydration so ops-set
// values trump UI-edited. This endpoint is in PUBLIC_PATH_PREFIXES so the
// customer can reach it before the license is active.
//
// Security: this endpoint MUST be gated by app-level auth (admin role) once
// the auth layer is wired. For first-boot with no auth yet, we accept it
// unauthenticated but return 400 if the submitted JWT fails structural check
// (must be 3 base64 segments). Full JWT verification happens at the brain.

import { saveLicense, clearLicense, loadLicense } from '../../_lib/license-storage';
import type { LicenseGuardEnv } from '../../_lib/license-guard';

type Env = LicenseGuardEnv & Record<string, unknown>;
type Context = EventContext<Env, string, Record<string, unknown>>;

// Current TOS/DPA versions live in the markdown file frontmatter but the
// acceptance record also snapshots the version string so we can tell later
// whether a deployment's accepted copy matches what's current.
//
// Bumping either version triggers the re-acceptance gate on next setup
// (loadLicense returns older accepted_*_version → config.terms_accepted
// stays Boolean(accepted_at) but the UI's reconciliation logic compares
// strings and re-prompts). Changelog:
//   1.0 → 1.1 (2026-04-18) — DPA adds Anthropic as sub-processor #4 (BYOK),
//                            OpenAI reclassified 'planned'; TOS header-sync
//
// Constants extracted to functions/_lib/legal-versions.ts so register.ts
// stamps the same version on first-admin acceptance (single source of truth).
import { CURRENT_TOS_VERSION, CURRENT_DPA_VERSION } from '../../_lib/legal-versions';

interface SetupBody {
  jwt?: string;
  domain?: string;
  brain_url?: string;
  anthropic_key?: string;
  accept_terms?: boolean;   // must be true on first setup or when jwt changes
  clear?: boolean;
}

function looksLikeJwt(s: string): boolean {
  const parts = s.split('.');
  return parts.length === 3 && parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p));
}

export async function onRequestPost(context: Context): Promise<Response> {
  const env = context.env as LicenseGuardEnv;
  let body: SetupBody;
  try {
    body = (await context.request.json()) as SetupBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.clear === true) {
    await clearLicense(env);
    return Response.json({ ok: true, cleared: true });
  }

  if (!body.jwt || !body.domain) {
    return Response.json({ error: 'missing_fields', required: ['jwt', 'domain'] }, { status: 400 });
  }
  if (!looksLikeJwt(body.jwt)) {
    return Response.json({ error: 'jwt_malformed' }, { status: 400 });
  }

  // Preserve prior acceptance so customer doesn't have to re-accept on every
  // config tweak. First-time setup (no prior record), JWT change, or TOS/DPA
  // version bump all require explicit accept_terms:true (DPA §2 + §8).
  const prior = await loadLicense(env);
  const isFirstTime = !prior;
  const jwtChanged = Boolean(prior && prior.jwt !== body.jwt);
  const versionStale = Boolean(
    prior && (prior.accepted_tos_version !== CURRENT_TOS_VERSION || prior.accepted_dpa_version !== CURRENT_DPA_VERSION),
  );

  if ((isFirstTime || jwtChanged || versionStale) && body.accept_terms !== true) {
    return Response.json(
      {
        error: 'terms_acceptance_required',
        required: ['accept_terms'],
        reason: isFirstTime ? 'first_time' : jwtChanged ? 'jwt_changed' : 'version_bumped',
        current_tos_version: CURRENT_TOS_VERSION,
        current_dpa_version: CURRENT_DPA_VERSION,
      },
      { status: 400 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const clientIp = context.request.headers.get('cf-connecting-ip')
    ?? context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? undefined;

  try {
    await saveLicense(env, {
      jwt: body.jwt,
      domain: body.domain,
      brain_url: body.brain_url,
      anthropic_key: body.anthropic_key,
      accepted_at: body.accept_terms === true ? now : prior?.accepted_at,
      accepted_ip: body.accept_terms === true ? clientIp : prior?.accepted_ip,
      accepted_tos_version: body.accept_terms === true ? CURRENT_TOS_VERSION : prior?.accepted_tos_version,
      accepted_dpa_version: body.accept_terms === true ? CURRENT_DPA_VERSION : prior?.accepted_dpa_version,
    });
  } catch (err) {
    return Response.json(
      { error: 'kv_unavailable', detail: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }

  return Response.json({ ok: true, accepted_at: now });
}
