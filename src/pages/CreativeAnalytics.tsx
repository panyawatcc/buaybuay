import { useState, useMemo, useCallback } from 'react';
import { Sparkles, TrendingUp, X, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '../components/Toast';
import { MetricLabel } from '../components/Tooltip';
import { useConnection } from '../components/ConnectionContext';
import { useDateRange, dateRangeToParams } from '../components/DateRangeContext';
import DateRangePicker from '../components/DateRangePicker';
import { useAds } from '../hooks/useFacebookAPI';
import EmptyState from '../components/EmptyState';
import AdImage from '../components/AdImage';

const T = {
  CTR: 'Click-Through Rate = % คนที่เห็นแล้วกด',
  ROAS: 'Return on Ad Spend = รายได้ ÷ ค่าโฆษณา',
  CPA: 'Cost per Acquisition = ค่าโฆษณาต่อ 1 การซื้อ',
  Impressions: 'จำนวนครั้งที่โฆษณาถูกแสดง',
};

type SortField = 'ctr' | 'roas' | 'cpa' | 'spend';
const MEDALS = ['🥇', '🥈', '🥉'];

interface RankedAd {
  id: string;
  name: string;
  status: string;
  body: string;
  title: string;
  thumbnailUrl: string | null;
  callToAction: string | null;
  postUrl: string | null;
  ctr: number;
  roas: number;
  cpa: number;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  purchases: number;
  purchaseValue: number;
}

export default function CreativeAnalytics() {
  const { toast } = useToast();
  const { selectedAccountId, fbConnected } = useConnection();
  const { dateRange } = useDateRange();
  const drParams = dateRangeToParams(dateRange);
  const { ads: realAds, loading: adsLoading, error: adsError } = useAds(fbConnected, selectedAccountId, drParams);
  const [sortField, setSortField] = useState<SortField>('ctr');
  const [selected, setSelected] = useState<RankedAd | null>(null);
  const [creativeData, setCreativeData] = useState<Record<string, any> | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const openDetail = useCallback(async (item: RankedAd) => {
    setSelected(item);
    setCreativeData(null);
    try {
      const res = await fetch(`/api/fb/ads/${item.id}/creative`, { credentials: 'include' });
      if (res.ok) setCreativeData(await res.json());
    } catch { /* use existing data */ }
  }, []);

  const sorted = useMemo(() => {
    if (!fbConnected) return [];

    const ranked: RankedAd[] = realAds
      .map((a) => {
        // Use embedded insights (from mapInsights — objective-aware) as primary source
        const ins = a.insights as any;
        const spend = typeof ins?.spend === 'number' ? ins.spend : parseFloat(ins?.spend || '0');
        const impressions = typeof ins?.impressions === 'number' ? ins.impressions : parseFloat(ins?.impressions || '0');
        const clicks = typeof ins?.clicks === 'number' ? ins.clicks : parseFloat(ins?.clicks || '0');
        const ctr = typeof ins?.ctr === 'number' ? ins.ctr : parseFloat(ins?.ctr || '0');
        const results = typeof ins?.results === 'number' ? ins.results : 0;
        const purchases = typeof ins?.purchases === 'number' ? ins.purchases : 0;
        const revenue = typeof ins?.revenue === 'number' ? ins.revenue : 0;
        const roas = typeof ins?.roas === 'number' ? ins.roas : 0;
        const costPerResult = typeof ins?.costPerResult === 'number' ? ins.costPerResult : (results > 0 ? spend / results : 0);
        return {
          id: a.id,
          name: a.name,
          status: a.status,
          body: a.creative?.body || '',
          title: a.creative?.title || '',
          thumbnailUrl: (a as any).adImageUrl || a.creative?.thumbnailUrl || null,
          callToAction: a.creative?.callToAction || null,
          postUrl: (a as any).permalink || (a as any).postUrl || null,
          ctr,
          roas,
          cpa: costPerResult,
          spend,
          impressions,
          clicks,
          results,
          purchases,
          purchaseValue: revenue,
        };
      })
      .filter((item) => item.impressions > 0 || item.spend > 0);
    return ranked.sort((a, b) =>
      sortField === 'cpa' ? a.cpa - b.cpa : (b[sortField] as number) - (a[sortField] as number),
    );
  }, [fbConnected, realAds, sortField]);

  // Checkbox helpers
  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const checkedItems = useMemo(() => sorted.filter((s) => checkedIds.has(s.id)), [sorted, checkedIds]);
  const hasChecked = checkedItems.length > 0;

  if (!fbConnected) return <EmptyState type="not-connected" title="ดูอันดับคอนเทนต์จริง" description="เชื่อมต่อ Facebook Ads เพื่อจัดอันดับคอนเทนต์ตาม CTR/ROAS/CPA" />;
  if (adsError) return <EmptyState type="error" error={adsError} />;
  if (adsLoading) return <EmptyState type="loading" description="กำลังโหลดโฆษณา..." />;
  if (sorted.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-info/10 mx-auto mb-4 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-info" />
        </div>
        <h3 className="font-semibold text-lg mb-2">ยังไม่มีข้อมูลคอนเทนต์</h3>
        <p className="text-text-muted text-sm mb-5 max-w-md mx-auto">
          ยังไม่มี ads ที่มีข้อมูลในช่วงเวลานี้ — เปลี่ยนช่วงวันที่หรือสร้าง ads ใหม่
        </p>
        <a href="https://adsmanager.facebook.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <ExternalLink className="w-4 h-4" />
          เปิด Facebook Ads Manager
        </a>
      </div>
    );
  }

  const sortLabels: Record<SortField, string> = {
    ctr: 'เรียงตาม CTR',
    roas: 'เรียงตาม ROAS',
    cpa: 'เรียงตาม CPA ต่ำสุด',
    spend: 'เรียงตาม ยอดใช้จ่าย',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-info" />
            วิเคราะห์คอนเทนต์ & ฮุก
          </h1>
          <p className="text-text-muted text-sm mt-1">จัดอันดับโฆษณาตามประสิทธิภาพ — CTR สูงสุด = อันดับ 1</p>
        </div>
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

      {/* Ranked ads table */}
      <div className="bg-surface rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-lighter text-left">
                <th className="px-3 py-3 w-8"><input type="checkbox" checked={checkedIds.size === sorted.length && sorted.length > 0} onChange={(e) => { if (e.target.checked) setCheckedIds(new Set(sorted.map((s) => s.id))); else setCheckedIds(new Set()); }} className="accent-primary" /></th>
                <th className="px-3 py-3 text-text-muted font-medium w-10">#</th>
                <th className="px-3 py-3 text-text-muted font-medium min-w-[280px]">คอนเทนต์</th>
                <th className="px-3 py-3 text-text-muted font-medium text-right">CTR</th>
                <th className="px-3 py-3 text-text-muted font-medium text-right">อิมเพรสชัน</th>
                <th className="px-3 py-3 text-text-muted font-medium text-right">ผลลัพธ์</th>
                <th className="px-3 py-3 text-text-muted font-medium text-right">การซื้อ</th>
                <th className="px-3 py-3 text-text-muted font-medium text-right">มูลค่าซื้อ</th>
                <th className="px-3 py-3 text-text-muted font-medium text-right">ROAS</th>
                <th className="px-3 py-3 text-text-muted font-medium text-right">ใช้จ่าย</th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className="border-b border-surface-lighter/50 hover:bg-surface-light/50 transition-colors cursor-pointer"
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={checkedIds.has(item.id)} onChange={() => toggleCheck(item.id)} className="accent-primary" />
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-bold ${i < 3 ? 'text-lg' : 'text-text-muted'}`}>{i < 3 ? MEDALS[i] : i + 1}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <AdImage
                        adId={item.id}
                        className="w-20 h-20 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{item.name}</p>
                        {item.body && <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{item.body}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right"><span className={`font-semibold ${item.ctr >= 2 ? 'text-success' : item.ctr >= 1 ? 'text-warning' : 'text-danger'}`}>{item.ctr.toFixed(2)}%</span></td>
                  <td className="px-3 py-3 text-right">{item.impressions >= 1000 ? `${(item.impressions / 1000).toFixed(0)}K` : item.impressions.toFixed(0)}</td>
                  <td className="px-3 py-3 text-right">{item.results.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right">{item.purchases.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right">฿{item.purchaseValue.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right"><span className={`font-semibold ${item.roas >= 3 ? 'text-success' : item.roas >= 1 ? 'text-warning' : 'text-text-muted'}`}>{item.roas.toFixed(1)}x</span></td>
                  <td className="px-3 py-3 text-right">฿{item.spend.toLocaleString()}</td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {item.postUrl && (
                      <a href={item.postUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-info inline-block" title="ดูโพสต์บน Facebook">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected summary bar */}
      {hasChecked && !selected && (
        <div className="bg-surface rounded-xl p-4 flex items-center gap-6 flex-wrap border border-primary/20 sticky bottom-4 z-10 shadow-lg">
          <span className="text-sm font-medium">เลือก {checkedItems.length} รายการ</span>
          <div className="flex items-center gap-5 text-sm">
            <div><span className="text-text-muted">CTR เฉลี่ย: </span><span className="font-semibold text-success">{(checkedItems.reduce((a, c) => a + c.ctr, 0) / checkedItems.length).toFixed(2)}%</span></div>
            <div><span className="text-text-muted">ROAS เฉลี่ย: </span><span className="font-semibold">{(checkedItems.reduce((a, c) => a + c.roas, 0) / checkedItems.length).toFixed(1)}x</span></div>
            <div><span className="text-text-muted">อิมเพรสชันรวม: </span><span className="font-semibold">{checkedItems.reduce((a, c) => a + c.impressions, 0).toLocaleString()}</span></div>
            <div><span className="text-text-muted">ใช้จ่ายรวม: </span><span className="font-semibold">฿{checkedItems.reduce((a, c) => a + c.spend, 0).toLocaleString()}</span></div>
            <div><span className="text-text-muted">ซื้อรวม: </span><span className="font-semibold">{checkedItems.reduce((a, c) => a + c.purchases, 0).toLocaleString()}</span></div>
          </div>
          <button onClick={() => setCheckedIds(new Set())} className="ml-auto text-xs text-text-muted hover:text-text">ยกเลิก</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">โฆษณาทั้งหมด</p>
          <p className="text-3xl font-bold mt-1">{sorted.length}</p>
        </div>
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">CTR เฉลี่ย</p>
          <p className="text-3xl font-bold text-success mt-1">{(sorted.reduce((a, c) => a + c.ctr, 0) / (sorted.length || 1)).toFixed(2)}%</p>
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
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{selected.name}</h2>
                {selected.title && <p className="text-sm text-text-muted mt-1">{selected.title}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-surface-light rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {/* Creative preview — iframe */}
            {creativeData?.iframeHtml ? (
              <iframe
                srcDoc={creativeData.iframeHtml}
                width="540"
                height="690"
                className="w-full rounded-xl border border-surface-lighter"
                style={{ maxWidth: 540, minHeight: 400 }}
                sandbox="allow-scripts allow-same-origin"
                title="Ad Preview"
              />
            ) : creativeData?.iframeSrc ? (
              <iframe
                src={creativeData.iframeSrc}
                width="540"
                height="690"
                className="w-full rounded-xl border-0"
                style={{ maxWidth: 540 }}
                sandbox="allow-scripts allow-same-origin"
                title="Ad Preview"
              />
            ) : creativeData?.previewHtml ? (
              <iframe
                srcDoc={creativeData.previewHtml}
                className="w-full rounded-xl border border-surface-lighter"
                style={{ minHeight: 400 }}
                sandbox="allow-scripts allow-same-origin"
                title="Ad Preview"
              />
            ) : (
              <iframe
                src={`/api/fb/ads/${selected.id}/preview?format=DESKTOP_FEED_STANDARD`}
                width="540"
                height="690"
                className="w-full rounded-xl border-0"
                style={{ maxWidth: 540 }}
                sandbox="allow-scripts allow-same-origin"
                title="Ad Preview"
              />
            )}
            {selected.body && <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{selected.body}</p>}
            {selected.callToAction && (
              <span className="inline-block text-xs bg-primary/10 text-primary-light px-2 py-0.5 rounded">{selected.callToAction}</span>
            )}

            {/* Metrics grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted"><MetricLabel label="CTR" hint={T.CTR} /></p><p className={`text-lg font-bold ${selected.ctr >= 2 ? 'text-success' : 'text-warning'}`}>{selected.ctr.toFixed(2)}%</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted"><MetricLabel label="ROAS" hint={T.ROAS} /></p><p className={`text-lg font-bold ${selected.roas >= 3 ? 'text-success' : 'text-warning'}`}>{selected.roas.toFixed(1)}x</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted"><MetricLabel label="CPA" hint={T.CPA} /></p><p className="text-lg font-bold">฿{selected.cpa.toFixed(0)}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">ผลลัพธ์</p><p className="text-lg font-bold">{selected.results.toLocaleString()}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted"><MetricLabel label="อิมเพรสชัน" hint={T.Impressions} /></p><p className="text-lg font-bold">{(selected.impressions / 1000).toFixed(0)}K</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">คลิก</p><p className="text-lg font-bold">{selected.clicks.toLocaleString()}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">การซื้อ</p><p className="text-lg font-bold">{selected.purchases.toLocaleString()}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">มูลค่าซื้อ</p><p className="text-lg font-bold">฿{selected.purchaseValue.toLocaleString()}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">ใช้จ่าย</p><p className="text-lg font-bold">฿{selected.spend.toLocaleString()}</p></div>
              <div className="bg-surface-light rounded-lg p-3"><p className="text-xs text-text-muted">สถานะ</p><p className="text-lg font-bold">{selected.status === 'ACTIVE' ? 'ทำงานอยู่' : 'หยุด'}</p></div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {(() => {
                const realPostUrl = creativeData?.permalink || creativeData?.postUrl || selected.postUrl;
                return realPostUrl ? (
                  <a
                    href={realPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] py-2.5 rounded-lg font-medium transition-colors border border-[#1877F2]/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                    ดูโพสต์บน Facebook
                  </a>
                ) : null;
              })()}
              <button
                onClick={() => { navigator.clipboard?.writeText(selected.body || selected.name); toast('คัดลอกคอนเทนต์แล้ว', 'success'); }}
                className="flex-1 flex items-center justify-center gap-2 bg-surface-light hover:bg-surface-lighter text-text py-2.5 rounded-lg font-medium transition-colors"
              >
                <Copy className="w-4 h-4" />
                คัดลอกคอนเทนต์
              </button>
              <button
                onClick={() => { toast(`เพิ่มงบโฆษณานี้ 25%`, 'success'); setSelected(null); }}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                เพิ่มงบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
