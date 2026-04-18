import { useCallback, useEffect, useState } from 'react';

const MOCK_MODE = true;

export type AiManagedStatus = 'idle' | 'active' | 'stopped';
export type AiManagedRuleRole = 'scale_up' | 'scale_down' | 'pause' | 'clone' | 'freq_fatigue' | 'hook_fatigue';
export type DecisionReasonCode =
  | 'pause_low_roas'
  | 'scale_up'
  | 'clone_winner'
  | 'cooldown'
  | 'pause_outside_window'
  | 'auto_pause_no_purchase'
  | 'creative_fatigue'
  | 'hook_rate_alert'
  | 'hits_cap'
  | 'below_min_purchases';

export interface AiManagedConfig {
  id: string;
  account_id: string;
  is_active: 0 | 1;
  product_aov: number;
  margin_pct: number;
  daily_spend_cap: number | null;
  created_at: string;
  selected_campaign_ids: string[] | null;
}

export interface AiManagedFeatureToggle {
  slug: string;
  enabled: boolean;
  settings: Record<string, string | number | boolean>;
}

export interface AiManagedRuleRef {
  id: string;
  ai_managed_role: AiManagedRuleRole;
  is_active: 0 | 1;
}

export interface AiManagedTodayStats {
  spend: number;
  cap: number | null;
  roas: number;
  roas_delta_pct: number;
  purchases: number;
  revenue: number;
  actions_count: number;
}

export interface AiManagedActiveCampaign {
  id: string;
  name: string;
  budget: number;
  roas: number;
  purchases: number;
  status: 'scaling' | 'paused' | 'cooldown' | 'clone_pending';
  status_label: string;
  extra?: string;
}

export interface AiManagedDecision {
  id: string;
  executed_at: string;
  reason_code: DecisionReasonCode;
  reason_human: string;
  campaign_name: string;
  action_verb: string;
  icon: string;
  highlight?: 'violet' | null;
  cta?: { label: string; action: 'activate_clone' | 'view_detail' | 'undo' };
}

export interface AiManagedState {
  status: AiManagedStatus;
  config: AiManagedConfig | null;
  rules: AiManagedRuleRef[];
  today: AiManagedTodayStats;
  active_campaigns: AiManagedActiveCampaign[];
  decisions: AiManagedDecision[];
  started_at: string | null;
  stopped_at: string | null;
}

const nowMinus = (mins: number) => new Date(Date.now() - mins * 60 * 1000).toISOString();

