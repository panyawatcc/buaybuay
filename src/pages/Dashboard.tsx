import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, Eye, Users, MousePointerClick, ShoppingCart, BarChart3, AlertTriangle, Lightbulb, Pause, Play, Sparkles, ExternalLink, Target } from 'lucide-react';
import { useToast } from '../components/Toast';
import { MetricLabel } from '../components/Tooltip';
import WelcomeScreen from '../components/WelcomeScreen';
import { useConnection } from '../components/ConnectionContext';
import { useDateRange, dateRangeToParams, PRESET_LABELS } from '../components/DateRangeContext';
import DateRangePicker from '../components/DateRangePicker';
import { useInsights, useCampaigns, useAIInsights, useInsightsCompare } from '../hooks/useFacebookAPI';
import OnboardingChecklist from '../components/OnboardingChecklist';
import PixelStatus from '../components/PixelStatus';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import EmptyState from '../components/EmptyState';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { RefreshCw } from 'lucide-react';

const recIcon: Record<string, { icon: typeof AlertTriangle; color: string; border: string; bg: string }> = {
  warning: { icon: AlertTriangle, color: 'text-warning', border: 'border-warning', bg: 'bg-warning/5' },
  opportunity: { icon: TrendingUp, color: 'text-success', border: 'border-success', bg: 'bg-success/5' },
  insight: { icon: Lightbulb, color: 'text-info', border: 'border-info', bg: 'bg-info/5' },
};

