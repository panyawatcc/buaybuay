import { useState, useCallback, useEffect } from 'react';
import type {
  Campaign as SharedCampaign,
  AdSet as SharedAdSet,
  Ad as SharedAd,
  Insights,
  SummaryResponse,
  Rule as SharedRule,
  BotAction as SharedBotAction,
  NotificationSettings as SharedNotifSettings,
  CampaignsResponse,
  AdSetsResponse,
  AdsResponse,
} from '../shared/types';

/**
 * FB OAuth login/disconnect (redirect-based).
 * Token no longer stored in localStorage — server-side only.
 */
export function useFacebookToken() {
  const login = useCallback(() => {
    window.location.href = '/api/auth/facebook';
  }, []);

  const logout = useCallback(() => {
    // Clear legacy localStorage entries
    localStorage.removeItem('fb_access_token');
    localStorage.removeItem('fb_token_expires_at');
  }, []);

  return { login, logout };
}

// Real FB ad account IDs start with 'act_' — reject demo IDs like 'acc-001'
function isRealAccountId(id: string | null | undefined): id is string {
  return !!id && id.startsWith('act_');
}

async function fbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    credentials: 'include', // session cookie — server reads FB token from DB
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: { message?: string } }).error?.message || JSON.stringify(err));
  }

  return res.json() as Promise<T>;
}

export interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  amount_spent: string;
  balance: string;
  business_name?: string;
}

// Re-export shared Campaign type (single source of truth)
export type Campaign = SharedCampaign;

export function useAdAccounts(enabled: boolean) {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fbFetch<{ ad_accounts: AdAccount[]; role: string }>('/api/fb/ad-accounts');
      setAccounts(data.ad_accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) fetch_();
  }, [enabled, fetch_]);

  return { accounts, loading, error, refetch: fetch_ };
}

export function useCampaigns(enabled: boolean, accountId: string | null, options: { datePreset?: string; since?: string; until?: string } = {}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = { account_id: accountId };

      if (options.since && options.until) {
        params.since = options.since;
        params.until = options.until;
      } else if (options.datePreset) {
        params.date_preset = options.datePreset;
      }

      const data = await fbFetch<CampaignsResponse>('/api/fb/campaigns', params);
      setCampaigns(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId, options.datePreset, options.since, options.until]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { campaigns, loading, error, refetch: fetch_ };
}

export interface Insight {
  campaign_id?: string;
  campaign_name?: string;
  ad_id?: string;
  ad_name?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
}

export function useInsights(
  enabled: boolean,
  accountId: string | null,
  options: { datePreset?: string; since?: string; until?: string; level?: 'account' | 'campaign' | 'adset' | 'ad' } = {},
) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = { account_id: accountId };

      if (options.since && options.until) {
        params.since = options.since;
        params.until = options.until;
      } else if (options.datePreset) {
        params.date_preset = options.datePreset;
      }

      if (options.level) params.level = options.level;

      const data = await fbFetch<{ data: Insight[] }>('/api/fb/insights', params);
      setInsights(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId, options.datePreset, options.since, options.until, options.level]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { insights, loading, error, refetch: fetch_ };
}

// Re-export shared Ad type
export type AdCreative = SharedAd;

export function useAds(enabled: boolean, accountId: string | null, options: { datePreset?: string; since?: string; until?: string } = {}) {
  const [ads, setAds] = useState<AdCreative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { account_id: accountId };
      if (options.since && options.until) { params.since = options.since; params.until = options.until; }
      else if (options.datePreset) { params.date_preset = options.datePreset; }
      const data = await fbFetch<AdsResponse>('/api/fb/ads', params);
      setAds(data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId, options.datePreset, options.since, options.until]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { ads, loading, error, refetch: fetch_ };
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  actor: 'bot' | 'ai' | 'user';
  action: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'insight';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  campaignId?: string;
}

export interface AccountStat {
  id: string;
  name: string;
  spend: number;
  roas: number;
  results: number;
}

