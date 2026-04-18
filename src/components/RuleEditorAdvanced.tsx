import { TrendingUp, Wallet, Clock, Sparkles, AlertTriangle } from 'lucide-react';
import Tabs from './Tabs';

export interface AdvancedProfit {
  target_roas: number | null;
  product_aov: number | null;
  margin_pct_ui: number | null;
  min_purchases: number;
}

export interface AdvancedBudget {
  daily_budget_cap: number | null;
  scaling_step_pct: number;
  cooldown_hours: number;
}

export interface AdvancedAuto {
  auto_pause_enabled: boolean;
  auto_resume_enabled: boolean;
  auto_clone_enabled: boolean;
  resume_hours: number[];
}

export interface AdvancedCreative {
  max_frequency: number | null;
  min_ctr_baseline: number | null;
  min_hook_rate: number;
  fatigue_action: 'reduce' | 'notify' | 'pause';
}

export interface AdvancedState {
  profit: AdvancedProfit;
  budget: AdvancedBudget;
  auto: AdvancedAuto;
  creative: AdvancedCreative;
}

export const DEFAULT_ADVANCED: AdvancedState = {
  profit: { target_roas: null, product_aov: null, margin_pct_ui: null, min_purchases: 0 },
  budget: { daily_budget_cap: null, scaling_step_pct: 15, cooldown_hours: 4 },
  auto: { auto_pause_enabled: false, auto_resume_enabled: false, auto_clone_enabled: false, resume_hours: [] },
  creative: { max_frequency: null, min_ctr_baseline: null, min_hook_rate: 15, fatigue_action: 'reduce' },
};

// BE payload is camelCase — read camelCase from rule responses and write camelCase on POST/PUT.
function readNum(rule: Record<string, unknown>, key: string): number | null {
  const v = rule[key];
  return typeof v === 'number' ? v : null;
}
function readBool(rule: Record<string, unknown>, key: string): boolean {
  return rule[key] === true || rule[key] === 1;
}

export function initAdvancedFromRule(rule: Record<string, unknown> | undefined | null): AdvancedState {
  if (!rule) return DEFAULT_ADVANCED;
  const marginDb = readNum(rule, 'productMarginPct');
  return {
    ...DEFAULT_ADVANCED,
    profit: {
      target_roas: readNum(rule, 'targetRoas'),
      product_aov: readNum(rule, 'productAov'),
      margin_pct_ui: marginDb != null ? marginDb * 100 : null,
      min_purchases: readNum(rule, 'minPurchases') ?? 0,
    },
    budget: {
      daily_budget_cap: readNum(rule, 'dailyBudgetCap'),
      scaling_step_pct: readNum(rule, 'scalingStepPct') ?? DEFAULT_ADVANCED.budget.scaling_step_pct,
      cooldown_hours: readNum(rule, 'cooldownHours') ?? DEFAULT_ADVANCED.budget.cooldown_hours,
    },
    auto: {
      auto_pause_enabled: readBool(rule, 'autoPauseEnabled'),
      auto_resume_enabled: DEFAULT_ADVANCED.auto.auto_resume_enabled,
      auto_clone_enabled: readBool(rule, 'cloneWinnerEnabled'),
      resume_hours: [],
    },
    creative: {
      max_frequency: readNum(rule, 'maxFrequency'),
      min_ctr_baseline: readNum(rule, 'minCtr'),
      min_hook_rate: DEFAULT_ADVANCED.creative.min_hook_rate,
      fatigue_action: DEFAULT_ADVANCED.creative.fatigue_action,
    },
  };
}

export function profitFieldsForPayload(p: AdvancedProfit) {
  return {
    targetRoas: p.target_roas ?? null,
    productAov: p.product_aov ?? null,
    productMarginPct: p.margin_pct_ui != null ? p.margin_pct_ui / 100 : null,
    minPurchases: p.min_purchases || 0,
  };
}

