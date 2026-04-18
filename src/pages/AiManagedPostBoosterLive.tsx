import { Link } from 'react-router-dom';
import { ChevronLeft, Rocket, Pause, Play, BarChart3, Plus } from 'lucide-react';
import { usePostBooster, formatCompact, type BoosterCampaign } from '../hooks/usePostBooster';
import { useToast } from '../components/Toast';

function CampaignCard({
  c,
  onPause,
  onResume,
  onBoostMore,
}: {
  c: BoosterCampaign;
  onPause: () => void;
  onResume: () => void;
  onBoostMore: () => void;
}) {
  const isPaused = c.status === 'paused';
  const isEnded = c.status === 'ended';
  const statusColor =
    c.status === 'active'
      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
      : c.status === 'paused'
      ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
      : 'bg-surface-lighter text-text-muted ring-surface-lighter';
  const statusLabel = c.status === 'active' ? 'Live' : c.status === 'paused' ? 'Paused' : 'Ended';

  return (
    <div className={`rounded-2xl bg-surface border border-surface-lighter p-4 ${isEnded ? 'opacity-75' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">{c.post_thumb_emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-tight line-clamp-1">{c.post_title}</p>
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            keyword "{c.keyword}" · {c.posts_count} โพสต์ · ฿{c.daily_budget}/วัน × {c.duration_days}วัน
          </p>
          {c.copywriter_used && (
            <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300">
              ✏️ Copywriter applied
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        <Metric label="Reach" value={formatCompact(c.metrics.reach)} />
        <Metric label="Eng." value={formatCompact(c.metrics.engagement)} />
        <Metric
          label="Orders"
          value={String(c.metrics.orders)}
          color={c.metrics.orders > 0 ? 'text-emerald-300' : undefined}
        />
        <Metric
          label="ROAS"
          value={c.metrics.roas > 0 ? `${c.metrics.roas.toFixed(1)}×` : '—'}
          color={
            c.metrics.roas >= 3 ? 'text-emerald-300' : c.metrics.roas >= 1 ? 'text-amber-300' : 'text-rose-300'
          }
        />
      </div>

      {!isEnded && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          <button
            type="button"
            onClick={onBoostMore}
            className="py-2 rounded-lg bg-cyan-500/15 text-cyan-200 text-xs font-medium hover:bg-cyan-500/25"
          >
            <span className="inline-flex items-center gap-1"><Plus className="w-3 h-3" />เพิ่มงบ</span>
          </button>
          {isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="py-2 rounded-lg bg-emerald-500/15 text-emerald-200 text-xs font-medium hover:bg-emerald-500/25"
            >
              <span className="inline-flex items-center gap-1"><Play className="w-3 h-3" />Resume</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              className="py-2 rounded-lg bg-amber-500/15 text-amber-200 text-xs font-medium hover:bg-amber-500/25"
            >
              <span className="inline-flex items-center gap-1"><Pause className="w-3 h-3" />หยุด</span>
            </button>
          )}
          <button
            type="button"
            className="py-2 rounded-lg bg-surface-light text-text-muted text-xs font-medium hover:bg-surface-lighter"
          >
            <span className="inline-flex items-center gap-1"><BarChart3 className="w-3 h-3" />รายละเอียด</span>
          </button>
        </div>
      )}

      {isEnded && (
        <p className="text-[11px] text-text-muted mt-2">
          จบแล้ว · รวม ฿{c.metrics.spend.toLocaleString()} → {c.metrics.orders} orders · ROAS {c.metrics.roas.toFixed(1)}×
        </p>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-surface-light px-2 py-2 text-center">
      <p className="text-[9px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold tabular-nums mt-0.5 ${color || 'text-text'}`}>{value}</p>
    </div>
  );
}

export default function AiManagedPostBoosterLive() {
  const { campaigns, loading, pauseJob, resumeJob, mockMode } = usePostBooster();
  const { toast } = useToast();

  const active = campaigns.filter((c) => c.status !== 'ended');
  const ended = campaigns.filter((c) => c.status === 'ended');

  const totals = active.reduce(
    (acc, c) => ({
      spend: acc.spend + c.metrics.spend,
      orders: acc.orders + c.metrics.orders,
    }),
    { spend: 0, orders: 0 }
  );

  return (
    <div className="pb-16">
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-1 pb-3 flex items-center gap-2">
        <Link to="/" className="p-2 -ml-1 rounded-full hover:bg-surface-light transition" aria-label="back">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-200">
          <Rocket className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold leading-tight">Post Booster · Live Status</h1>
          <p className="text-[10px] text-text-muted">ดูแคมเปญที่ AI ดันให้</p>
        </div>
        <Link
          to="/ad-launcher"
          className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
        >
          + Boost ใหม่
        </Link>
      </div>

      {mockMode && (
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-1 mb-3">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200 text-center">
            🧪 Mock mode — ข้อมูลจำลอง
          </div>
        </div>
      )}

      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto space-y-4">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white p-5 shadow-lg shadow-cyan-500/20">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-75">Active</p>
              <p className="text-2xl font-bold tabular-nums">{active.length}</p>
              <p className="text-[10px] opacity-75">campaigns</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-75">Spent</p>
              <p className="text-2xl font-bold tabular-nums">฿{formatCompact(totals.spend)}</p>
              <p className="text-[10px] opacity-75">สัปดาห์นี้</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-75">Orders</p>
              <p className="text-2xl font-bold tabular-nums">{totals.orders}</p>
              <p className="text-[10px] opacity-75">วันนี้</p>
            </div>
          </div>
        </div>

        {loading && <p className="text-center text-sm text-text-muted py-6">กำลังโหลด...</p>}

        {/* Active campaigns */}
        {!loading && active.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1 mb-2">
              Campaign ที่ทำงานอยู่
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {active.map((c) => (
                <CampaignCard
                  key={c.job_id}
                  c={c}
                  onPause={() => {
                    pauseJob(c.job_id);
                    toast(`หยุด "${c.post_title.slice(0, 18)}..." แล้ว`, 'success');
                  }}
                  onResume={() => {
                    resumeJob(c.job_id);
                    toast(`resume แล้ว`, 'success');
                  }}
                  onBoostMore={() => toast('เพิ่มงบ: ยังไม่พร้อม (mock)', 'info')}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && active.length === 0 && (
          <div className="rounded-2xl bg-surface border border-surface-lighter p-8 text-center">
            <div className="text-3xl mb-2">🚀</div>
            <p className="text-sm font-semibold mb-1">ยังไม่มี campaign ใดเลย</p>
            <p className="text-xs text-text-muted mb-3">เริ่มสร้าง campaign แรกจาก wizard</p>
            <Link
              to="/ad-launcher"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-200 text-sm font-semibold hover:bg-cyan-500/30"
            >
              + Boost ใหม่
            </Link>
          </div>
        )}

        {/* Ended campaigns */}
        {!loading && ended.length > 0 && (
          <details className="rounded-2xl bg-surface border border-surface-lighter overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer text-xs font-semibold text-text-muted uppercase tracking-wider hover:bg-surface-light">
              จบแล้ว ({ended.length})
            </summary>
            <div className="p-3 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {ended.map((c) => (
                <CampaignCard
                  key={c.job_id}
                  c={c}
                  onPause={() => {}}
                  onResume={() => {}}
                  onBoostMore={() => {}}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
