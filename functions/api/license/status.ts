// GET /api/license/status — read-only license state for the UI (scattered
// check #5 in spec §9.2). Used by the LicenseProvider Context at app mount
// to decide whether to render banners, blocked screens, or the setup flow.
//
// This endpoint lives in PUBLIC_PATH_PREFIXES in _middleware.ts so the UI can
// always reach it — the response body itself carries the gating decision.

import { getLicenseStatusForUi } from '../../_lib/license-guard';
import type { LicenseGuardEnv } from '../../_lib/license-guard';
import { hydrateLicenseEnv, loadLicense } from '../../_lib/license-storage';
import { revokedReasonUx } from '../../_lib/brain-client';
import { CURRENT_TOS_VERSION, CURRENT_DPA_VERSION } from '../../_lib/legal-versions';

type Env = LicenseGuardEnv & Record<string, unknown>;
type Context = EventContext<Env, string, Record<string, unknown>>;

export async function onRequestGet(context: Context): Promise<Response> {
  const env = await hydrateLicenseEnv(context.env as LicenseGuardEnv);
  const status = await getLicenseStatusForUi(env);

  // Enrich with customer-facing copy (EN + TH) so the UI doesn't need a
  // second API round trip. Banner shows on warning / degrade / hard_block —
  // any phase that carries a revoked_reason. Text is single-sourced via
  // revokedReasonUx; SPA picks language from user settings.
  const payload: Record<string, unknown> = { ...status };
  const needsBanner = status.status === 'warning' || status.status === 'degrade' || status.status === 'hard_block';
  if (needsBanner && status.revoked_reason) {
    payload.banner = {
      en: revokedReasonUx(status.revoked_reason, 'en'),
      th: revokedReasonUx(status.revoked_reason, 'th'),
    };
  }

  // Non-secret config hints for the setup UI — domain is public, anthropic_key
  // presence is a boolean flag (never return the key itself).
  const stored = await loadLicense(env);
  const versionStale = Boolean(
    stored?.accepted_at && (
      stored.accepted_tos_version !== CURRENT_TOS_VERSION ||
      stored.accepted_dpa_version !== CURRENT_DPA_VERSION
    ),
  );
  payload.config = {
    has_jwt: Boolean(stored?.jwt || env.ADBOT_LICENSE_JWT),
    domain: stored?.domain ?? env.ADBOT_DOMAIN ?? null,
    brain_url: stored?.brain_url ?? env.ADBOT_BRAIN_URL ?? null,
    anthropic_key_configured: Boolean(stored?.anthropic_key),
    terms_accepted: Boolean(stored?.accepted_at),
    accepted_at: stored?.accepted_at ?? null,
    accepted_tos_version: stored?.accepted_tos_version ?? null,
    accepted_dpa_version: stored?.accepted_dpa_version ?? null,
    // Current server-side versions so the SPA doesn't hardcode + drift.
    // Single source of truth = functions/_lib/legal-versions.ts.
    current_tos_version: CURRENT_TOS_VERSION,
    current_dpa_version: CURRENT_DPA_VERSION,
    // Derived flag: true when a re-accept prompt should surface
    // (accepted_*_version doesn't match the current constants).
    prompt_reaccept: versionStale,
  };

  return Response.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
