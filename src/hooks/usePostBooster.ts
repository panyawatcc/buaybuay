import { useCallback, useEffect, useState } from 'react';

const MOCK_MODE = true;

export interface FbPage {
  id: string;
  name: string;
  avatar: string;
  followers: number;
  posts_90d: number;
}

export interface PostSummary {
  post_id: string;
  page_id: string;
  message: string;
  created_time: string;
  type: 'photo' | 'video' | 'carousel' | 'text' | 'reels';
  age_days: number;
  engagement: { likes: number; comments: number; shares: number; total: number };
  ai_badge?: string;
  thumb_emoji: string;
}

export interface TargetingSuggestion {
  regions: string[];
  age_min: number;
  age_max: number;
  gender: 'all' | 'male' | 'female';
  interests: string[];
  estimated_reach: { min: number; max: number };
}

export interface BoosterCampaign {
  job_id: string;
  keyword: string;
  posts_count: number;
  status: 'active' | 'paused' | 'ended';
  launched_at: string;
  completes_at: string;
  daily_budget: number;
  duration_days: number;
  metrics: {
    reach: number;
    engagement: number;
    orders: number;
    roas: number;
    spend: number;
  };
  post_thumb_emoji: string;
  post_title: string;
  copywriter_used: boolean;
}

export const REGION_OPTIONS = [
  { id: 'TH-central', label: 'กลาง', sub: 'กทม. + 7 จว.' },
  { id: 'TH-north', label: 'เหนือ', sub: '9 จว.' },
  { id: 'TH-isaan', label: 'อีสาน', sub: '20 จว.' },
  { id: 'TH-south', label: 'ใต้', sub: '14 จว.' },
];

export const MOCK_PAGES: FbPage[] = [
  { id: 'pg_1', name: 'เสื้อยืด Cool Co.', avatar: '👕', followers: 12400, posts_90d: 42 },
  { id: 'pg_2', name: 'กางเกง Casual TH', avatar: '👖', followers: 3800, posts_90d: 18 },
  { id: 'pg_3', name: 'รองเท้า StepUp', avatar: '👟', followers: 8900, posts_90d: 27 },
];

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();

function mockPostsFor(pageId: string, keyword: string): PostSummary[] {
  const base: PostSummary[] = [
    {
      post_id: 'post_a',
      page_id: pageId,
      message: 'รีวิวเสื้อยืดสีฟ้า — ใส่จริงตอนแดดร้อน 35° เหงื่อไม่ออกเลยค่ะ 💙',
      created_time: daysAgo(7),
      type: 'photo',
      age_days: 7,
      engagement: { likes: 248, comments: 32, shares: 18, total: 298 },
      ai_badge: '★ engagement +180% vs avg',
      thumb_emoji: '💙',
    },
    {
      post_id: 'post_b',
      page_id: pageId,
      message: 'รีวิวลูกค้าจริง — ใส่ติดต่อกัน 6 เดือน ยังเหมือนใหม่ 🔥',
      created_time: daysAgo(3),
      type: 'video',
      age_days: 3,
      engagement: { likes: 412, comments: 56, shares: 34, total: 502 },
      ai_badge: '⚡ video p25 = 42% (unicorn)',
      thumb_emoji: '🔥',
    },
    {
      post_id: 'post_c',
      page_id: pageId,
      message: 'คอลเลกชันใหม่ — สีพาสเทล 6 เฉด พร้อมส่ง ✨',
      created_time: daysAgo(14),
      type: 'carousel',
      age_days: 14,
      engagement: { likes: 156, comments: 21, shares: 9, total: 186 },
      thumb_emoji: '🎨',
    },
    {
      post_id: 'post_d',
      page_id: pageId,
      message: 'โปรโมชั่น 11.11 — ซื้อ 2 แถม 1 ถึงสิ้นเดือน',
      created_time: daysAgo(21),
      type: 'photo',
      age_days: 21,
      engagement: { likes: 320, comments: 44, shares: 26, total: 390 },
      ai_badge: '🔥 viral candidate',
      thumb_emoji: '🎁',
    },
    {
      post_id: 'post_e',
      page_id: pageId,
      message: 'How-to — วิธีเลือก size ให้ใส่สวย (4 ข้อ)',
      created_time: daysAgo(45),
      type: 'video',
      age_days: 45,
      engagement: { likes: 98, comments: 12, shares: 6, total: 116 },
      thumb_emoji: '📏',
    },
  ];
  if (!keyword.trim()) return base;
  return base.filter((p) => p.message.toLowerCase().includes(keyword.toLowerCase()));
}

function mockSuggestion(_postIds: string[]): TargetingSuggestion {
  return {
    regions: ['TH-central', 'TH-north'],
    age_min: 22,
    age_max: 45,
    gender: 'all',
    interests: ['เสื้อผ้าผู้หญิง', 'แฟชั่น summer', 'ช้อปปิ้งออนไลน์'],
    estimated_reach: { min: 2_400_000, max: 3_100_000 },
  };
}

