import { useState } from 'react';
import { RotateCcw, ChevronDown, Save, TrendingUp, Wallet, Clock, Sparkles } from 'lucide-react';
import type { AiManagedConfig } from '../../hooks/useAiManaged';
import { MOCK_CAMPAIGNS } from '../../hooks/useAiManaged';
import { useToast } from '../Toast';
import CampaignSelector from './CampaignSelector';
import {
  DEFAULT_ADVANCED,
  ProfitTab,
  BudgetTab,
  AutoTab,
  CreativeTab,
  type AdvancedState,
} from '../RuleEditorAdvanced';

function Accordion({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-surface border border-surface-lighter overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition"
      >
        <div className="p-2 rounded-lg bg-surface-lighter">{icon}</div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-text-muted">{subtitle}</div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-surface-lighter">{children}</div>}
    </div>
  );
}

export default function AiManagedSettings({
  config,
  isActive,
  onToggleActive,
  onUpdate,
  onReset,
}: {
  config: AiManagedConfig;
  isActive: boolean;
  onToggleActive: (next: boolean) => void;
  onUpdate: (patch: Partial<{ product_aov: number; margin_pct: number; daily_spend_cap: number | null; selected_campaign_ids: string[] | null }>) => void;
  onReset: () => void;
}) {
  const marginUi = Math.round(config.margin_pct * 100);
  const [telegramOn, setTelegramOn] = useState(true);
  const [emailOn, setEmailOn] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedState>(DEFAULT_ADVANCED);
  const { toast } = useToast();

  const saveGuardrails = () => {
    toast('บันทึก Guardrails แล้ว (mock)', 'success');
  };

  return (
    <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto space-y-4 pb-28">
      {/* Master toggle */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600/20 to-blue-600/10 border border-violet-500/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="text-base font-bold">จัดการโดย AI</h3>
              {isActive && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40">
                  เปิดอยู่
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1">AI จัดการโฆษณาให้แบบ set-and-forget</p>
          </div>
          <button
            type="button"
            onClick={() => onToggleActive(!isActive)}
            className={`relative w-12 h-7 rounded-full transition ${isActive ? 'bg-emerald-500' : 'bg-surface-lighter'}`}
            aria-label="toggle ai managed"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition ${
                isActive ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Basic values */}
      <div className="rounded-2xl bg-surface border border-surface-lighter p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">ค่าพื้นฐาน</h3>
          <p className="text-xs text-text-muted">ตั้งครั้งเดียวจาก Wizard — แก้ที่นี่ได้ทุกเมื่อ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">ราคาเฉลี่ย / ออเดอร์ (AOV)</label>
            <div className="relative">
              <input
                type="number"
                value={config.product_aov}
                onChange={(e) => onUpdate({ product_aov: Number(e.target.value) })}
                className="w-full bg-surface-light border border-surface-lighter rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-primary tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">฿</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-xs text-text-muted">กำไร / ออเดอร์</label>
              <span className="text-sm font-semibold text-primary-light tabular-nums">{marginUi}%</span>
            </div>
            <div className="relative h-10 flex items-center">
              <div className="relative w-full">
                <div className="h-2 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 via-emerald-400 to-violet-500" />
                <input
                  type="range"
                  min={5}
                  max={95}
                  step={5}
                  value={marginUi}
                  onChange={(e) => onUpdate({ margin_pct: Number(e.target.value) / 100 })}
                  className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow ring-2 ring-primary-light pointer-events-none"
                  style={{ left: `calc(${((marginUi - 5) / 90) * 100}% - 8px)` }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">งบสูงสุด / วัน</label>
            <div className="relative">
              <input
                type="number"
                value={config.daily_spend_cap ?? ''}
                placeholder="ไม่จำกัด"
                onChange={(e) => onUpdate({ daily_spend_cap: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full bg-surface-light border border-surface-lighter rounded-lg px-3 py-2.5 pr-14 text-sm focus:outline-none focus:border-primary tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">฿/วัน</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Selector */}
      <div className="rounded-2xl bg-surface border border-surface-lighter p-4">
        <h3 className="text-sm font-semibold">แคมเปญที่ให้ AI จัดการ</h3>
        <p className="text-xs text-text-muted mb-3">เลือกเฉพาะแคมเปญที่ต้องการ หรือให้ AI ดูแลทั้งหมด</p>
        <CampaignSelector
          campaigns={MOCK_CAMPAIGNS}
          selectedIds={config.selected_campaign_ids}
          onChange={(next) => onUpdate({ selected_campaign_ids: next })}
        />
      </div>

      {/* AI Guardrails — 4 accordion */}
      <div>
        <div className="flex items-baseline justify-between mb-2 px-1">
          <h3 className="text-sm font-semibold">AI Guardrails</h3>
          <button
            type="button"
            onClick={saveGuardrails}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-primary/20 text-primary-light hover:bg-primary/30 transition"
          >
            <Save className="w-3 h-3" />
            บันทึก Guardrails
          </button>
        </div>
        <div className="space-y-2">
          <Accordion
            icon={<TrendingUp className="w-4 h-4 text-emerald-300" />}
            title="Profit Gate"
            subtitle="Target ROAS · AOV · Margin · Min purchases"
          >
            <ProfitTab
              profit={advanced.profit}
              onChange={(next) => setAdvanced({ ...advanced, profit: next })}
              hasBudgetIncrease={false}
            />
          </Accordion>
          <Accordion
            icon={<Wallet className="w-4 h-4 text-sky-300" />}
            title="Budget Governance"
            subtitle="Cap · Scaling step · Cooldown"
          >
            <BudgetTab
              budget={advanced.budget}
              onChange={(next) => setAdvanced({ ...advanced, budget: next })}
            />
          </Accordion>
          <Accordion
            icon={<Clock className="w-4 h-4 text-amber-300" />}
            title="Auto Actions"
            subtitle="Auto-Pause · Auto-Resume · Clone นางฟ้า"
          >
            <AutoTab
              auto={advanced.auto}
              onChange={(next) => setAdvanced({ ...advanced, auto: next })}
              hours={advanced.auto.resume_hours || []}
              onHoursChange={(next) => setAdvanced({ ...advanced, auto: { ...advanced.auto, resume_hours: next } })}
            />
          </Accordion>
          <Accordion
            icon={<Sparkles className="w-4 h-4 text-violet-300" />}
            title="Creative Guardrails"
            subtitle="Frequency · CTR · Hook rate · Fatigue action"
          >
            <CreativeTab
              creative={advanced.creative}
              onChange={(next) => setAdvanced({ ...advanced, creative: next })}
            />
          </Accordion>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl bg-surface border border-surface-lighter p-4 space-y-3">
        <h3 className="text-sm font-semibold">แจ้งเตือนผ่าน</h3>
        <label className="flex items-center justify-between">
          <span className="text-sm">📱 Telegram</span>
          <button
            type="button"
            onClick={() => {
              setTelegramOn((v) => !v);
              toast(`Telegram ${!telegramOn ? 'เปิด' : 'ปิด'} แล้ว`, 'success');
            }}
            className={`relative w-10 h-6 rounded-full transition ${telegramOn ? 'bg-emerald-500' : 'bg-surface-lighter'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${telegramOn ? 'translate-x-4' : ''}`} />
          </button>
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm">✉️ อีเมล (สรุปทุกวัน)</span>
          <button
            type="button"
            onClick={() => {
              setEmailOn((v) => !v);
              toast(`อีเมล ${!emailOn ? 'เปิด' : 'ปิด'} แล้ว`, 'success');
            }}
            className={`relative w-10 h-6 rounded-full transition ${emailOn ? 'bg-emerald-500' : 'bg-surface-lighter'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${emailOn ? 'translate-x-4' : ''}`} />
          </button>
        </label>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl bg-rose-500/5 border border-rose-500/30 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">⚠</span>
          <h3 className="text-sm font-semibold text-rose-300">Danger zone</h3>
        </div>
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-sm font-medium transition"
          >
            <RotateCcw className="w-4 h-4" />
            รีเซ็ตค่าทั้งหมด (กลับไป Wizard)
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-rose-200">แน่ใจ? ค่าทั้งหมดจะหาย ต้องตั้งใหม่จาก Wizard</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 rounded-lg bg-surface-lighter text-text-muted text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  onReset();
                }}
                className="flex-1 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold"
              >
                ยืนยันรีเซ็ต
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