export function advancedFieldsForPayload(a: AdvancedState) {
  return {
    // Phase 2 — Profit
    ...profitFieldsForPayload(a.profit),
    breakevenCpaOverride: null as number | null,
    // Phase 3 — Budget
    dailyBudgetCap: a.budget.daily_budget_cap ?? null,
    scalingStepPct: a.budget.scaling_step_pct,
    cooldownHours: a.budget.cooldown_hours,
    // Phase 4 — Auto
    autoPauseEnabled: a.auto.auto_pause_enabled,
    autoPauseSpendMultiplier: 1.5,
    cloneWinnerEnabled: a.auto.auto_clone_enabled,
    cloneWinnerRoasMultiplier: 2.0,
    cloneWinnerConsecutiveDays: 3,
    // Phase 5 — Creative
    maxFrequency: a.creative.max_frequency ?? null,
    minCtr: a.creative.min_ctr_baseline ?? null,
  };
}

function countProfit(p: AdvancedProfit): number {
  let n = 0;
  if (p.target_roas != null && p.target_roas > 0) n++;
  if (p.product_aov != null && p.product_aov > 0) n++;
  if (p.margin_pct_ui != null && p.margin_pct_ui > 0) n++;
  if (p.min_purchases > 0) n++;
  return n;
}

function Badge({ count }: { count: number }) {
  if (count === 0) {
    return <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-lighter text-text-muted">Off</span>;
  }
  return <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary-light">{count}</span>;
}

const inputCls = 'w-full bg-surface-light border border-surface-lighter rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors';
const labelCls = 'block text-xs font-medium text-text-muted mb-1.5';
const helperCls = 'text-[11px] text-text-muted mt-1';

function NumberInput({
  value, onChange, placeholder, suffix, step, min, max,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  suffix?: string;
  step?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') onChange(null);
          else onChange(Number(raw));
        }}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className={inputCls + (suffix ? ' pr-10' : '')}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none">{suffix}</span>
      )}
    </div>
  );
}

