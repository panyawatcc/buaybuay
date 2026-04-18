import { useState, useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown, ArrowUpRight, X, Pause, Play, TrendingUp as BoostIcon, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Campaign } from '../data/mock';
import { useToast } from '../components/Toast';
import { MetricLabel } from '../components/Tooltip';
import { useConnection } from '../components/ConnectionContext';
import { useDateRange, dateRangeToParams } from '../components/DateRangeContext';
import DateRangePicker from '../components/DateRangePicker';
import { useCampaigns, useInsights } from '../hooks/useFacebookAPI';
import EmptyState from '../components/EmptyState';

const T = {
  ROAS: 'Return on Ad Spend = รายได้ ÷ ค่าโฆษณา (ยิ่งสูงยิ่งคุ้ม)',
  CTR: 'Click-Through Rate = % คนที่เห็นแล้วกด',
  CPA: 'Cost per Acquisition = ค่าโฆษณาต่อ 1 การซื้อ',
  Impressions: 'จำนวนครั้งที่โฆษณาถูกแสดง (Reach = คน ≠ ครั้ง)',
};

type SortField = 'roas' | 'ctr' | 'results' | 'cpa' | 'spend';
const MEDALS = ['🥇', '🥈', '🥉'];

export default function CampaignRanking() {
  const { toast } = useToast();
  const { selectedAccountId, fbConnected } = useConnection();
  const { dateRange } = useDateRange();
  const drParams = dateRangeToParams(dateRange);
  const { campaigns: realCampaigns, loading: campLoading, error: campError } = useCampaigns(fbConnected, selectedAccountId, drParams);
  const { insights: realInsights } = useInsights(fbConnected, selectedAccountId, { ...drParams, level: 'campaign' });
  const [sortField, setSortField] = useState<SortField>('roas');
  const [selected, setSelected] = useState<Campaign | null>(null);

  // Merge real campaigns + insights
  const sorted = useMemo(() => {
    if (!fbConnected) return [];
    const insMap = new Map(realInsights.map((i) => [i.campaign_id, i]));
    const merged = realCampaigns
      .filter((c) => c.status === 'ACTIVE')
      .map((c) => {
        const ins = insMap.get(c.id);
        const spend = parseFloat(ins?.spend || '0');
        const purchases = ins?.actions?.find((a) => a.action_type === 'purchase');
        const results = purchases ? parseFloat(purchases.value) : 0;
        const purchaseValue = ins?.action_values?.find((a) => a.action_type === 'purchase');
        const revenue = purchaseValue ? parseFloat(purchaseValue.value) : 0;
        return {
          id: c.id,
          name: c.name,
          accountId: selectedAccountId,
          status: 'active' as const,
          budget: c.dailyBudget || c.lifetimeBudget || 0,
          spend,
          results,
          cpa: results > 0 ? spend / results : 0,
          roas: spend > 0 ? revenue / spend : 0,
          ctr: parseFloat(ins?.ctr || '0'),
          impressions: parseFloat(ins?.impressions || '0'),
          clicks: parseFloat(ins?.clicks || '0'),
          objective: c.objective,
          createdAt: c.createdTime || '',
          dailyData: [],
        } as Campaign;
      });
    return merged.sort((a, b) =>
      sortField === 'cpa' ? a.cpa - b.cpa : (b[sortField] as number) - (a[sortField] as number),
    );
  }, [fbConnected, realCampaigns, realInsights, selectedAccountId, sortField]);

  if (!fbConnected) return <EmptyState type="not-connected" title="ดู Campaign Ranking จริง" description="เชื่อมต่อ Facebook Ads เพื่อเรียงอันดับแคมเปญจริงตาม ROAS/CTR/CPA" />;
  if (campError) return <EmptyState type="error" error={campError} />;
  if (campLoading) return <EmptyState type="loading" description="กำลังโหลด campaigns..." />;
  if (sorted.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-warning/10 mx-auto mb-4 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-warning" />
        </div>
        <h3 className="font-semibold text-lg mb-2">ยังไม่มีแคมเปญ</h3>
        <p className="text-text-muted text-sm mb-5 max-w-md mx-auto">
          บัญชีนี้ยังไม่มีแคมเปญที่ active — สร้างแคมเปญแรกใน Facebook Ads Manager แล้วกลับมาดูอันดับที่นี่
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <a
            href="https://adsmanager.facebook.com/adsmanager/manage/campaigns"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            สร้างแคมเปญใน Ads Manager
          </a>
          <Link
            to="/bot-rules"
            className="inline-flex items-center gap-2 bg-surface-light hover:bg-surface-lighter text-text px-5 py-2.5 rounded-lg text-sm font-medium border border-surface-lighter transition-colors"
          >
            ตั้งค่าบอทก่อน →
          </Link>
        </div>
      </div>
    );
  }

  const sortLabels: Record<SortField, string> = {
    roas: 'เรียงตาม ROAS',
    ctr: 'เรียงตาม CTR',
    results: 'เรียงตาม ยอดขาย',
    cpa: 'เรียงตาม CPA ต่ำสุด',
    spend: 'เรียงตาม ยอดใช้จ่าย',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Trophy className="w-7 h-7 text-warning" />
          จัดอันดับแคมเปญ
        </h1>
        <div className="flex items-center gap-3">
          <DateRangePicker />
          <select
            value={sortField}
            onChange={(e) => { setSortField(e.target.value as SortField); toast(`${sortLabels[e.target.value as SortField]}`, 'info'); }}
            className="bg-surface-light border border-surface-lighter rounded-lg px-4 py-2 text-sm text-text focus:outline-none focus:border-primary"
          >
            {(Object.keys(sortLabels) as SortField[]).map((k) => (
              <option key={k} value={k}>{sortLabels[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((campaign, i) => (
          <button
            key={campaign.id}
            onClick={() => setSelected(campaign)}
            className={`w-full text-left bg-surface rounded-xl p-5 flex items-center gap-5 border-l-4 hover:bg-surface-light cursor-pointer ${
              i === 0 ? 'border-warning' : i === 1 ? 'border-text-muted' : i === 2 ? 'border-orange-700' : 'border-surface-lighter'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
              i === 0 ? 'bg-warning/20 text-warning' : i === 1 ? 'bg-text-muted/20 text-text-muted' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-surface-light text-text-muted'
            }`}>{i < 3 ? MEDALS[i] : i + 1}</div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{campaign.name}</h3>
              <p className="text-sm text-text-muted">งบ ฿{campaign.budget.toLocaleString()} · ใช้ไป ฿{campaign.spend.toLocaleString()}</p>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm">
              <div className="text-center"><p className="text-text-muted"><MetricLabel label="ROAS" hint={T.ROAS} /></p><p className={`font-bold text-lg ${campaign.roas >= 3 ? 'text-success' : campaign.roas >= 2 ? 'text-warning' : 'text-danger'}`}>{campaign.roas.toFixed(1)}x</p></div>
              <div className="text-center"><p className="text-text-muted"><MetricLabel label="CTR" hint={T.CTR} /></p><p className="font-bold text-lg">{campaign.ctr.toFixed(1)}%</p></div>
              <div className="text-center"><p className="text-text-muted"><MetricLabel label="CPA" hint={T.CPA} /></p><p className="font-bold text-lg">฿{campaign.cpa.toFixed(0)}</p></div>
              <div className="text-center"><p className="text-text-muted">ผลลัพธ์</p><p className="font-bold text-lg">{campaign.results.toLocaleString()}</p></div>
            </div>

            <div className={`flex items-center gap-1 text-sm shrink-0 ${campaign.roas >= 3 ? 'text-success' : 'text-danger'}`}>
              {campaign.roas >= 3 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">แคมเปญทั้งหมด</p>
          <p className="text-3xl font-bold mt-1">{sorted.length}</p>
        </div>
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">ROAS เฉลี่ย</p>
          <p className="text-3xl font-bold text-success mt-1">{(sorted.reduce((a, c) => a + c.roas, 0) / (sorted.length || 1)).toFixed(1)}x</p>
        </div>
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">ใช้จ่ายรวม</p>
          <p className="text-3xl font-bold mt-1">฿{sorted.reduce((a, c) => a + c.spend, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-2xl space-y-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <p className="text-sm text-text-muted mt-1">{selected.objective}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-surface-light rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">งบ</p><p className="text-lg font-bold">฿{selected.budget.toLocaleString()}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">ใช้จ่าย</p><p className="text-lg font-bold">฿{selected.spend.toLocaleString()}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted"><MetricLabel label="ROAS" hint={T.ROAS} /></p><p className={`text-lg font-bold ${selected.roas >= 3 ? 'text-success' : 'text-warning'}`}>{selected.roas.toFixed(1)}x</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted"><MetricLabel label="CPA" hint={T.CPA} /></p><p className="text-lg font-bold">฿{selected.cpa.toFixed(0)}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted"><MetricLabel label="CTR" hint={T.CTR} /></p><p className="text-lg font-bold">{selected.ctr.toFixed(1)}%</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">ผลลัพธ์</p><p className="text-lg font-bold">{selected.results.toLocaleString()}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted"><MetricLabel label="Impressions" hint={T.Impressions} /></p><p className="text-lg font-bold">{(selected.impressions / 1000).toFixed(0)}K</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">Clicks</p><p className="text-lg font-bold">{selected.clicks.toLocaleString()}</p></div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  const newStatus = selected.status === 'active' ? 'PAUSED' : 'ACTIVE';
                  try {
                    const res = await fetch(`/api/fb/campaigns/${selected.id}/status`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
                    if (!res.ok) { const b = await res.json().catch(() => ({})) as Record<string, unknown>; const e = typeof b.error === 'object' ? (b.error as Record<string, string>)?.error_user_msg : b.error; toast(`ไม่สำเร็จ: ${e || `HTTP ${res.status}`}`, 'error'); return; }
                    toast(newStatus === 'PAUSED' ? `หยุด "${selected.name}" แล้ว` : `เปิด "${selected.name}" แล้ว`, 'success');
                  } catch { toast('ไม่สามารถเปลี่ยนสถานะได้', 'error'); }
                  setSelected(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-warning/10 text-warning hover:bg-warning/20 py-2.5 rounded-lg font-medium transition-colors border border-warning/20"
              >
                {selected.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {selected.status === 'active' ? 'หยุดแคมเปญ' : 'เปิดแคมเปญ'}
              </button>
              <button
                onClick={async () => {
                  if (!selected.budget || selected.budget <= 0) { toast('ไม่มีข้อมูลงบ — ไม่สามารถเพิ่มได้', 'error'); return; }
                  const newBudget = Math.round(selected.budget * 1.2);
                  try {
                    const res = await fetch(`/api/fb/campaigns/${selected.id}/budget`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: selectedAccountId, dailyBudget: newBudget }) });
                    if (!res.ok) { const b = await res.json().catch(() => ({})) as Record<string, unknown>; toast(`ไม่สำเร็จ: ${(b.error as string) || `HTTP ${res.status}`}`, 'error'); return; }
                    toast(`เพิ่มงบ "${selected.name}" → ฿${newBudget.toLocaleString()}/วัน`, 'success');
                  } catch { toast('ไม่สามารถเพิ่มงบได้', 'error'); }
                  setSelected(null);
                }}
                disabled={!selected.budget || selected.budget <= 0}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${!selected.budget || selected.budget <= 0 ? 'bg-surface-lighter text-text-muted cursor-not-allowed' : 'bg-primary hover:bg-primary-dark text-white'}`}
              >
                <BoostIcon className="w-4 h-4" />
                เพิ่มงบ 20%
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
