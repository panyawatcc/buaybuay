import { DollarSign, Eye, BarChart3, Target, ShoppingCart, TrendingUp, Percent } from 'lucide-react';
import type { InsightsRow } from '../hooks/useFacebookAPI';

interface Props {
  summary: InsightsRow | null;
  loading?: boolean;
}

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : n.toLocaleString();
const safe = (v: number) => Number.isFinite(v) ? v : 0;

export default function SummaryCards({ summary, loading }: Props) {
  const s = summary;
  const adSpendPct = s && safe(s.revenue) > 0 ? (safe(s.spend) / safe(s.revenue)) * 100 : 0;
  const closeRate = s && safe(s.results) > 0 ? (safe(s.purchases) / safe(s.results)) * 100 : 0;

  const CARDS = [
    { label: 'ค่าใช้จ่ายทั้งหมด', icon: DollarSign, color: 'text-danger', value: s ? `฿${safe(s.spend).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : null },
    { label: 'อิมเพรสชั่นทั้งหมด', icon: Eye, color: 'text-warning', value: s ? fmt(safe(s.impressions)) : null },
    { label: 'ผลลัพธ์', icon: BarChart3, color: 'text-primary', value: s ? safe(s.results).toLocaleString() : null },
    { label: 'ต้นทุนต่อผลลัพธ์', icon: Target, color: 'text-danger', value: s ? (safe(s.costPerResult) > 0 ? `฿${safe(s.costPerResult).toFixed(0)}` : '-') : null },
    { label: 'การซื้อ', icon: ShoppingCart, color: 'text-success', value: s ? safe(s.purchases).toLocaleString() : null },
    { label: 'คอนเวอร์ชั่นการซื้อ', icon: Target, color: 'text-danger', value: s ? (safe(s.costPerPurchase) > 0 ? `฿${safe(s.costPerPurchase).toFixed(0)}` : '-') : null },
    { label: 'ROAS', icon: TrendingUp, color: 'text-success', value: s ? `${safe(s.roas).toFixed(2)}` : null },
    { label: '%ค่าโฆษณา', icon: Percent, color: 'text-info', value: s ? (adSpendPct > 0 ? `${adSpendPct.toFixed(1)}%` : '-') : null },
    { label: '%การปิดการขาย', icon: Percent, color: 'text-primary-light', value: s ? (closeRate > 0 ? `${closeRate.toFixed(1)}%` : '-') : null },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-3">
      {CARDS.map(({ label, icon: Icon, color, value }) => (
        <div key={label} className="bg-surface rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">{label}</span>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          {loading ? (
            <div className="h-7 w-20 bg-surface-lighter rounded animate-pulse" />
          ) : (
            <p className="text-xl font-bold">{value || '-'}</p>
          )}
        </div>
      ))}
    </div>
  );
}
