import { useCallback, useEffect, useState } from 'react';

const MOCK_MODE = true;

export type OnboardingStep = 'verify_fb_access' | 'select_ad_account' | 'complete';
export type TeamRole = 'Owner' | 'Member';
export type PlanKey = 'free' | 'pro';

export interface PortalCompany {
  name: string;
  email: string;
  phone: string | null;
}

export interface PortalPlan {
  key: PlanKey;
  trial_days_remaining: number | null;
  spend_limit: number;
  spend_used: number;
  team_limit: number;
}

export interface PortalAdAccount {
  id: string;
  account_id: string;
  account_name: string;
  currency: string;
  status: 'active' | 'pending' | 'revoked';
  spend_30d: number;
  roas: number;
  active_ads: number;
  is_primary: boolean;
}

export interface PortalTeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  invited_at?: string;
}

export interface PortalNotifications {
  email_summary: boolean;
  line_notify: boolean;
}

export interface PortalState {
  company: PortalCompany;
  plan: PortalPlan;
  ad_accounts: PortalAdAccount[];
  team: PortalTeamMember[];
  notifications: PortalNotifications;
  admin_business_id: string;
  admin_system_user_id: string;
  onboarding_step: OnboardingStep;
}

const DEFAULT_STATE: PortalState = {
  company: { name: 'เสื้อยืด Cool Co.', email: 'owner@coolco.com', phone: '081-234-5678' },
  plan: {
    key: 'free',
    trial_days_remaining: 28,
    spend_limit: 100_000,
    spend_used: 42_000,
    team_limit: 3,
  },
  ad_accounts: [
    {
      id: '1',
      account_id: 'act_1234567890123456',
      account_name: 'เสื้อยืด Cool Co.',
      currency: 'THB',
      status: 'active',
      spend_30d: 42_000,
      roas: 2.4,
      active_ads: 8,
      is_primary: true,
    },
    {
      id: '2',
      account_id: 'act_9999888877776666',
      account_name: 'Cool Co. Summer Campaign',
      currency: 'THB',
      status: 'active',
      spend_30d: 18_500,
      roas: 1.9,
      active_ads: 4,
      is_primary: false,
    },
  ],
  team: [
    { id: 'u1', email: 'owner@coolco.com', name: 'คุณกอล์ฟ', role: 'Owner' },
    { id: 'u2', email: 'anna@coolco.com', name: 'คุณแอนนา', role: 'Member' },
  ],
  notifications: { email_summary: true, line_notify: false },
  admin_business_id: '1234567890123456',
  admin_system_user_id: 'act_9876543210987654',
  onboarding_step: 'complete',
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function usePortal() {
  const [state, setState] = useState<PortalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (MOCK_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        setState(DEFAULT_STATE);
      } else {
        const data = await fetchJson<PortalState>('/api/portal/me');
        setState(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateCompany = useCallback(
    async (patch: Partial<PortalCompany>) => {
      setState((prev) => (prev ? { ...prev, company: { ...prev.company, ...patch } } : prev));
      if (MOCK_MODE) return;
      await fetchJson('/api/portal/me', { method: 'PATCH', body: JSON.stringify(patch) });
    },
    []
  );

  const updateNotifications = useCallback(
    async (patch: Partial<PortalNotifications>) => {
      setState((prev) => (prev ? { ...prev, notifications: { ...prev.notifications, ...patch } } : prev));
      if (MOCK_MODE) return;
      await fetchJson('/api/portal/notifications', { method: 'PATCH', body: JSON.stringify(patch) });
    },
    []
  );

  const setPrimaryAccount = useCallback(async (accountId: string) => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            ad_accounts: prev.ad_accounts.map((a) => ({ ...a, is_primary: a.id === accountId })),
          }
        : prev
    );
    if (MOCK_MODE) return;
    await fetchJson(`/api/portal/ad-accounts/${accountId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_primary: true }),
    });
  }, []);

  const inviteMember = useCallback(
    async (email: string, role: TeamRole = 'Member') => {
      const mock: PortalTeamMember = {
        id: `u${Date.now()}`,
        email,
        name: email.split('@')[0],
        role,
        invited_at: new Date().toISOString(),
      };
      setState((prev) => (prev ? { ...prev, team: [...prev.team, mock] } : prev));
      if (MOCK_MODE) return;
      await fetchJson('/api/portal/team/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
    },
    []
  );

  const removeMember = useCallback(async (userId: string) => {
    setState((prev) => (prev ? { ...prev, team: prev.team.filter((m) => m.id !== userId) } : prev));
    if (MOCK_MODE) return;
    await fetchJson(`/api/portal/team/${userId}`, { method: 'DELETE' });
  }, []);

  return {
    state,
    loading,
    error,
    reload: load,
    updateCompany,
    updateNotifications,
    setPrimaryAccount,
    inviteMember,
    removeMember,
    mockMode: MOCK_MODE,
  };
}

// ----- Onboarding-only helpers (mock) -----

export interface VerifyAccessResult {
  ad_accounts_count: number;
  ad_accounts: PortalAdAccount[];
}

export function useOnboarding() {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyAccess = useCallback(async (): Promise<VerifyAccessResult> => {
    setVerifying(true);
    setError(null);
    try {
      if (MOCK_MODE) {
        await new Promise((r) => setTimeout(r, 1400));
        return { ad_accounts_count: 2, ad_accounts: DEFAULT_STATE.ad_accounts };
      }
      const res = await fetchJson<VerifyAccessResult>('/api/onboarding/verify-access', {
        method: 'POST',
      });
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verify failed';
      setError(msg);
      throw e;
    } finally {
      setVerifying(false);
    }
  }, []);

  return { verifyAccess, verifying, error };
}

export function formatBaht(n: number): string {
  return `฿${n.toLocaleString('en-US')}`;
}

export { DEFAULT_STATE as MOCK_PORTAL_STATE };