function mockCampaigns(): BoosterCampaign[] {
  return [
    {
      job_id: 'job_1',
      keyword: 'รีวิว',
      posts_count: 2,
      status: 'active',
      launched_at: minsAgo(134),
      completes_at: daysAgo(-7),
      daily_budget: 500,
      duration_days: 7,
      metrics: { reach: 42_000, engagement: 1_200, orders: 14, roas: 3.1, spend: 450 },
      post_thumb_emoji: '💙',
      post_title: 'รีวิวเสื้อยืดสีฟ้า — ใส่จริงตอนแดดร้อน',
      copywriter_used: false,
    },
    {
      job_id: 'job_2',
      keyword: 'รีวิว',
      posts_count: 1,
      status: 'active',
      launched_at: minsAgo(58),
      completes_at: daysAgo(-14),
      daily_budget: 300,
      duration_days: 14,
      metrics: { reach: 12_500, engagement: 620, orders: 5, roas: 2.4, spend: 120 },
      post_thumb_emoji: '🔥',
      post_title: 'รีวิวลูกค้าจริง — ใส่ติดต่อกัน 6 เดือน',
      copywriter_used: true,
    },
    {
      job_id: 'job_3',
      keyword: 'โปรโมชั่น',
      posts_count: 1,
      status: 'ended',
      launched_at: daysAgo(10),
      completes_at: daysAgo(3),
      daily_budget: 400,
      duration_days: 7,
      metrics: { reach: 88_000, engagement: 3_400, orders: 42, roas: 4.2, spend: 2_800 },
      post_thumb_emoji: '🎁',
      post_title: 'โปรโมชั่น 11.11 — ซื้อ 2 แถม 1',
      copywriter_used: true,
    },
  ];
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function usePostBooster() {
  const [pages, setPages] = useState<FbPage[]>([]);
  const [campaigns, setCampaigns] = useState<BoosterCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      if (MOCK_MODE) {
        await new Promise((r) => setTimeout(r, 180));
        setPages(MOCK_PAGES);
        setCampaigns(mockCampaigns());
      } else {
        const [p, c] = await Promise.all([
          fetchJson<{ pages: FbPage[] }>('/api/facebook/pages'),
          fetchJson<{ campaigns: BoosterCampaign[] }>('/api/ai/post-booster/campaigns'),
        ]);
        setPages(p.pages);
        setCampaigns(c.campaigns);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const searchPosts = useCallback(async (pageId: string, keyword: string): Promise<PostSummary[]> => {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      return mockPostsFor(pageId, keyword);
    }
    const res = await fetchJson<{ posts: PostSummary[] }>('/api/ai/post-booster/search', {
      method: 'POST',
      body: JSON.stringify({ page_ids: [pageId], keyword }),
    });
    return res.posts;
  }, []);

  const suggestTargeting = useCallback(async (postIds: string[]): Promise<TargetingSuggestion> => {
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 250));
      return mockSuggestion(postIds);
    }
    return fetchJson<TargetingSuggestion>('/api/ai/post-booster/suggest-targeting', {
      method: 'POST',
      body: JSON.stringify({ post_ids: postIds }),
    });
  }, []);

  const estimateReach = useCallback(
    async (targeting: Omit<TargetingSuggestion, 'estimated_reach'>): Promise<TargetingSuggestion['estimated_reach']> => {
      if (MOCK_MODE) {
        // scale mock: base 800k/region
        const base = targeting.regions.length * 800_000;
        const interestPenalty = Math.max(0.4, 1 - targeting.interests.length * 0.08);
        const ageRange = Math.max(1, targeting.age_max - targeting.age_min);
        const ageFactor = Math.min(1, ageRange / 30);
        const genderFactor = targeting.gender === 'all' ? 1 : 0.5;
        const mid = base * interestPenalty * ageFactor * genderFactor;
        return { min: Math.round(mid * 0.8), max: Math.round(mid * 1.1) };
      }
      const res = await fetchJson<{ estimated_reach: TargetingSuggestion['estimated_reach'] }>(
        '/api/ai/post-booster/estimate-reach',
        { method: 'POST', body: JSON.stringify({ targeting }) }
      );
      return res.estimated_reach;
    },
    []
  );

  const launch = useCallback(
    async (payload: Record<string, unknown>): Promise<{ job_id: string }> => {
      if (MOCK_MODE) {
        await new Promise((r) => setTimeout(r, 400));
        const job_id = `job_${Date.now()}`;
        const keyword = (payload.keyword as string) || 'booster';
        const postsCount = (payload.selected_post_ids as string[]).length;
        const daily = Number(payload.budget_per_day || 500);
        const dur = Number(payload.duration_days || 7);
        setCampaigns((prev) => [
          {
            job_id,
            keyword,
            posts_count: postsCount,
            status: 'active',
            launched_at: new Date().toISOString(),
            completes_at: new Date(Date.now() + dur * 86400000).toISOString(),
            daily_budget: daily,
            duration_days: dur,
            metrics: { reach: 0, engagement: 0, orders: 0, roas: 0, spend: 0 },
            post_thumb_emoji: '🚀',
            post_title: `Boost ${postsCount} โพสต์ (${keyword})`,
            copywriter_used: !!payload.copywriter_enabled,
          },
          ...prev,
        ]);
        return { job_id };
      }
      return fetchJson<{ job_id: string }>('/api/ai/post-booster/launch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    []
  );

  const pauseJob = useCallback(async (jobId: string) => {
    setCampaigns((prev) => prev.map((c) => (c.job_id === jobId ? { ...c, status: 'paused' } : c)));
    if (MOCK_MODE) return;
    await fetchJson(`/api/ai/post-booster/${jobId}/pause`, { method: 'POST' });
  }, []);

  const resumeJob = useCallback(async (jobId: string) => {
    setCampaigns((prev) => prev.map((c) => (c.job_id === jobId ? { ...c, status: 'active' } : c)));
    if (MOCK_MODE) return;
    await fetchJson(`/api/ai/post-booster/${jobId}/resume`, { method: 'POST' });
  }, []);

  return {
    pages,
    campaigns,
    loading,
    searchPosts,
    suggestTargeting,
    estimateReach,
    launch,
    pauseJob,
    resumeJob,
    reload: loadAll,
    mockMode: MOCK_MODE,
  };
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