export default function Dashboard() {
  const { toast } = useToast();
  const { fbConnected, welcomeDismissed, dismissWelcome, selectedAccountId } = useConnection();
  const { dateRange } = useDateRange();
  const drParams = dateRangeToParams(dateRange);
  const { insights: realInsights, loading: insLoading, error: insError, refetch: refetchInsights } = useInsights(fbConnected, selectedAccountId, {
    ...drParams,
    level: 'account',
  });
  const { insights: campaignInsights, refetch: refetchCampInsights } = useInsights(fbConnected, selectedAccountId, {
    ...drParams,
    level: 'campaign',
  });
  const { campaigns: realCampaigns, refetch: refetchCampaigns } = useCampaigns(fbConnected, selectedAccountId, drParams);
  const { recommendations, accountStats: realAccountStats, refetch: refetchAI } = useAIInsights(fbConnected, selectedAccountId);
  const { data: compareData } = useInsightsCompare(fbConnected, selectedAccountId, drParams);
  const { lastUpdated, refreshing, refresh } = useAutoRefresh([refetchInsights, refetchCampInsights, refetchCampaigns, refetchAI]);
  const navigate = useNavigate();

  // Merge campaigns with insights for table display
  const [pausedIds] = useState<Set<string>>(new Set());
  const campaigns = useMemo(() => {
    const insMap = new Map(campaignInsights.map((i) => [i.campaign_id, i]));
    return realCampaigns.map((c) => {
      const ins = insMap.get(c.id);
      const spend = parseFloat(ins?.spend || '0');
      const purchases = ins?.actions?.find((a) => a.action_type === 'purchase');
      const results = purchases ? parseFloat(purchases.value) : 0;
      const revenue = ins?.action_values?.find((a) => a.action_type === 'purchase');
      const revenueVal = revenue ? parseFloat(revenue.value) : 0;
      return {
        id: c.id,
        name: c.name,
        status: (pausedIds.has(c.id) ? 'paused' : c.status === 'ACTIVE' ? 'active' : 'paused') as 'active' | 'paused',
        budget: c.dailyBudget || c.lifetimeBudget || 0,
        spend,
        results,
        cpa: results > 0 ? spend / results : 0,
        roas: spend > 0 ? revenueVal / spend : 0,
        ctr: parseFloat(ins?.ctr || '0'),
      };
    });
  }, [realCampaigns, campaignInsights, pausedIds]);

  // Filter campaigns by selected account for KPI calc (already filtered by account in hooks)
  const accountCampaigns = campaigns;

  // Real KPIs computed from /api/fb/insights
  const realKpis = useMemo(() => {
    if (!fbConnected) return null;
    const totals = realInsights.reduce(
      (acc, ins) => {
        acc.spend += parseFloat(ins.spend || '0');
        acc.impressions += parseFloat(ins.impressions || '0');
        acc.reach += parseFloat((ins as Record<string, string>).reach || '0');
        acc.clicks += parseFloat(ins.clicks || '0');
        acc.ctr += parseFloat(ins.ctr || '0');
        const p = ins.actions?.find((a) => a.action_type === 'purchase');
        acc.purchases += p ? parseFloat(p.value) : 0;
        const pv = ins.action_values?.find((a) => a.action_type === 'purchase');
        acc.revenue += pv ? parseFloat(pv.value) : 0;
        return acc;
      },
      { spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, purchases: 0, revenue: 0 },
    );
    const avgCtrReal = realInsights.length ? totals.ctr / realInsights.length : 0;
    const avgRoasReal = totals.spend > 0 ? totals.revenue / totals.spend : 0;
    const profit = totals.revenue - totals.spend;
    const ch = compareData?.changes;
    const avgCostPerPurchase = totals.purchases > 0 ? totals.spend / totals.purchases : 0;
    return [
      { label: 'ค่าใช้จ่าย', hint: 'เงินที่ใช้โฆษณาทั้งหมด', value: `฿${Math.round(totals.spend).toLocaleString()}`, change: ch?.spend ?? null, up: true, icon: DollarSign, color: 'text-primary-light', nav: '/campaigns' },
      { label: 'ยอดขาย', hint: 'รายได้จากโฆษณา', value: `฿${Math.round(totals.revenue).toLocaleString()}`, change: ch?.revenue ?? null, up: true, icon: ShoppingCart, color: 'text-success', nav: '/campaigns' },
      { label: 'กำไร', hint: 'กำไร = รายได้ - ค่าโฆษณา', value: `฿${Math.round(profit).toLocaleString()}`, change: null, up: profit > 0, icon: TrendingUp, color: profit > 0 ? 'text-success' : 'text-danger', nav: '/campaigns' },
      { label: 'ผลตอบแทน', hint: 'ROAS = รายได้ ÷ ค่าโฆษณา (ยิ่งสูงยิ่งคุ้ม)', value: `${avgRoasReal.toFixed(1)}x`, change: ch?.roas ?? null, up: avgRoasReal >= 1, icon: TrendingUp, color: 'text-success', nav: '/rankings' },
      { label: 'การแสดงผล', hint: 'จำนวนครั้งที่โฆษณาถูกแสดง (Impressions)', value: `${(totals.impressions / 1000).toFixed(0)}K`, change: ch?.impressions ?? null, up: true, icon: Eye, color: 'text-warning', nav: '/campaigns' },
      { label: 'การเข้าถึง', hint: 'จำนวนคนที่เห็นโฆษณา (Reach)', value: `${(totals.reach / 1000).toFixed(0)}K`, change: null, up: true, icon: Users, color: 'text-info', nav: '/campaigns' },
      { label: 'คลิก', hint: 'จำนวนครั้งที่คนกดโฆษณา (CTR ' + avgCtrReal.toFixed(2) + '%)', value: totals.clicks.toLocaleString(), change: ch?.clicks ?? null, up: true, icon: MousePointerClick, color: 'text-info', nav: '/content-analysis' },
      { label: 'การซื้อ', hint: 'จำนวนการซื้อจากโฆษณา', value: Math.round(totals.purchases).toLocaleString(), change: ch?.conversions ?? null, up: totals.purchases > 0, icon: BarChart3, color: 'text-primary', nav: '/campaigns' },
      { label: 'ค่าคอนเวอร์ชั่น/ซื้อ', hint: 'ค่าโฆษณาเฉลี่ยต่อการซื้อ 1 ครั้ง (ยิ่งต่ำยิ่งดี)', value: avgCostPerPurchase > 0 ? `฿${Math.round(avgCostPerPurchase).toLocaleString()}` : '-', change: null, up: avgCostPerPurchase > 0 && avgCostPerPurchase < 100, icon: Target, color: 'text-danger', nav: '/campaigns' },
    ];
  }, [fbConnected, realInsights, compareData]);

  // Account stats from real API
  const accountStats = realAccountStats;
  const avgRoasOverall = useMemo(
    () => +(accountStats.reduce((a, c) => a + c.roas, 0) / (accountStats.length || 1)).toFixed(1),
    [accountStats],
  );

  // Chart: daily spend from real insights (grouped by campaign) — skip if no data
  const chartData = useMemo(() => {
    if (campaignInsights.length === 0) return [];
    // Real API returns aggregated — can't do per-day without time_increment
    // Show per-campaign spend bar instead
    return campaignInsights.slice(0, 7).map((i) => ({
      date: (i.campaign_name || 'Campaign').slice(0, 12),
      spend: parseFloat(i.spend || '0'),
    }));
  }, [campaignInsights]);

  const filteredRecommendations = recommendations;

  const displayKpis = realKpis || [];

  const toggleCampaign = async (id: string) => {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    const newStatus = c.status === 'active' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/fb/campaigns/${id}/status`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})) as Record<string, string>; toast(`ไม่สามารถเปลี่ยนสถานะได้: ${b.error || `HTTP ${res.status}`}`, 'error'); return; }
      toast(newStatus === 'PAUSED' ? `หยุด "${c.name}"` : `เปิด "${c.name}"`, newStatus === 'PAUSED' ? 'warning' : 'success');
      refetchCampaigns();
    } catch { toast('ไม่สามารถเปลี่ยนสถานะได้', 'error'); }
  };

  if (!fbConnected && !welcomeDismissed) {
    return (
      <WelcomeScreen
        onConnect={() => navigate('/settings')}
        onSkip={() => {
          dismissWelcome();
          toast('กำลังดู Demo Data — ไปที่ Settings เมื่อพร้อมเชื่อมต่อจริง', 'info');
        }}
      />
    );
  }

  const getHighlight = (k: { label: string }) => {
    const totalResults = accountCampaigns.reduce((a, c) => a + c.results, 0);
    const avgRoasLocal = +(accountCampaigns.reduce((a, c) => a + c.roas, 0) / (accountCampaigns.length || 1)).toFixed(1);
    if (k.label === 'ROAS') {
      return avgRoasLocal >= 3 ? 'ring-1 ring-success/30 bg-gradient-to-br from-success/10 to-transparent' : avgRoasLocal >= 2 ? '' : 'ring-1 ring-danger/30 bg-gradient-to-br from-danger/10 to-transparent';
    }
    if (k.label === 'การซื้อ') {
      return totalResults > 2000 ? 'ring-1 ring-success/30 bg-gradient-to-br from-success/10 to-transparent' : '';
    }
    return '';
  };

  if (insError) return <EmptyState type="error" error={insError} />;
  if (insLoading && realInsights.length === 0) return <EmptyState type="loading" description="กำลังโหลด insights..." />;
  if (realInsights.length === 0 && realCampaigns.length === 0) return <EmptyState type="no-data" title="ไม่มีข้อมูล" description="บัญชีนี้ยังไม่มีแคมเปญหรือข้อมูลในช่วง 7 วันที่ผ่านมา" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-sm text-text-muted mt-1">ภาพรวมแคมเปญ {dateRange.preset ? PRESET_LABELS[dateRange.preset] : 'กำหนดเอง'} · {campaigns.length} แคมเปญ</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker />
          <button onClick={refresh} className="flex items-center gap-2 text-xs text-text-muted hover:text-text transition-colors" title="รีเฟรชข้อมูล">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary-light' : ''}`} />
            อัพเดทล่าสุด {lastUpdated}
          </button>
        </div>
      </div>

      {/* Onboarding + Pixel Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OnboardingChecklist />
        <PixelStatus />
      </div>

      {/* Daily Summary */}
      {fbConnected && realInsights.length > 0 && (() => {
        const t = realInsights.reduce((a, i) => {
          a.spend += parseFloat(i.spend || '0');
          a.revenue += parseFloat((i.action_values?.find(x => x.action_type === 'purchase')?.value) || '0');
          return a;
        }, { spend: 0, revenue: 0 });
        const roas = t.spend > 0 ? (t.revenue / t.spend).toFixed(1) : '0';
        const topCampaign = campaigns.length > 0 ? [...campaigns].sort((a, b) => b.roas - a.roas)[0] : null;
        const worstCampaign = campaigns.length > 1 ? [...campaigns].sort((a, b) => a.roas - b.roas)[0] : null;
        return (
          <div className="bg-gradient-to-r from-primary/10 via-surface to-info/10 rounded-xl p-4 border border-primary/20 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary-light mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">สรุปวันนี้: </span>
              <span className="text-text-muted">
                ใช้จ่าย ฿{Math.round(t.spend).toLocaleString()} · รายได้ ฿{Math.round(t.revenue).toLocaleString()} · ROAS {roas}x
                {topCampaign ? ` · ดีสุด: ${topCampaign.name.slice(0, 20)} (${topCampaign.roas.toFixed(1)}x)` : ''}
                {worstCampaign && worstCampaign.roas < 1 ? ` · ⚠️ ${worstCampaign.name.slice(0, 20)} ROAS ต่ำ (${worstCampaign.roas.toFixed(1)}x)` : ''}
              </span>
            </div>
          </div>
        );
      })()}

      {/* KPI Cards with drill-down + real % change */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {displayKpis.map((k) => (
          <button
            key={k.label}
            onClick={() => navigate(k.nav)}
            className={`bg-surface rounded-xl p-5 text-left hover:bg-surface-light transition-all group ${getHighlight(k)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-muted">
                <MetricLabel label={k.label} hint={k.hint} />
              </span>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold">{k.value}</p>
            {k.change !== null ? (
              <div className="flex items-center gap-1 mt-1">
                {k.change >= 0 ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-danger" />}
                <span className={`text-xs ${k.change >= 0 ? 'text-success' : 'text-danger'}`}>{k.change >= 0 ? '+' : ''}{k.change.toFixed(1)}%</span>
                <span className="text-[10px] text-text-muted ml-1">vs ก่อนหน้า</span>
              </div>
            ) : (
              <p className="text-[10px] text-text-muted mt-1 group-hover:text-primary-light transition-colors">คลิกดูรายละเอียด →</p>
            )}
          </button>
        ))}
      </div>

      {/* Charts: Spend trend + ROAS comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl p-6">
          <h3 className="font-semibold mb-1">เปรียบเทียบยอดใช้จ่าย 3 บัญชี</h3>
          <p className="text-xs text-text-muted mb-4">7 วันย้อนหลัง</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#363650" />
              <XAxis dataKey="date" stroke="#6c7086" fontSize={12} />
              <YAxis stroke="#6c7086" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #363650', borderRadius: 8, color: '#cdd6f4' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {accountStats[0] && <Line type="monotone" dataKey={accountStats[0].name} stroke="#8b5cf6" strokeWidth={2.5} dot={false} />}
              {accountStats[1] && <Line type="monotone" dataKey={accountStats[1].name} stroke="#89b4fa" strokeWidth={2.5} dot={false} />}
              {accountStats[2] && <Line type="monotone" dataKey={accountStats[2].name} stroke="#a6e3a1" strokeWidth={2.5} dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface rounded-xl p-6">
          <h3 className="font-semibold mb-1">ROAS ตามบัญชี</h3>
          <p className="text-xs text-text-muted mb-4">เฉลี่ยทุกแคมเปญ</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={accountStats} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#363650" />
              <XAxis type="number" stroke="#6c7086" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#6c7086" fontSize={11} width={140} />
              <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #363650', borderRadius: 8, color: '#cdd6f4' }} />
              <Bar dataKey="roas" name="ROAS" fill="#8b5cf6" radius={[0, 6, 6, 0]}>
                {accountStats.map((s, i) => (
                  <rect key={i} fill={s.roas >= 4 ? '#a6e3a1' : s.roas >= 2.5 ? '#f9e2af' : '#f38ba8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Budget Breakdown Pie */}
      {campaigns.length > 0 && (() => {
        const PIE_COLORS = ['#8b5cf6', '#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8', '#f5c2e7', '#94e2d5', '#fab387'];
        const pieData = campaigns.slice(0, 8).map((c) => ({ name: c.name.slice(0, 15), budget: c.budget, spend: c.spend }));
        return (
          <div className="bg-surface rounded-xl p-6">
            <h3 className="font-semibold mb-1">งบ vs ใช้จริง ตามแคมเปญ</h3>
            <p className="text-xs text-text-muted mb-4">เปรียบเทียบงบที่ตั้ง กับยอดใช้จ่ายจริง</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="budget" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #363650', borderRadius: 8, color: '#cdd6f4' }} formatter={(v) => `฿${Number(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="spend" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #363650', borderRadius: 8, color: '#cdd6f4' }} formatter={(v) => `฿${Number(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* AI Insights Widget */}
      <div className="bg-gradient-to-br from-primary/5 via-surface to-info/5 rounded-xl p-6 border border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-light" />
          </div>
          <div>
            <h3 className="font-semibold">🤖 AI Insights</h3>
            <p className="text-xs text-text-muted">ข้อแนะนำอัตโนมัติจาก AI</p>
          </div>
        </div>

        {/* Account comparison insight — filter by selectedAccountId */}
        {(() => {
          const accountsToShow =
            selectedAccountId && accountStats.find((a) => a.id === selectedAccountId)
              ? accountStats.filter((a) => a.id === selectedAccountId)
              : accountStats;
          const gridCols =
            accountsToShow.length === 1
              ? 'grid-cols-1'
              : accountsToShow.length === 2
                ? 'md:grid-cols-2'
                : 'md:grid-cols-3';
          return (
            <div className={`grid grid-cols-1 ${gridCols} gap-3 mb-4`}>
              {accountsToShow.map((acc) => {
                const vs = ((acc.roas / avgRoasOverall - 1) * 100).toFixed(0);
                const isGood = acc.roas > avgRoasOverall;
                return (
                  <div key={acc.id} className={`rounded-lg p-3 ${isGood ? 'bg-success/10 border border-success/30' : 'bg-surface-light border border-surface-lighter'}`}>
                    <p className="text-xs text-text-muted mb-1 truncate">{acc.name}</p>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-bold">{acc.roas.toFixed(1)}x</span>
                      <span className={`text-xs flex items-center gap-0.5 ${isGood ? 'text-success' : 'text-text-muted'}`}>
                        {isGood ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {vs}%
                      </span>
                    </div>
                    {isGood ? (
                      <p className="text-[10px] text-success mt-1">ดีกว่าค่าเฉลี่ย · แนะนำเพิ่มงบ</p>
                    ) : (
                      <p className="text-[10px] text-text-muted mt-1">ต่ำกว่าค่าเฉลี่ย {Math.abs(parseInt(vs))}%</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Actionable recommendations list */}
        <div className="space-y-2">
          {filteredRecommendations.slice(0, 3).map((r) => {
            const cfg = recIcon[r.type];
            const Icon = cfg.icon;
            return (
              <button
                key={r.id}
                onClick={() => toast(`ทำตามคำแนะนำ: ${r.title}`, r.type === 'warning' ? 'warning' : 'success')}
                className={`w-full text-left border-l-4 ${cfg.border} ${cfg.bg} rounded-r-lg p-3 flex items-start gap-3 hover:bg-surface-light transition-colors`}
              >
                <Icon className={`w-5 h-5 mt-0.5 ${cfg.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{r.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{r.description}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-1 rounded-full whitespace-nowrap ${r.impact === 'high' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                  {r.impact === 'high' ? 'สำคัญมาก' : 'ปานกลาง'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campaign Table */}
      <div className="bg-surface rounded-xl p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">แคมเปญทั้งหมด ({campaigns.length})</h3>
          <button onClick={() => navigate('/campaigns')} className="text-xs text-primary-light hover:text-primary">ดูทั้งหมด →</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted border-b border-surface-lighter text-xs uppercase tracking-wider">
              <th className="text-left py-3 pr-4">ชื่อ</th>
              <th className="text-left py-3 px-3">สถานะ</th>
              <th className="text-right py-3 px-3">งบ</th>
              <th className="text-right py-3 px-3">ใช้จ่าย</th>
              <th className="text-right py-3 px-3">ผลลัพธ์</th>
              <th className="text-right py-3 px-3"><MetricLabel label="CPA" hint="Cost per Acquisition = ค่าโฆษณาต่อ 1 การซื้อ" /></th>
              <th className="text-right py-3 px-3"><MetricLabel label="ROAS" hint="Return on Ad Spend" /></th>
              <th className="text-right py-3 px-3"><MetricLabel label="CTR" hint="Click-Through Rate" /></th>
              <th className="text-center py-3 pl-3">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.slice(0, 6).map((c) => (
              <tr key={c.id} className="border-b border-surface-lighter/50 hover:bg-surface-light/50">
                <td className="py-3 pr-4 font-medium">{c.name}</td>
                <td className="py-3 px-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-success/10 text-success' : c.status === 'paused' ? 'bg-warning/10 text-warning' : 'bg-text-muted/10 text-text-muted'}`}>
                    {c.status === 'active' ? 'ทำงาน' : c.status === 'paused' ? 'หยุด' : 'จบแล้ว'}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">฿{c.budget.toLocaleString()}</td>
                <td className="py-3 px-3 text-right">฿{c.spend.toLocaleString()}</td>
                <td className="py-3 px-3 text-right">{c.results.toLocaleString()}</td>
                <td className={`py-3 px-3 text-right ${c.cpa > 50 ? 'text-danger' : 'text-success'}`}>฿{c.cpa}</td>
                <td className={`py-3 px-3 text-right font-medium ${c.roas >= 3 ? 'text-success' : c.roas >= 2 ? 'text-warning' : 'text-danger'}`}>{c.roas.toFixed(1)}x</td>
                <td className="py-3 px-3 text-right">{c.ctr.toFixed(1)}%</td>
                <td className="py-3 pl-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => toggleCampaign(c.id)} className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-text" title={c.status === 'active' ? 'หยุด' : 'เปิด'}>
                      {c.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <a
                      href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${selectedAccountId?.replace('act_', '')}&campaign_ids=${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-text"
                      title="เปิดใน Facebook Ads Manager"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