export function useAIInsights(enabled: boolean, accountId: string | null) {
  const [data, setData] = useState<{ recommendations: AIInsight[]; accountStats: AccountStat[] }>({ recommendations: [], accountStats: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fbFetch<{ recommendations: AIInsight[]; accountStats: AccountStat[] }>('/api/fb/ai-insights', { account_id: accountId });
      setData({
        recommendations: res.recommendations || [],
        accountStats: res.accountStats || [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { recommendations: data.recommendations, accountStats: data.accountStats, loading, error, refetch: fetch_ };
}

export function useActivities(enabled: boolean, accountId: string | null) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fbFetch<{ data: ActivityItem[] }>('/api/fb/activity', { account_id: accountId });
      setActivities(data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { activities, loading, error, refetch: fetch_ };
}

// --- B1-3: Insights Compare (real % change) ---

export interface InsightsCompare {
  current: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number; conversions: number; revenue: number; roas: number };
  previous: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number; conversions: number; revenue: number; roas: number };
  changes: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number; conversions: number; revenue: number; roas: number };
}

export function useInsightsCompare(
  enabled: boolean,
  accountId: string | null,
  options: { datePreset?: string; since?: string; until?: string } = {},
) {
  const [data, setData] = useState<InsightsCompare | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { account_id: accountId };
      if (options.since && options.until) {
        params.since = options.since;
        params.until = options.until;
      } else if (options.datePreset) {
        params.date_preset = options.datePreset;
      }
      const res = await fbFetch<InsightsCompare>('/api/fb/insights/compare', params);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId, options.datePreset, options.since, options.until]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

// --- B1-6: Pixel Status ---

export interface Pixel {
  id: string;
  name: string;
  isActive: boolean;
  lastFiredTime: string | null;
  eventCount: number;
}

export interface PixelsResponse {
  pixels: Pixel[];
  hasActivePixel: boolean;
  conversionEvents: string[];
}

export function usePixels(enabled: boolean, accountId: string | null) {
  const [data, setData] = useState<PixelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fbFetch<PixelsResponse>('/api/fb/pixels', { account_id: accountId });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

// --- B2-3: Audience Insights ---

export interface AudienceSegment {
  age: string;
  gender: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface AudienceResponse {
  data: AudienceSegment[];
  summary: { topAge: string; topGender: string; topCountry: string };
}

export function useAudience(
  enabled: boolean,
  accountId: string | null,
  options: { datePreset?: string; since?: string; until?: string; breakdowns?: string } = {},
) {
  const [data, setData] = useState<AudienceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { account_id: accountId };
      if (options.since && options.until) { params.since = options.since; params.until = options.until; }
      else if (options.datePreset) { params.date_preset = options.datePreset; }
      if (options.breakdowns) params.breakdowns = options.breakdowns;
      const res = await fbFetch<AudienceResponse>('/api/fb/audience', params);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId, options.datePreset, options.since, options.until, options.breakdowns]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { audience: data, audienceLoading: loading, audienceError: error, refetchAudience: fetch_ };
}

// --- B2-5: Bot Actions ---

export type BotAction = SharedBotAction;

export function useBotActions(enabled: boolean, accountId: string | null, page = 1) {
  const [actions, setActions] = useState<BotAction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fbFetch<{ actions: BotAction[]; total: number }>('/api/bot/actions', {
        account_id: accountId, page: String(page), limit: '20',
      });
      setActions(res.actions || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId, page]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  const undoAction = useCallback(async (actionId: string) => {
    const res = await window.fetch(`/api/bot/actions/${actionId}/undo`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Undo failed');
    const json = await res.json() as { success: boolean };
    if (json.success) fetch_();
    return json;
  }, [fetch_]);

  return { actions, total, loading, error, refetch: fetch_, undoAction };
}

// --- B2-6: Notification Settings ---

export type NotifSettings = SharedNotifSettings;

export function useNotificationSettings(enabled: boolean) {
  const [settings, setSettings] = useState<NotifSettings>({ budgetChange: true, ruleTriggered: true, dailySummary: true, telegramAlerts: true, telegramDailySummary: true, pushAlerts: true, pushDailySummary: false });
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fbFetch<NotifSettings>('/api/notifications/settings');
      setSettings(res);
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { if (enabled) fetch_(); }, [enabled, fetch_]);

  const update = useCallback(async (patch: Partial<NotifSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await window.fetch('/api/notifications/settings', {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
  }, [settings]);

  return { settings, loading, update, refetch: fetch_ };
}

// --- B3: Rules CRUD ---

// Re-export shared Rule type
export type Rule = SharedRule;

export function useRules(enabled: boolean, accountId: string | null) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fbFetch<{ rules: Rule[] }>('/api/rules', { account_id: accountId });
      setRules(res.rules || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  const createRule = useCallback(async (body: Omit<Rule, 'id' | 'createdAt' | 'lastTriggeredAt' | 'updatedAt'>) => {
    const res = await window.fetch('/api/rules', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to create rule');
    const json = await res.json();
    fetch_();
    return json;
  }, [fetch_]);

  const updateRule = useCallback(async (id: string, body: Partial<Rule>) => {
    const res = await window.fetch(`/api/rules/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to update rule');
    fetch_();
  }, [fetch_]);

  const deleteRule = useCallback(async (id: string) => {
    const res = await window.fetch(`/api/rules/${id}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete rule');
    fetch_();
  }, [fetch_]);

  const toggleRule = useCallback(async (id: string, isActive: boolean) => {
    await updateRule(id, { isActive });
  }, [updateRule]);

  return { rules, loading, error, refetch: fetch_, createRule, updateRule, deleteRule, toggleRule };
}

// --- B3: Rule History ---

export interface RuleExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  evaluatedAt: string;
  triggered: boolean;
  currentValue: number;
  threshold: number;
  actionTaken: string;
  campaignName: string;
  previousBudget: number;
  newBudget: number;
  undone: boolean;
}

export function useRuleHistory(enabled: boolean, accountId: string | null, ruleId?: string, page = 1) {
  const [executions, setExecutions] = useState<RuleExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { account_id: accountId, page: String(page), limit: '50' };
      if (ruleId) params.rule_id = ruleId;
      const res = await fbFetch<{ executions: RuleExecution[]; total: number }>('/api/rules/history', params);
      setExecutions(res.executions || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId, ruleId, page]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { executions, total, loading, error, refetch: fetch_ };
}

// --- B4: Telegram Status + Connect/Disconnect ---

export interface TelegramStatus {
  connected: boolean;
  botUsername: string | null;
  chatId: string | null;
  lastMessageAt: string | null;
}

export function useTelegramStatus(enabled: boolean) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fbFetch<TelegramStatus>('/api/telegram/status');
      setStatus(res);
    } catch {
      setStatus({ connected: false, botUsername: null, chatId: null, lastMessageAt: null });
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { if (enabled) fetch_(); }, [enabled, fetch_]);

  const connect = useCallback(async (botToken: string) => {
    const res = await window.fetch('/api/telegram/connect', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken }),
    });
    if (!res.ok) throw new Error('Connect failed');
    return res.json();
  }, []);

  const disconnect = useCallback(async () => {
    const res = await window.fetch('/api/telegram/disconnect', {
      method: 'DELETE', credentials: 'include',
    });
    if (!res.ok) throw new Error('Disconnect failed');
    return res.json();
  }, []);

  return { status, loading, connect, disconnect, refetch: fetch_ };
}

// --- GAPS: Display Settings (currency) ---

export { type DisplaySettings } from '../utils/currency';
import { loadDisplaySettings, saveDisplaySettings, type DisplaySettings } from '../utils/currency';

export function useDisplaySettings() {
  const [settings, setSettingsState] = useState<DisplaySettings>(loadDisplaySettings);

  const updateSettings = useCallback((patch: Partial<DisplaySettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveDisplaySettings(next);
      return next;
    });
  }, []);

  return { displaySettings: settings, updateDisplaySettings: updateSettings };
}