function ProfitTab({
  profit,
  onChange,
  hasBudgetIncrease,
}: {
  profit: AdvancedProfit;
  onChange: (next: AdvancedProfit) => void;
  hasBudgetIncrease: boolean;
}) {
  const aov = profit.product_aov ?? 0;
  const marginPct = profit.margin_pct_ui ?? 0;
  const breakevenCpa = aov > 0 && marginPct > 0 ? aov * (marginPct / 100) : null;
  const showConflict = hasBudgetIncrease && !profit.target_roas;

  return (
    <div className="space-y-4">
      {showConflict && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            Action นี้คือ <span className="font-semibold">'เพิ่มงบ'</span> — แนะนำตั้ง Target ROAS ก่อน เพื่อกัน scale ตอนขาดทุน
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Target ROAS (ขั้นต่ำ)</label>
        <NumberInput
          value={profit.target_roas}
          onChange={(v) => onChange({ ...profit, target_roas: v })}
          placeholder="เช่น 2.0"
          suffix="×"
          step="0.1"
          min={0}
          max={20}
        />
        <p className={helperCls}>AI จะไม่ scale งบถ้า ROAS ต่ำกว่าค่านี้</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>มูลค่าออเดอร์เฉลี่ย (AOV)</label>
          <NumberInput
            value={profit.product_aov}
            onChange={(v) => onChange({ ...profit, product_aov: v })}
            placeholder="290"
            suffix="฿"
            step="1"
            min={0}
          />
          <p className={helperCls}>ราคาขายเฉลี่ยต่อออเดอร์</p>
        </div>
        <div>
          <label className={labelCls}>Margin (กำไรขั้นต้น)</label>
          <NumberInput
            value={profit.margin_pct_ui}
            onChange={(v) => onChange({ ...profit, margin_pct_ui: v })}
            placeholder="30"
            suffix="%"
            step="1"
            min={0}
            max={100}
          />
          <p className={helperCls}>สัดส่วนกำไรหลังหักต้นทุน</p>
        </div>
      </div>

      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[11px] text-emerald-200/70">Breakeven CPA (คำนวณ)</div>
            <div className="text-[10px] text-text-muted">= AOV × Margin</div>
          </div>
          <div className="text-lg font-bold text-emerald-200 tabular-nums">
            {breakevenCpa != null ? `฿${breakevenCpa.toFixed(2)}` : '—'}
          </div>
        </div>
        {breakevenCpa == null && (
          <p className="text-[11px] text-text-muted mt-1">กรอก AOV และ Margin เพื่อคำนวณ</p>
        )}
      </div>

      <div>
        <label className={labelCls}>Minimum Purchases (gate)</label>
        <NumberInput
          value={profit.min_purchases}
          onChange={(v) => onChange({ ...profit, min_purchases: v ?? 0 })}
          placeholder="0"
          suffix="ออเดอร์"
          step="1"
          min={0}
        />
        <p className={helperCls}>ป้องกันการตัดสินใจตอนข้อมูลน้อย</p>
      </div>
    </div>
  );
}

export function BudgetTab({
  budget,
  onChange,
}: {
  budget: AdvancedBudget;
  onChange: (next: AdvancedBudget) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Daily Budget Cap</label>
        <NumberInput
          value={budget.daily_budget_cap}
          onChange={(v) => onChange({ ...budget, daily_budget_cap: v })}
          placeholder="500"
          suffix="฿"
        />
        <p className={helperCls}>AI จะไม่เพิ่มงบเกินค่านี้ต่อวัน</p>
      </div>
      <div>
        <label className={labelCls}>Scaling Step ({budget.scaling_step_pct}%)</label>
        <input
          type="range"
          min={10}
          max={30}
          step={1}
          value={budget.scaling_step_pct}
          onChange={(e) => onChange({ ...budget, scaling_step_pct: Number(e.target.value) })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>10%</span>
          <span>20%</span>
          <span>30%</span>
        </div>
      </div>
      <div>
        <label className={labelCls}>Cool Down (ชั่วโมง)</label>
        <div className="flex gap-2">
          <NumberInput
            value={budget.cooldown_hours}
            onChange={(v) => onChange({ ...budget, cooldown_hours: v ?? 0 })}
            suffix="ชม."
            min={1}
            max={48}
          />
          <div className="flex gap-1">
            {[2, 4, 24].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onChange({ ...budget, cooldown_hours: h })}
                className={`px-2 py-1 rounded-md text-[11px] ${
                  budget.cooldown_hours === h
                    ? 'bg-primary/20 text-primary-light ring-1 ring-primary/40'
                    : 'bg-surface-lighter text-text-muted'
                }`}
              >
                {h === 24 ? '1 วัน' : `${h}ชม`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutoTab({
  auto,
  onChange,
  hours,
  onHoursChange,
}: {
  auto: AdvancedAuto;
  onChange: (next: AdvancedAuto) => void;
  hours: number[];
  onHoursChange: (next: number[]) => void;
}) {
  const toggleHour = (h: number) => {
    if (hours.includes(h)) onHoursChange(hours.filter((x) => x !== h));
    else onHoursChange([...hours, h].sort((a, b) => a - b));
  };
  return (
    <div className="space-y-2">
      <label className="rounded-lg border border-surface-lighter bg-surface-light/50 px-3 py-2.5 flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={auto.auto_pause_enabled}
          onChange={(e) => onChange({ ...auto, auto_pause_enabled: e.target.checked })}
          className="accent-primary rounded"
        />
        <span>⏸</span>
        <span className="font-medium">Auto-Pause เมื่อใช้งบเปล่า</span>
      </label>
      <label className="rounded-lg border border-surface-lighter bg-surface-light/50 px-3 py-2.5 flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={auto.auto_resume_enabled}
          onChange={(e) => onChange({ ...auto, auto_resume_enabled: e.target.checked })}
          className="accent-primary rounded"
        />
        <span>⏰</span>
        <span className="font-medium">Auto-Resume ตามช่วงเวลา</span>
      </label>
      <label className="rounded-lg border border-surface-lighter bg-surface-light/50 px-3 py-2.5 flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={auto.auto_clone_enabled}
          onChange={(e) => onChange({ ...auto, auto_clone_enabled: e.target.checked })}
          className="accent-primary rounded"
        />
        <span>✨</span>
        <span className="font-medium">Clone นางฟ้า (★)</span>
      </label>
      {auto.auto_resume_enabled && (
        <div className="pt-2">
          <div className="text-[11px] text-text-muted mb-1.5">
            Hour picker — Auto-Resume{hours.length > 0 ? ` · เลือกแล้ว ${hours.length} ชม.` : ''}
          </div>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 24 }, (_, h) => (
              <button
                key={h}
                type="button"
                onClick={() => toggleHour(h)}
                className={`aspect-square rounded text-[10px] transition ${
                  hours.includes(h)
                    ? 'bg-primary text-white'
                    : 'bg-surface-lighter text-text-muted hover:text-text'
                }`}
              >
                {String(h).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CreativeTab({
  creative,
  onChange,
}: {
  creative: AdvancedCreative;
  onChange: (next: AdvancedCreative) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Max Frequency (Ad Fatigue Alert)</label>
        <NumberInput
          value={creative.max_frequency}
          onChange={(v) => onChange({ ...creative, max_frequency: v })}
          placeholder="3.5"
          step="0.1"
        />
      </div>
      <div>
        <label className={labelCls}>Min CTR Baseline</label>
        <NumberInput
          value={creative.min_ctr_baseline}
          onChange={(v) => onChange({ ...creative, min_ctr_baseline: v })}
          placeholder="1.0"
          suffix="%"
        />
      </div>
      <div>
        <label className={labelCls}>Min Hook Rate ({creative.min_hook_rate}%)</label>
        <div className="relative h-8 flex items-center">
          <div className="relative w-full">
            <div className="h-2 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 via-emerald-400 to-violet-400" />
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={creative.min_hook_rate}
              onChange={(e) => onChange({ ...creative, min_hook_rate: Number(e.target.value) })}
              className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow ring-2 ring-primary-light pointer-events-none"
              style={{ left: `calc(${(creative.min_hook_rate / 50) * 100}% - 8px)` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>⚠ 15</span><span>healthy 25–30</span><span>top 35</span><span>unicorn 40+</span>
        </div>
      </div>
      <div>
        <label className={labelCls}>เมื่อพบ fatigue ให้ทำ</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: 'reduce' as const, l: 'ลดงบ' },
            { v: 'notify' as const, l: 'แจ้งเตือน' },
            { v: 'pause' as const, l: 'ปิดโฆษณา' },
          ].map((o) => (
            <label
              key={o.v}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs cursor-pointer transition ${
                creative.fatigue_action === o.v ? 'border-primary text-primary-light bg-primary/10' : 'border-surface-lighter text-text-muted hover:text-text'
              }`}
            >
              <input
                type="radio"
                name="fatigue_action"
                checked={creative.fatigue_action === o.v}
                onChange={() => onChange({ ...creative, fatigue_action: o.v })}
                className="accent-primary"
              />
              {o.l}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export { ProfitTab };

export default function RuleEditorAdvanced({
  value,
  onChange,
  hasBudgetIncrease,
}: {
  value: AdvancedState;
  onChange: (next: AdvancedState) => void;
  hasBudgetIncrease: boolean;
}) {
  const profitCount = countProfit(value.profit);

  return (
    <div className="rounded-xl border border-surface-lighter bg-surface/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary-light" />
        <h3 className="text-sm font-bold">Advanced</h3>
        <span className="text-[11px] text-text-muted">ตั้งค่า AI Guardrails (ตัวเลือก)</span>
      </div>
      <Tabs
        tabs={[
          {
            id: 'profit',
            label: <>Profit<Badge count={profitCount} /></>,
            icon: <TrendingUp className="w-3.5 h-3.5" />,
            content: (
              <ProfitTab
                profit={value.profit}
                onChange={(next) => onChange({ ...value, profit: next })}
                hasBudgetIncrease={hasBudgetIncrease}
              />
            ),
          },
          {
            id: 'budget',
            label: <>Budget</>,
            icon: <Wallet className="w-3.5 h-3.5" />,
            content: (
              <BudgetTab
                budget={value.budget}
                onChange={(next) => onChange({ ...value, budget: next })}
              />
            ),
          },
          {
            id: 'auto',
            label: <>Auto</>,
            icon: <Clock className="w-3.5 h-3.5" />,
            content: (
              <AutoTab
                auto={value.auto}
                onChange={(next) => onChange({ ...value, auto: next })}
                hours={value.auto.resume_hours || []}
                onHoursChange={(next) => onChange({ ...value, auto: { ...value.auto, resume_hours: next } })}
              />
            ),
          },
          {
            id: 'creative',
            label: <>Creative</>,
            icon: <Sparkles className="w-3.5 h-3.5" />,
            content: (
              <CreativeTab
                creative={value.creative}
                onChange={(next) => onChange({ ...value, creative: next })}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
