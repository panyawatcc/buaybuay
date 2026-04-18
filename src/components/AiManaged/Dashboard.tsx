import { Play } from 'lucide-react';
import type { AiManagedState, AiManagedDecision, AiManagedActiveCampaign } from '../../hooks/useAiManaged';
import { formatDuration, formatClockTime } from '../../hooks/useAiManaged';
import FeatureCard from './FeatureCard';
import { FEATURES } from './features';

function DecisionRow({ d, onActivateClone }: { d: AiManagedDecision; onActivateClone?: (id: string) => void }) {
  const bg = d.highlight === 'violet' ? 'bg-violet-500/5 border-l-2 border-violet-500/60' : '';
  return (
    <div className={`px-4 py-3 border-b border-surface-lighter last:border-b-0 ${bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none shrink-0" aria-hidden>{d.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-semibold">{d.action_verb}</span>
            <span className="text-sm text-text-muted truncate">"{d.campaign_name}"</span>
          </div>
          <p className="text-xs text-text-muted mt-0.5 leading-snug">{d.reason_human}</p>
          {d.cta?.action === 'activate_clone' && (
            <button
              type="button"
              onClick={() => onActivateClone?.(d.id)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300 hover:text-violet-200"
            >
              <Play className="w-3 h-3" />
              {d.cta.label}
            </button>
          )}
        </div>
        <span className="text-[11px] text-text-muted tabular-nums shrink-0">{formatClockTime(d.executed_at)}</span>
      </div>
    </div>
  );
}

function CampaignChip({ c }: { c: AiManagedActiveCampaign }) {
  const color =
    c.status === 'scaling'
      ? 'text-emerald-300 bg-emerald-500/15 ring-emerald-500/30'
      : c.status === 'clone_pending'
      ? 'text-violet-300 bg-violet-500/15 ring-violet-500/30'
      : c.status === 'cooldown'
      ? 'text-amber-300 bg-amber-500/15 ring-amber-500/30'
      : 'text-text-muted bg-surface-lighter ring-surface-lighter';
  return (
    <div className="px-4 py-3 border-b border-surface-lighter last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{c.name}</p>
          <p className="text-xs text-text-muted mt-0.5 tabular-nums">
            ฿{c.budget} · {c.roas > 0 ? `ROAS ${c.roas.toFixed(1)}` : c.extra || '—'}
            {c.roas > 0 && c.purchases > 0 && ` · ${c.purchases} ออเดอร์`}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ring-1 ${color}`}>{c.status_label}</span>
      </div>
    </div>
  );
}

export default function AiManagedDashboard({
  state,
  onResume,
}: {
  state: AiManagedState;
  onResume: () => void;
}) {
  const stopped = state.status === 'stopped';
  const spendPct = state.today.cap ? Math.min(100, (state.today.spend / state.today.cap) * 100) : 0;

  return (
    <div className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto space-y-4 pb-28">
      {/* Hero status */}
      <div
        className={`rounded-2xl p-5 text-white shadow-lg ${
          stopped
            ? 'bg-gradient-to-br from-slate-700 to-slate-600 shadow-slate-900/20'
            : 'bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 shadow-teal-500/20'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex w-2.5 h-2.5">
            {!stopped && <span className="absolute inset-0 rounded-full bg-white/70 animate-ping" />}
            <span className={`relative w-2.5 h-2.5 rounded-full ${stopped ? 'bg-slate-300' : 'bg-white'}`} />
          </span>
          <span className="text-sm font-semibold">{stopped ? 'AI หยุดอยู่' : 'AI กำลังทำงาน'}</span>
        </div>
        <div className="text-3xl font-bold leading-tight tabular-nums">{state.active_campaigns.length} แคมเปญ</div>
        {!stopped && (
          <p className="text-xs text-white/85 mt-1">
            เริ่ม {formatDuration(state.started_at)}ที่แล้ว · ตัดสินใจไปแล้ว {state.today.actions_count} ครั้ง
          </p>
        )}
        {stopped && (
          <button
            type="button"
            onClick={onResume}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-sm font-semibold transition"
          >
            <Play className="w-4 h-4" />
            เปิด AI กลับ
          </button>
        )}
      </div>

      {/* Spend safety inline (keep 1-line safety signal) */}
      {state.today.cap != null && (
        <div className="rounded-xl bg-surface border border-surface-lighter px-3 py-2 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-text-muted">ใช้วันนี้</span>
              <span className="text-xs tabular-nums">
                <span className="font-bold">฿{state.today.spend}</span>
                <span className="text-text-muted"> / {state.today.cap}</span>
                <span className="text-text-muted"> · ROAS {state.today.roas.toFixed(1)}× · {state.today.purchases} ออเดอร์</span>
              </span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-surface-lighter overflow-hidden">
              <div className="h-full bg-primary-light" style={{ width: `${spendPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* 5 feature cards */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1 mb-2">ฟีเจอร์ AI</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.slug} feature={f} />
          ))}
        </div>
      </div>

      {/* Decision log + Active campaigns (side-by-side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-surface border border-surface-lighter overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-lighter">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-semibold">การตัดสินใจของ AI</h3>
            </div>
            <button type="button" className="text-[11px] text-primary-light hover:underline">
              ดูทั้งหมด
            </button>
          </div>
          {state.decisions.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-text-muted">
              AI กำลังเรียนรู้แคมเปญอยู่ — การตัดสินใจแรกจะมาภายใน 15–30 นาที
            </div>
          ) : (
            <div>
              {state.decisions.slice(0, 5).map((d) => (
                <DecisionRow key={d.id} d={d} />
              ))}
            </div>
          )}
        </div>

        {state.active_campaigns.length > 0 && (
          <div>
            <div className="px-1 mb-2">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">แคมเปญที่ AI ดูแล</h3>
            </div>
            <div className="rounded-2xl bg-surface border border-surface-lighter overflow-hidden">
              {state.active_campaigns.map((c) => (
                <CampaignChip key={c.id} c={c} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