// --- CPO: Ad Sets + Summary ---

// Re-export shared types
export type AdSetRow = SharedAdSet;
export type InsightsRow = Insights;

export type SummaryData = SummaryResponse;

export function useAdSets(enabled: boolean, accountId: string | null, options: { datePreset?: string; since?: string; until?: string; campaignId?: string } = {}) {
  const [adsets, setAdsets] = useState<AdSetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { account_id: accountId };
      if (options.since && options.until) { params.since = options.since; params.until = options.until; }
      else if (options.datePreset) { params.date_preset = options.datePreset; }
      if (options.campaignId) params.campaign_id = options.campaignId;
      const res = await fbFetch<AdSetsResponse>('/api/fb/adsets', params);
      setAdsets(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, accountId, options.datePreset, options.since, options.until, options.campaignId]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { adsets, loading, error, refetch: fetch_ };
}

export function useSummary(enabled: boolean, accountId: string | null, options: { datePreset?: string; since?: string; until?: string } = {}) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!enabled || !isRealAccountId(accountId)) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { account_id: accountId };
      if (options.since && options.until) { params.since = options.since; params.until = options.until; }
      else if (options.datePreset) { params.date_preset = options.datePreset; }
      const res = await fbFetch<SummaryData>('/api/fb/summary', params);
      setData(res);
    } catch { /* graceful */ }
    finally { setLoading(false); }
  }, [enabled, accountId, options.datePreset, options.since, options.until]);

  useEffect(() => {
    if (enabled && isRealAccountId(accountId)) fetch_();
  }, [enabled, accountId, fetch_]);

  return { data, loading, refetch: fetch_ };
}

// --- B5: Team Management ---

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  name: string | null;
  role: string;
  inviteLink: string;
  expiresAt: string;
  createdAt: string;
}

export function useTeamMembers(enabled: boolean) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fbFetch<{ members: TeamMember[] }>('/api/team/members');
      setMembers(res.members || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { if (enabled) fetch_(); }, [enabled, fetch_]);

  const changeRole = useCallback(async (id: string, role: string) => {
    await window.fetch(`/api/team/members/${id}/role`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    fetch_();
  }, [fetch_]);

  const removeMember = useCallback(async (id: string) => {
    await window.fetch(`/api/team/members/${id}`, { method: 'DELETE', credentials: 'include' });
    fetch_();
  }, [fetch_]);

  return { members, loading, error, refetch: fetch_, changeRole, removeMember };
}

export function useTeamInvites(enabled: boolean) {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fbFetch<{ invites: TeamInvite[] }>('/api/team/invites');
      setInvites(res.invites || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [enabled]);

  useEffect(() => { if (enabled) fetch_(); }, [enabled, fetch_]);

  const createInvite = useCallback(async (data: { email: string; name: string; role: string }) => {
    const res = await window.fetch('/api/team/invite', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Invite failed');
    const json = await res.json();
    fetch_();
    return json as { inviteId: string; inviteLink: string };
  }, [fetch_]);

  const cancelInvite = useCallback(async (id: string) => {
    await window.fetch(`/api/team/invites/${id}`, { method: 'DELETE', credentials: 'include' });
    fetch_();
  }, [fetch_]);

  return { invites, loading, refetch: fetch_, createInvite, cancelInvite };
}
