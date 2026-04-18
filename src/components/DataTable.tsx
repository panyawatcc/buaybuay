import { useState, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, X, Loader2, Pencil, Archive, Check } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  format?: (v: number) => string;
  align?: 'left' | 'right';
  colorFn?: (v: number) => string;
}

interface Row {
  id: string;
  name: string;
  status: string;
  insights: Record<string, number> | null;
  resultType?: string;
  [key: string]: unknown;
}

const RESULT_LABELS: Record<string, string> = {
  messages: 'แชท',
  purchases: 'การซื้อ',
  leads: 'Leads',
  link_clicks: 'คลิก',
};

interface Props {
  rows: Row[];
  columns: Column[];
  loading?: boolean;
  emptyMessage?: string;
  onToggleStatus?: (id: string, newStatus: 'ACTIVE' | 'PAUSED') => void | Promise<void>;
  onBudgetEdit?: (id: string, newBudget: number) => void;
  onArchive?: (id: string) => void;
  onRowClick?: (row: Row) => void;
  allRows?: Row[]; // all filtered rows for summary (not just paginated)
  precomputedSummary?: Record<string, number>; // pre-computed summary from parent (overrides internal computation)
}

// Safe number: guard against NaN/undefined/Infinity
const safe = (v: number) => (Number.isFinite(v) ? v : 0);