function buildMockState(): AiManagedState {
  return {
    status: 'active',
    config: {
      id: 'mock-ai-1',
      account_id: 'act_mock',
      is_active: 1,
      product_aov: 290,
      margin_pct: 0.6,
      daily_spend_cap: 1500,
      created_at: nowMinus(134),
      selected_campaign_ids: null,
    },
    rules: [
      { id: 'r1', ai_managed_role: 'scale_up', is_active: 1 },
      { id: 'r2', ai_managed_role: 'scale_down', is_active: 1 },
      { id: 'r3', ai_managed_role: 'pause', is_active: 1 },
      { id: 'r4', ai_managed_role: 'clone', is_active: 1 },
      { id: 'r5', ai_managed_role: 'freq_fatigue', is_active: 1 },
      { id: 'r6', ai_managed_role: 'hook_fatigue', is_active: 1 },
    ],
    today: {
      spend: 845,
      cap: 1500,
      roas: 2.4,
      roas_delta_pct: 20,
      purchases: 7,
      revenue: 2030,
      actions_count: 5,
    },
    active_campaigns: [
      { id: 'c1', name: 'Live ขายของ — เสื้อยืด', budget: 230, roas: 3.2, purchases: 4, status: 'scaling', status_label: 'กำลัง scale' },
      { id: 'c2', name: 'Carousel ใหม่ (Clone LAL 1%)', budget: 100, roas: 0, purchases: 0, status: 'clone_pending', status_label: 'PAUSED', extra: 'เพิ่งสร้าง · รอเปิด' },
      { id: 'c3', name: 'Test A — Hook video', budget: 180, roas: 0, purchases: 0, status: 'cooldown', status_label: 'พัก', extra: 'resume 16:10' },
    ],
    decisions: [
      {
        id: 'd1',
        executed_at: nowMinus(12),
        reason_code: 'pause_low_roas',
        reason_human: 'ROAS 1.5 ต่ำกว่าเป้า 2.0',
        campaign_name: 'Promo สีน้ำเงิน',
        action_verb: 'ปิดแอด',
        icon: '⏸',
      },
      {
        id: 'd2',
        executed_at: nowMinus(26),
        reason_code: 'scale_up',
        reason_human: 'ROAS 3.2 สูงกว่าเป้า · ฿200→฿230',
        campaign_name: 'Live ขายของ',
        action_verb: 'เพิ่มงบ 15%',
        icon: '📈',
      },
      {
        id: 'd3',
        executed_at: nowMinus(59),
        reason_code: 'clone_winner',
        reason_human: 'ROAS > 4.0 ติด 3 วัน · ad set ใหม่ PAUSED รอเปิด',
        campaign_name: 'Carousel',
        action_verb: 'Clone → LAL 1%',
        icon: '✨',
        highlight: 'violet',
        cta: { label: 'เปิดใช้งาน', action: 'activate_clone' },
      },
      {
        id: 'd4',
        executed_at: nowMinus(154),
        reason_code: 'cooldown',
        reason_human: 'Cooldown หลังปรับงบ กันตัดสินใจซ้ำ',
        campaign_name: 'Test A',
        action_verb: 'พัก 4 ชม.',
        icon: '⏰',
      },
      {
        id: 'd5',
        executed_at: nowMinus(214),
        reason_code: 'hook_rate_alert',
        reason_human: 'Hook rate 12% ต่ำกว่า 15% (creative อาจล้า)',
        campaign_name: 'Vid B',
        action_verb: 'แจ้งเตือน',
        icon: '🔔',
      },
    ],
    started_at: nowMinus(134),
    stopped_at: null,
  };
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useAiManaged(accountId: string) {
  const [state, setState] = useState<AiManagedState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (MOCK_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        setState(buildMockState());
      } else {
        const data = await fetchJson<AiManagedState>(`/api/ai-managed?account_id=${encodeURIComponent(accountId)}`);
        setState(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!state || state.status !== 'active') return;
    const id = setInterval(() => {
      load();
    }, 30_000);
    return () => clearInterval(id);
  }, [state?.status, load]);

  const configure = useCallback(
    async (payload: { product_aov: number; margin_pct: number; daily_spend_cap: number | null }) => {
      if (MOCK_MODE) {
        await new Promise((r) => setTimeout(r, 300));
        const mock = buildMockState();
        mock.config = {
          ...mock.config!,
          product_aov: payload.product_aov,
          margin_pct: payload.margin_pct,
          daily_spend_cap: payload.daily_spend_cap,
          created_at: new Date().toISOString(),
          selected_campaign_ids: null,
        };
        mock.today = { ...mock.today, spend: 0, purchases: 0, revenue: 0, actions_count: 0, roas: 0, roas_delta_pct: 0, cap: payload.daily_spend_cap };
        mock.started_at = new Date().toISOString();
        mock.decisions = [];
        mock.active_campaigns = [];
        setState(mock);
        return;
      }
      await fetchJson(`/api/ai-managed/configure`, {
        method: 'POST',
        body: JSON.stringify({ account_id: accountId, ...payload }),
      });
      await load();
    },
    [accountId, load]
  );

  const stop = useCallback(async () => {
    setState((prev) => (prev ? { ...prev, status: 'stopped', stopped_at: new Date().toISOString() } : prev));
    if (MOCK_MODE) return;
    try {
      await fetchJson(`/api/ai-managed/stop`, { method: 'POST', body: JSON.stringify({ account_id: accountId }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stop failed');
      await load();
    }
  }, [accountId, load]);

  const resume = useCallback(async () => {
    setState((prev) => (prev ? { ...prev, status: 'active', stopped_at: null } : prev));
    if (MOCK_MODE) return;
    try {
      await fetchJson(`/api/ai-managed/resume`, { method: 'POST', body: JSON.stringify({ account_id: accountId }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resume failed');
      await load();
    }
  }, [accountId, load]);

  const updateConfig = useCallback(
    async (patch: Partial<{ product_aov: number; margin_pct: number; daily_spend_cap: number | null; selected_campaign_ids: string[] | null }>) => {
      setState((prev) => (prev && prev.config ? { ...prev, config: { ...prev.config, ...patch } } : prev));
      if (MOCK_MODE) return;
      try {
        await fetchJson(`/api/ai-managed`, {
          method: 'PUT',
          body: JSON.stringify({ account_id: accountId, ...patch }),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Update failed');
        await load();
      }
    },
    [accountId, load]
  );

  const reset = useCallback(async () => {
    setState((prev) => (prev ? { ...prev, status: 'idle', config: null, started_at: null, stopped_at: null, decisions: [], active_campaigns: [] } : prev));
    if (MOCK_MODE) return;
    try {
      await fetchJson(`/api/ai-managed`, {
        method: 'DELETE',
        body: JSON.stringify({ account_id: accountId }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
      await load();
    }
  }, [accountId, load]);

  return { state, loading, error, configure, stop, resume, updateConfig, reset, reload: load, mockMode: MOCK_MODE };
}

export const MOCK_CAMPAIGNS: { id: string; name: string; status: 'ACTIVE' | 'PAUSED' }[] = [
  { id: 'cmp_1', name: 'Live ขายของ — เสื้อยืด', status: 'ACTIVE' },
  { id: 'cmp_2', name: 'Carousel ใหม่ (Clone LAL 1%)', status: 'ACTIVE' },
  { id: 'cmp_3', name: 'Test A — Hook video', status: 'ACTIVE' },
  { id: 'cmp_4', name: 'Promo สีน้ำเงิน', status: 'PAUSED' },
  { id: 'cmp_5', name: 'Retarget — cart abandon', status: 'ACTIVE' },
  { id: 'cmp_6', name: 'Brand awareness Q2', status: 'ACTIVE' },
];

export function formatDuration(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} นาที`;
  const hrs = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (hrs < 24) return `${hrs} ชม. ${remMin} นาที`;
  const days = Math.floor(hrs / 24);
  return `${days} วัน ${hrs % 24} ชม.`;
}

export function formatClockTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
