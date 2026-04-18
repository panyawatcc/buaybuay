/**
 * Shared types for Facebook Ad Scaler — used by both backend (functions/) and frontend (src/).
 * Single source of truth for API response shapes.
 */

// --- Insights (computed from Facebook API) ---

export interface Insights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  frequency: number;
  results: number;
  resultType: string | null;       // 'messages' | 'purchases' | 'leads' | 'link_clicks' | 'other'
  costPerResult: number;
  roas: number;
  purchases: number;
  revenue: number;
  costPerPurchase: number;
  messages: number;
  costPerMessage: number;
  messagingActionType: string | null;
}

// --- Campaign ---

export interface Campaign {
  id: string;
  name: string;
  status: string;                  // ACTIVE | PAUSED | CAMPAIGN_PAUSED | ARCHIVED
  objective: string;               // OUTCOME_SALES | OUTCOME_ENGAGEMENT | MESSAGES | etc.
  dailyBudget: number;
  lifetimeBudget: number;
  startTime: string | null;
  createdTime: string | null;
  insights: Insights | null;
}

// --- Ad Set ---

export interface AdSet {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  dailyBudget: number;
  optimizationGoal: string | null;
  startTime: string | null;
  endTime: string | null;
  insights: Insights | null;
}

// --- Ad ---

export interface Creative {
  id: string;
  name: string | null;
  title: string | null;
  body: string | null;
  thumbnailUrl: string | null;
  callToAction: string | null;
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  adsetId: string;
  creative: Creative | null;
  createdTime: string | null;
  insights: Insights | null;
}

// --- Summary ---

export interface AccountInfo {
  currency: string;               // USD | THB | etc.
  timezone: string | null;        // Asia/Bangkok
  timezoneOffset: number | null;
}

export interface SummaryResponse {
  summary: Insights;
  account: AccountInfo;
  counts: {
    campaigns: number;
    adsets: number;
    ads: number;
  };
}

// --- Date Range ---

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_3d'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'last_90d'
  | 'this_month'
  | 'last_month';

export interface DateRange {
  preset: DatePreset | null;
  since: string | null;           // YYYY-MM-DD
  until: string | null;           // YYYY-MM-DD
}

// --- API List Responses ---

export interface CampaignsResponse {
  data: Campaign[];
}

export interface AdSetsResponse {
  data: AdSet[];
}

export interface AdsResponse {
  data: Ad[];
}

// --- Creative Detail (from /api/fb/ads/:id/creative) ---

export interface CreativeDetail {
  adId: string;
  adName: string;
  status: string;
  postUrl: string | null;
  previewHtml: string | null;
  creative: {
    id: string;
    name: string | null;
    title: string | null;
    body: string | null;
    imageUrl: string;              // proxy URL
    imageUrlDirect: string | null; // FB CDN (may 403)
    thumbnailUrl: string | null;
    videoThumbnailUrl: string | null;
    videoId: string | null;
    callToAction: string | null;
    link: string | null;
  } | null;
}

// --- Rules ---

export interface RuleCondition {
  metric: string;                 // roas | cpa | ctr | spend | conversions | cpc
  operator: string;               // gt | lt | gte | lte | eq
  value: number;
  period: string;                 // last_7d | last_14d | etc.
}

export interface RuleAction {
  type: string;                   // budget_increase | budget_decrease | pause | enable
  value: number;
  unit: string;                   // percent | fixed
  maxBudget: number | null;
}

export interface Rule {
  id: string;
  name: string;
  accountId: string;
  campaignIds: string[] | null;
  isActive: boolean;
  condition: RuleCondition;
  action: RuleAction;
  cooldownHours: number;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Bot Actions ---

export interface BotAction {
  id: string;
  ruleId: string | null;
  ruleName: string | null;
  campaignId: string;
  campaignName: string | null;
  actionType: string;
  previousValue: number;
  newValue: number;
  changePercent: number;
  executedAt: string;
  canUndo: boolean;
}

// --- Notification Settings ---

export interface NotificationSettings {
  budgetChange: boolean;
  ruleTriggered: boolean;
  dailySummary: boolean;
  telegramAlerts: boolean;
  telegramDailySummary: boolean;
  pushAlerts: boolean;
  pushDailySummary: boolean;
}

// --- Display Settings ---

export interface DisplaySettings {
  currency: string;               // USD | THB
  exchangeRate: number;
  showOriginalCurrency: boolean;
}

// --- User / Auth ---

export type Role = 'admin' | 'manager' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  fbConnected?: boolean;
  fbTokenExpiresAt?: number | null;
}