// Column order matches Facebook Ads Manager
const DEFAULT_COLUMNS: Column[] = [
  { key: 'dailyBudget', label: 'งบประมาณ', format: (v) => safe(v) > 0 ? `฿${safe(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-', align: 'right' },
  { key: 'spend', label: 'จำนวนเงินที่ใช้จ่ายไป', format: (v) => `฿${safe(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, align: 'right' },
  { key: 'results', label: 'ผลลัพธ์', format: (v) => safe(v).toLocaleString(), align: 'right' },
  { key: 'costPerResult', label: 'ต้นทุนต่อผลลัพธ์', format: (v) => safe(v) > 0 ? `฿${safe(v).toFixed(0)}` : '-', align: 'right' },
  { key: 'messages', label: 'การส่งข้อความเพื่อเริ่มการสนทนา', format: (v) => safe(v) > 0 ? safe(v).toLocaleString() : '-', align: 'right' },
  { key: 'costPerMessage', label: 'ต้นทุนต่อการเริ่มสนทนาทางข้อความ', format: (v) => safe(v) > 0 ? `฿${safe(v).toFixed(0)}` : '-', align: 'right' },
  { key: 'roas', label: 'ผลลัพธ์ ROAS', format: (v) => `${safe(v).toFixed(2)}`, align: 'right', colorFn: (v) => safe(v) >= 3 ? 'text-success' : safe(v) >= 2 ? 'text-warning' : 'text-danger' },
  { key: 'purchases', label: 'การซื้อ', format: (v) => safe(v) > 0 ? safe(v).toLocaleString() : '-', align: 'right' },
  { key: 'costPerPurchase', label: 'ต้นทุนต่อการซื้อ', format: (v) => safe(v) > 0 ? `฿${safe(v).toFixed(0)}` : '-', align: 'right' },
  { key: 'avgPurchaseValue', label: 'ค่าคอนเวอร์ชั่นการซื้อโดยเฉลี่ย', format: (v) => safe(v) > 0 ? `฿${safe(v).toFixed(0)}` : '-', align: 'right' },
  { key: 'impressions', label: 'อิมเพรสชัน', format: (v) => safe(v).toLocaleString(), align: 'right' },
  { key: 'cpm', label: 'ต้นทุน/พันการแสดงผล (CPM)', format: (v) => safe(v) > 0 ? `฿${safe(v).toFixed(0)}` : '-', align: 'right' },
  { key: 'ctr', label: 'CTR (ทั้งหมด)', format: (v) => `${safe(v).toFixed(2)}%`, align: 'right' },
  { key: 'clicks', label: 'จำนวนคลิก (ทั้งหมด)', format: (v) => safe(v).toLocaleString(), align: 'right' },
  { key: 'frequency', label: 'ความถี่', format: (v) => safe(v).toFixed(2), align: 'right' },
  { key: 'reach', label: 'การเข้าถึง', format: (v) => safe(v).toLocaleString(), align: 'right' },
  { key: 'adSpendPercent', label: '%ค่าโฆษณา', format: (v) => safe(v) > 0 ? `${safe(v).toFixed(1)}%` : '-', align: 'right' },
  { key: 'closeRate', label: '%การปิดการขาย', format: (v) => safe(v) > 0 ? `${safe(v).toFixed(1)}%` : '-', align: 'right' },
];

export { DEFAULT_COLUMNS };

export default function DataTable({ rows, columns = DEFAULT_COLUMNS, loading, emptyMessage = 'ไม่มีข้อมูล', onToggleStatus, onBudgetEdit, onArchive, onRowClick, allRows: allFilteredRows, precomputedSummary }: Props) {
  const [sortKey, setSortKey] = useState('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editBudgetId, setEditBudgetId] = useState<string | null>(null);
  const [editBudgetValue, setEditBudgetValue] = useState('');
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [creativeData, setCreativeData] = useState<Record<string, unknown> | null>(null);
  const [creativeLoading, setCreativeLoading] = useState(false);

  // Fetch full creative data when modal opens
  const fetchCreative = useCallback(async (adId: string) => {
    setCreativeLoading(true);
    setCreativeData(null);
    try {
      const res = await fetch(`/api/fb/ads/${adId}/creative`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCreativeData(data);
      }
    } catch { /* use existing data */ }
    finally { setCreativeLoading(false); }
  }, []);

  const handleRowClick = useCallback((row: Row) => {
    setSelectedRow(row);
    fetchCreative(row.id);
    onRowClick?.(row);
  }, [fetchCreative, onRowClick]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = safe(a.insights?.[sortKey] ?? 0);
    const bv = safe(b.insights?.[sortKey] ?? 0);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const allChecked = rows.length > 0 && checkedIds.size === rows.length;
  const toggleAll = () => {
    if (allChecked) setCheckedIds(new Set());
    else setCheckedIds(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setCheckedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  // dailyBudget excluded from SUM — sum of daily budgets across campaigns is misleading
  const SUM_KEYS = new Set(['spend', 'results', 'messages', 'purchases', 'impressions', 'clicks', 'reach', 'revenue']);
  // Keys that should ONLY read from insights (date-filtered), not row-level fallback
  const INSIGHTS_ONLY = new Set(['spend', 'results', 'messages', 'purchases', 'impressions', 'clicks', 'reach', 'revenue', 'costPerResult', 'costPerMessage', 'roas', 'costPerPurchase', 'avgPurchaseValue', 'cpm', 'ctr', 'frequency', 'adSpendPercent', 'closeRate']);
  const allData = allFilteredRows || sorted;
  const summaryRows = checkedIds.size > 0 ? allData.filter((r) => checkedIds.has(r.id)) : allData;
  const summary = useMemo(() => {
    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const row of summaryRows) {
      for (const col of columns) {
        // For insights-based columns, ONLY read from row.insights (date-filtered)
        // For row-level columns (dailyBudget), read from row directly
        const rawVal = INSIGHTS_ONLY.has(col.key)
          ? (row.insights?.[col.key] ?? 0)
          : (row.insights?.[col.key] ?? (row as Record<string, unknown>)[col.key] ?? 0);
        const val = safe(typeof rawVal === 'number' ? rawVal : Number(rawVal));
        if (!totals[col.key]) { totals[col.key] = 0; counts[col.key] = 0; }
        totals[col.key] += val;
        if (val > 0) counts[col.key]++;
      }
    }
    const result: Record<string, number> = {};
    for (const col of columns) {
      result[col.key] = SUM_KEYS.has(col.key) ? totals[col.key] || 0 : (counts[col.key] ? (totals[col.key] || 0) / counts[col.key] : 0);
    }
    return result;
  }, [summaryRows, columns]);

  // Use precomputed summary if provided (guarantees card = footer match)
  const finalSummary = checkedIds.size > 0 ? summary : (precomputedSummary || summary);

  const statusCls: Record<string, string> = {
    ACTIVE: 'bg-success/10 text-success',
    PAUSED: 'bg-warning/10 text-warning',
    CAMPAIGN_PAUSED: 'bg-warning/10 text-warning',
    ADSET_PAUSED: 'bg-warning/10 text-warning',
    ARCHIVED: 'bg-text-muted/10 text-text-muted',
    DELETED: 'bg-text-muted/10 text-text-muted',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: 'เปิดอยู่', PAUSED: 'หยุดชั่วคราว', CAMPAIGN_PAUSED: 'หยุดชั่วคราว',
    ADSET_PAUSED: 'หยุดชั่วคราว', ARCHIVED: 'ลบแล้ว', DELETED: 'ลบแล้ว',
  };

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-surface-lighter rounded animate-pulse" />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="text-center py-12 text-text-muted text-sm">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-muted border-b border-surface-lighter text-xs uppercase tracking-wider">
            <th className="py-3 px-2 w-8">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} className="rounded border-surface-lighter text-primary focus:ring-primary/30" />
            </th>
            <th className="text-left py-3 px-4 sticky left-12 bg-surface z-10">ชื่อ</th>
            <th className="text-center py-3 px-2">สถานะ</th>
            {(onBudgetEdit || onArchive) && <th className="text-center py-3 px-2">จัดการ</th>}
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`py-3 px-2 cursor-pointer hover:text-text select-none ${col.align === 'left' ? 'text-left' : 'text-right'}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (sortDir === 'desc' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-b border-surface-lighter/50 hover:bg-surface-light/50 cursor-pointer" onClick={() => handleRowClick(row)}>
              <td className="py-3 px-2 w-8" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={checkedIds.has(row.id)} onChange={() => toggleOne(row.id)} className="rounded border-surface-lighter text-primary focus:ring-primary/30" />
              </td>
              <td className="py-3 px-4 sticky left-12 bg-surface z-10 max-w-[220px]">
                <p className="font-medium truncate">{row.name}</p>
                <p className="text-[10px] text-text-muted font-mono truncate">{row.id}</p>
              </td>
              <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                {onToggleStatus && row.status !== 'ARCHIVED' && row.status !== 'DELETED' ? (
                  togglingId === row.id ? (
                    <span className="text-[10px] text-primary-light animate-pulse">กำลังเปลี่ยน...</span>
                  ) : (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newStatus = row.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
                        if (!window.confirm(`ต้องการเปลี่ยนเป็น ${newStatus === 'ACTIVE' ? 'เปิด' : 'หยุด'}?`)) return;
                        setTogglingId(row.id);
                        try {
                          await onToggleStatus(row.id, newStatus);
                        } finally {
                          setTogglingId(null);
                        }
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${row.status === 'ACTIVE' ? 'bg-success' : 'bg-surface-lighter'}`}
                      title={row.status === 'ACTIVE' ? 'หยุด' : 'เปิด'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${row.status === 'ACTIVE' ? 'translate-x-5' : ''}`} />
                    </button>
                  )
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusCls[row.status] || 'bg-surface-lighter text-text-muted'}`}>
                    {statusLabels[row.status] || row.status}
                  </span>
                )}
              </td>
              {/* Action buttons: budget edit + archive */}
              {(onBudgetEdit || onArchive) && (
                <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    {onBudgetEdit && row.status !== 'ARCHIVED' && row.status !== 'DELETED' && (
                      editBudgetId === row.id ? (
                        <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); onBudgetEdit(row.id, Number(editBudgetValue)); setEditBudgetId(null); }}>
                          <input type="number" value={editBudgetValue} onChange={(e) => setEditBudgetValue(e.target.value)} className="w-20 bg-surface-light border border-surface-lighter rounded px-2 py-0.5 text-xs" autoFocus />
                          <button type="submit" className="p-1 text-success"><Check className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => setEditBudgetId(null)} className="p-1 text-text-muted"><X className="w-3.5 h-3.5" /></button>
                        </form>
                      ) : (
                        <button onClick={() => { setEditBudgetId(row.id); setEditBudgetValue(String(safe((row as Record<string, unknown>).dailyBudget as number ?? 0))); }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-light hover:bg-surface-lighter text-text-muted hover:text-text text-xs" title="แก้ไขงบ">
                          <Pencil className="w-3 h-3" /> งบ
                        </button>
                      )
                    )}
                    {onArchive && (
                      confirmArchiveId === row.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { onArchive(row.id); setConfirmArchiveId(null); }} className="text-[10px] bg-danger text-white px-1.5 py-0.5 rounded">Archive</button>
                          <button onClick={() => setConfirmArchiveId(null)} className="text-[10px] text-text-muted px-1">ยกเลิก</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmArchiveId(row.id)} className="p-1 rounded hover:bg-surface-lighter text-text-muted hover:text-danger" title="Archive">
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </td>
              )}
              {columns.map((col) => {
                const rawVal = row.insights?.[col.key] ?? (row as Record<string, unknown>)[col.key] ?? 0;
                const val = safe(typeof rawVal === 'number' ? rawVal : Number(rawVal));
                const color = col.colorFn ? col.colorFn(val) : '';
                const label = col.key === 'results' && row.resultType ? RESULT_LABELS[row.resultType] : null;
                return (
                  <td key={col.key} className={`py-3 px-2 ${col.align === 'left' ? 'text-left' : 'text-right'} ${color}`}>
                    {col.format ? col.format(val) : val}
                    {label && <span className="text-[10px] text-text-muted ml-1">{label}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {/* Summary row */}
        <tfoot>
          <tr className="bg-surface-light border-t-2 border-primary/30 sticky bottom-0">
            <td className="py-3 px-2" />
            <td className="py-3 px-4 sticky left-12 bg-surface-light z-10 font-bold text-sm">
              {checkedIds.size > 0 ? `รวม (${checkedIds.size} ที่เลือก)` : `รวมทั้งหมด (${allData.length})`}
            </td>
            <td className="py-3 px-2" />
            {(onBudgetEdit || onArchive) && <td className="py-3 px-2" />}
            {columns.map((col) => (
              <td key={col.key} className="py-3 px-2 text-right font-bold text-sm">
                {col.format ? col.format(finalSummary[col.key] || 0) : (finalSummary[col.key] || 0)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      {/* Creative Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedRow(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold truncate">{selectedRow.name}</h2>
              <button onClick={() => setSelectedRow(null)} className="p-1 hover:bg-surface-light rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusCls[selectedRow.status] || 'bg-surface-lighter text-text-muted'}`}>
                {selectedRow.status}
              </span>
              {selectedRow.resultType && (
                <span className="text-xs text-text-muted">{RESULT_LABELS[selectedRow.resultType] || selectedRow.resultType}</span>
              )}
            </div>

            {/* Creative preview — from /api/fb/ads/{id}/creative endpoint */}
            {creativeLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
              </div>
            ) : (() => {
              // Use fetched creative data, fallback to row data
              const fullCreative = creativeData?.creative as Record<string, string> | undefined;
              const rowCreative = (selectedRow as Record<string, unknown>).creative as Record<string, string> | undefined;
              const creative = fullCreative || rowCreative;
              const postUrl = creativeData?.postUrl as string | undefined
                || (selectedRow as Record<string, unknown>).postUrl as string | undefined;

              // Image: prefer imageUrl (full-size from creative endpoint)
              const imgSrc = creative?.imageUrl || creative?.image_url
                || (creative?.thumbnailUrl || '').replace(/stp=.*?&/, 'stp=dst-jpg_s720x720&')
                || '';

              const previewHtml = creativeData?.previewHtml as string | undefined;

              return (
                <div className="space-y-3">
                  {/* Ad Preview iframe (from Facebook) or fallback to image */}
                  {previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full rounded-lg border border-surface-lighter"
                      style={{ minHeight: 400 }}
                      sandbox="allow-scripts allow-same-origin"
                      title="Ad Preview"
                    />
                  ) : imgSrc ? (
                    <img src={imgSrc} alt="" className="w-full rounded-lg max-h-[400px]" style={{ objectFit: 'contain', maxWidth: '100%' }} />
                  ) : null}
                  {creative?.title && <p className="font-semibold">{creative.title}</p>}
                  {creative?.body && <p className="text-sm text-text-muted whitespace-pre-line">{creative.body}</p>}

                  {/* Facebook link */}
                  <a
                    href={postUrl || `https://www.facebook.com/ads/library/?id=${selectedRow.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    {postUrl ? 'ดูโพสต์บน Facebook' : 'ดูใน Ad Library'}
                  </a>
                </div>
              );
            })()}

            {/* Ad ID */}
            <p className="text-xs text-text-muted font-mono">ID: {selectedRow.id}</p>

            {/* Metrics */}
            {selectedRow.insights && (
              <div className="grid grid-cols-3 gap-2">
                {['spend', 'clicks', 'results', 'roas', 'ctr', 'cpm'].map((key) => {
                  const val = safe(selectedRow.insights?.[key] ?? 0);
                  const col = columns.find((c) => c.key === key);
                  return (
                    <div key={key} className="bg-surface-light rounded-lg p-2.5">
                      <p className="text-[10px] text-text-muted">{col?.label || key}</p>
                      <p className="text-sm font-bold">{col?.format ? col.format(val) : val}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
