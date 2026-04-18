import { useState, useMemo, useCallback } from 'react';
import { Megaphone, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConnection } from '../components/ConnectionContext';
import { useDateRange, dateRangeToParams } from '../components/DateRangeContext';
import DateRangePicker from '../components/DateRangePicker';
import { useCampaigns, useAdSets, useAds, useSummary } from '../hooks/useFacebookAPI';
import CSVExportButton from '../components/CSVExportButton';
import SummaryCards from '../components/SummaryCards';
import DataTable, { DEFAULT_COLUMNS } from '../components/DataTable';
import SearchFilter from '../components/SearchFilter';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

type Tab = 'campaigns' | 'adsets' | 'ads';

export default function Campaigns() {
  const { fbConnected, selectedAccountId } = useConnection();
  const { dateRange } = useDateRange();
  const drParams = dateRangeToParams(dateRange);
  const [tab, setTab] = useState<Tab>('campaigns');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const { data: summaryData, refetch: refetchSummary } = useSummary(fbConnected, selectedAccountId, drParams);
  const { campaigns, loading: campLoading, refetch: refetchCamp } = useCampaigns(fbConnected, selectedAccountId, drParams);
  const { adsets, loading: adsetLoading, refetch: refetchAdsets } = useAdSets(fbConnected, selectedAccountId, drParams);
  const { ads, loading: adsLoading, refetch: refetchAds } = useAds(fbConnected, selectedAccountId, drParams);
  const { lastUpdated, refreshing, refresh } = useAutoRefresh([refetchSummary, refetchCamp, refetchAdsets, refetchAds]);

  if (!fbConnected) return <EmptyState type="not-connected" title="ดู Campaigns จริง" description="เชื่อมต่อ Facebook Ads เพื่อจัดการแคมเปญจริง" />;

  // Compute summary from campaigns as fallback when /api/fb/summary unavailable
  // Always compute summary from campaigns data (same source as footer) for consistency
  const campaignSummary = useMemo(() => {
    if (campaigns.length === 0) return null;
    const acc = { spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0, frequency: 0, results: 0, resultType: null as string | null, costPerResult: 0, roas: 0, purchases: 0, revenue: 0, costPerPurchase: 0, messages: 0, costPerMessage: 0, messagingActionType: null as string | null };
    for (const c of campaigns) {
      const i = c.insights;
      if (!i) continue;
      acc.spend += i.spend || 0;
      acc.impressions += i.impressions || 0;
      acc.reach += i.reach || 0;
      acc.clicks += i.clicks || 0;
      acc.results += i.results || 0;
      acc.purchases += i.purchases || 0;
      acc.revenue += i.revenue || 0;
      acc.messages += i.messages || 0;
    }
    acc.roas = acc.spend > 0 ? acc.revenue / acc.spend : 0;
    acc.ctr = acc.impressions > 0 ? (acc.clicks / acc.impressions) * 100 : 0;
    acc.cpm = acc.impressions > 0 ? (acc.spend / acc.impressions) * 1000 : 0;
    acc.costPerResult = acc.results > 0 ? acc.spend / acc.results : 0;
    acc.costPerPurchase = acc.purchases > 0 ? acc.spend / acc.purchases : 0;
    acc.costPerMessage = acc.messages > 0 ? acc.spend / acc.messages : 0;
    return acc as import('../shared/types').Insights;
  }, [campaigns]);

  // Add avgPurchaseValue (revenue/purchases) to insights
  const addAvg = (ins: Record<string, number> | null) => {
    if (!ins) return ins;
    const p = ins.purchases || 0;
    const r = ins.revenue || 0;
    const s = ins.spend || 0;
    const res = ins.results || 0;
    return { ...ins, avgPurchaseValue: p > 0 ? r / p : 0, adSpendPercent: r > 0 ? (s / r) * 100 : 0, closeRate: res > 0 ? (p / res) * 100 : 0 };
  };

  const campaignRows = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    dailyBudget: c.dailyBudget ?? 0,
    resultType: (c as unknown as Record<string, unknown>).resultType as string | undefined,
    insights: addAvg(c.insights as unknown as Record<string, number> | null),
  }));

  const adsetRows = adsets.map((a) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    dailyBudget: (a as unknown as Record<string, unknown>).dailyBudget as number ?? 0,
    resultType: (a as unknown as Record<string, unknown>).resultType as string | undefined,
    insights: addAvg(a.insights as unknown as Record<string, number> | null),
  }));

  const adRows = ads.map((a) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    resultType: (a as unknown as Record<string, unknown>).resultType as string | undefined,
    insights: addAvg(a.insights as unknown as Record<string, number> | null),
    creative: a.creative,
    postUrl: (a as unknown as Record<string, unknown>).postUrl as string | undefined,
  }));

  const allRows = (tab === 'campaigns' ? campaignRows : tab === 'adsets' ? adsetRows : adRows) as typeof campaignRows;
  const tabLoading = tab === 'campaigns' ? campLoading : tab === 'adsets' ? adsetLoading : adsLoading;

  // Client-side search + filter
  const filtered = useMemo(() => {
    let rows = allRows;
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (search.length >= 2) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
    }
    return rows;
  }, [allRows, search, statusFilter]);

  // Pagination
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Reset page when filter/tab changes
  const { toast } = useToast();
  const handleSearch = useCallback((q: string) => { setSearch(q); setPage(1); }, []);
  const handleStatusFilter = useCallback((s: string) => { setStatusFilter(s); setPage(1); }, []);

  const handleBudgetEdit = useCallback(async (id: string, newBudget: number) => {
    try {
      const res = await fetch(`/api/fb/campaigns/${id}/budget`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, dailyBudget: newBudget }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})) as Record<string, string>; toast(`แก้ไขงบไม่ได้: ${b.error || `HTTP ${res.status}`}`, 'error'); return; }
      toast(`แก้ไขงบเป็น ฿${newBudget.toLocaleString()} แล้ว`, 'success');
      refetchCamp();
    } catch (e) { toast(`แก้ไขงบไม่ได้: ${e instanceof Error ? e.message : 'Error'}`, 'error'); }
  }, [selectedAccountId, toast, refetchCamp]);


  const handleToggleStatus = useCallback(async (id: string, newStatus: 'ACTIVE' | 'PAUSED') => {
    try {
      const res = await fetch(`/api/fb/campaigns/${id}/status`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string | { error_user_msg?: string; message?: string }; message?: string };
        const fbErr = typeof body.error === 'object' ? (body.error?.error_user_msg || body.error?.message) : body.error;
        const msg = fbErr || body.message || `HTTP ${res.status}`;
        toast(`ไม่สามารถเปลี่ยนสถานะได้: ${msg}`, 'error');
        return;
      }
      toast(newStatus === 'PAUSED' ? 'หยุดแคมเปญแล้ว' : 'เปิดแคมเปญแล้ว', newStatus === 'PAUSED' ? 'warning' : 'success');
      refetchCamp();
      refetchSummary();
    } catch (e) {
      toast(`ไม่สามารถเปลี่ยนสถานะได้: ${e instanceof Error ? e.message : 'Network error'}`, 'error');
    }
  }, [toast, refetchCamp, refetchSummary]);

  const tabs: { key: Tab; label: string; count: number; loading: boolean }[] = [
    { key: 'campaigns', label: 'แคมเปญ', count: campaigns.length, loading: campLoading },
    { key: 'adsets', label: 'ชุดโฆษณา', count: adsets.length, loading: adsetLoading },
    { key: 'ads', label: 'โฆษณา', count: ads.length, loading: adsLoading },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Megaphone className="w-7 h-7 text-primary-light" />
          แคมเปญ
        </h1>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors" title="รีเฟรช">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary-light' : ''}`} />
            {lastUpdated}
          </button>
          <DateRangePicker />
          <CSVExportButton endpoint="/api/fb/campaigns" filename="campaigns" label="ดาวน์โหลด" />
          <a
            href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${selectedAccountId?.replace('act_', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            จัดการโฆษณา
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summaryData?.summary ?? campaignSummary} loading={campLoading && !campaignSummary && !summaryData} />

      {/* Search + Filter */}
      <SearchFilter onSearch={handleSearch} onStatusFilter={handleStatusFilter} statusFilter={statusFilter} />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-white' : 'text-text-muted hover:text-text hover:bg-surface-light'
            }`}
          >
            {t.label} ({t.loading && t.count === 0 ? '...' : t.count})
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-surface rounded-xl">
        <DataTable
          rows={paginated}
          columns={DEFAULT_COLUMNS}
          loading={tabLoading}
          emptyMessage={search ? `ไม่พบ "${search}"` : `ไม่มี ${tab === 'campaigns' ? 'แคมเปญ' : tab === 'adsets' ? 'ชุดโฆษณา' : 'โฆษณา'}`}
          allRows={filtered as typeof campaignRows}
          precomputedSummary={(() => {
            const base = (summaryData?.summary ?? campaignSummary) as Record<string, number> | null;
            if (!base) return undefined;
            const s = base.spend || 0, r = base.revenue || 0, p = base.purchases || 0, res = base.results || 0;
            return { ...base, avgPurchaseValue: p > 0 ? r / p : 0, adSpendPercent: r > 0 ? (s / r) * 100 : 0, closeRate: res > 0 ? (p / res) * 100 : 0 } as Record<string, number>;
          })()}
          onToggleStatus={handleToggleStatus}
          onBudgetEdit={handleBudgetEdit}
        />
      </div>

      {/* Pagination */}
      <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />

      {/* System Info */}
      <div className="text-center text-xs text-text-muted">
        {`${campaigns.length} แคมเปญ, ${adsets.length} ชุดโฆษณา, ${ads.length} โฆษณา`}
      </div>
    </div>
  );
}
