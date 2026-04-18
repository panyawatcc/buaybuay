// POST /api/license/accept-terms — dedicated endpoint for stamping TOS/DPA
// acceptance on an already-stored license without re-sending the JWT. Used
// when the license record was pushed to STATE_KV by ops (wrangler kv:key put)
// and the customer needs to click "accept" without going through the full
// setup flow. Also the target of the LicenseBanner "ยอมรับ" CTA and any
// version-bump re-accept prompts.
//
// POST /api/license/setup can also stamp acceptance, but it requires
// {jwt, domain} in the body — a friction that duplicates data the server
// already has. This endpoint takes `{}` and reads the current license from
// storage, setting accepted_at + accepted_ip + accepted_{tos,dpa}_version to
// the server's current constants.
//
// Path is in PUBLIC_PATH_PREFIXES alongside /api/license/setup so the UI
// can reach it before the license phase is flipped to active.

import { loadLicense, saveLicense } from '../../_lib/license-storage';
import type { LicenseGuardEnv } from '../../_lib/license-guard';
import { CURRENT_TOS_VERSION, CURRENT_DPA_VERSION } from '../../_lib/legal-versions';

type Env = LicenseGuardEnv & Record<string, unknown>;
type Context = EventContext<Env, string, Record<string, unknown>>;

export async function onRequestPost(context: Context): Promise<Response> {
  const env = context.env as LicenseGuardEnv;
  const prior = await loadLicense(env);
  if (!prior) {
    // No license stored — customer must go through /api/license/setup first.
    return Response.json(
      { error: 'no_license_stored', hint: 'POST /api/license/setup with {jwt, domain} first' },
      { status: 400 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const clientIp = context.request.headers.get('cf-connecting-ip')
    ?? context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? undefined;

  try {
    await saveLicense(env, {
      ...prior,
      accepted_at: now,
      accepted_ip: clientIp,
      accepted_tos_version: CURRENT_TOS_VERSION,
      accepted_dpa_version: CURRENT_DPA_VERSION,
    });
  } catch (err) {
    return Response.json(
      { error: 'kv_unavailable', detail: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }

  return Response.json({
    ok: true,
    accepted_at: now,
    accepted_tos_version: CURRENT_TOS_VERSION,
    accepted_dpa_version: CURRENT_DPA_VERSION,
  });
}

// Explicit 405 handler so the earlier bare-GET probe returns a useful error
// instead of the default Pages HTML 405 page. Keeps the API-discoverable.
export async function onRequest(context: Context): Promise<Response> {
  if (context.request.method === 'POST') return onRequestPost(context);
  return Response.json(
    { error: 'method_not_allowed', allowed: ['POST'] },
    { status: 405, headers: { Allow: 'POST' } },
  );
}
