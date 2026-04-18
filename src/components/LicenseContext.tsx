// LicenseContext — client-side scattered-check #5 (spec §9.2, point #5).
// Fetches GET /api/license/status once at app mount, caches locally, and
// re-fetches when the server signals a state change via X-Adbot-License-
// State response headers OR when fetch interceptor sees 402 license_required.
//
// 4-phase lifecycle post-B29 lockdown:
//   active     → normal render, no banner
//   warning    → yellow banner, countdown (7d before cutoff)
//   degrade    → orange banner, mutations disabled (read-only window)
//   hard_block → full-page HardBlock screen, route locked to /settings/license
//   misconfigured → red "setup license" nudge, route locked to /settings/license

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type LicenseStatus =
  | 'active'
  | 'warning'
  | 'degrade'
  | 'hard_block'
  | 'misconfigured'
  | 'loading'
  | 'error';

export type LicenseMode = 'active' | 'read_only' | 'blocked';

export interface LicenseBannerCopy {
  en: string;
  th: string;
}

export interface LicenseConfig {
  has_jwt: boolean;
  domain: string | null;
  brain_url: string | null;
  anthropic_key_configured: boolean;
  terms_accepted?: boolean;
  accepted_at?: number | null;
  accepted_tos_version?: string | null;
  accepted_dpa_version?: string | null;
  // Current server-side versions (from functions/_lib/legal-versions.ts).
  // UI reads these instead of hardcoding so a legal-version bump on the
  // server surfaces automatically without a client redeploy.
  current_tos_version?: string | null;
  current_dpa_version?: string | null;
  prompt_reaccept?: boolean;
}

export interface LicenseState {
  status: LicenseStatus;
  mode?: LicenseMode;
  tier?: string;
  seats?: number;
  expires_at?: number;
  warning?: string;
  days_remaining?: number;
  days_remaining_hard?: number;
  grace_until?: number;
  revoked_reason?: string;
  banner?: LicenseBannerCopy;
  config?: LicenseConfig;
  error?: string;
}

interface LicenseContextValue extends LicenseState {
  refresh: () => Promise<void>;
  /** Feature gate — returns true if the license allows a given feature tag.
   *  Matches license-guard.requireLicense semantics on the server. */
  allows: (feature: string) => boolean;
  /** True when mutations should be disabled (degrade/hard_block/misconfigured). */
  readOnly: boolean;
  /** True when the app should render HardBlock/setup instead of the normal shell. */
  blocked: boolean;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

const CLIENT_REFRESH_MS = 15 * 60 * 1000;  // 15 min

// Fetch interceptor — monkey-patches window.fetch once per provider mount so
// ANY 402 license_required anywhere in the app can trigger a license refresh.
// Keeps the Context always in sync with what middleware is saying without
// requiring every fetch call site to know about license state.
function installFetchInterceptor(onLicense402: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as Window & { __adbot_license_fetch_installed?: boolean };
  if (w.__adbot_license_fetch_installed) return () => {};
  w.__adbot_license_fetch_installed = true;

  const original = window.fetch;
  window.fetch = async function (input, init) {
    const res = await original.call(this, input, init);
    if (res.status === 402) {
      try {
        const cloned = res.clone();
        const body = await cloned.json().catch(() => null);
        if (body && (body as { error?: string }).error === 'license_required') {
          onLicense402();
        }
      } catch { /* ignore — don't break the original response */ }
    }
    return res;
  };

  return () => {
    window.fetch = original;
    w.__adbot_license_fetch_installed = false;
  };
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LicenseState>({ status: 'loading' });
  const features = useRef<string[] | null>(null);
  const refreshing = useRef(false);

  const fetchStatus = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const res = await fetch('/api/license/status', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      // 402 should never come from /api/license/status itself (whitelist path)
      // but if it does, treat as unconfigured. 401/503/5xx we log via state.
      if (!res.ok && res.status !== 401 && res.status !== 503) {
        throw new Error(`status_http_${res.status}`);
      }
      const body = (await res.json()) as LicenseState & { features?: string[] };
      features.current = body.features ?? null;
      setState({
        status: body.status as LicenseStatus,
        mode: body.mode,
        tier: body.tier,
        seats: body.seats,
        expires_at: body.expires_at,
        warning: body.warning,
        days_remaining: body.days_remaining,
        days_remaining_hard: body.days_remaining_hard,
        grace_until: body.grace_until,
        revoked_reason: body.revoked_reason,
        banner: body.banner,
        config: body.config,
      });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = window.setInterval(fetchStatus, CLIENT_REFRESH_MS);
    const uninstall = installFetchInterceptor(() => {
      // Debounce — a burst of 402s from parallel mutations shouldn't hammer
      // /api/license/status. refreshing ref ensures one in-flight at a time.
      fetchStatus();
    });
    return () => {
      window.clearInterval(id);
      uninstall();
    };
  }, [fetchStatus]);

  const allows = useCallback((feature: string) => {
    if (!features.current) return state.status === 'active' || state.status === 'warning';
    return features.current.includes('all') || features.current.includes(feature);
  }, [state.status]);

  const readOnly = state.status === 'degrade' || state.status === 'hard_block' || state.status === 'misconfigured';
  // blocked = full-page HardBlock takeover. misconfigured is a soft-nudge
  // banner instead (setup flow must be reachable without the HardBlock in
  // the way — LicenseSetup can't run if HardBlock replaces its route).
  const blocked = state.status === 'hard_block';

  const value = useMemo<LicenseContextValue>(
    () => ({ ...state, refresh: fetchStatus, allows, readOnly, blocked }),
    [state, fetchStatus, allows, readOnly, blocked],
  );

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense(): LicenseContextValue {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    throw new Error('useLicense must be used inside <LicenseProvider>');
  }
  return ctx;
}
