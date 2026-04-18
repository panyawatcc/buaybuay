import { useState, useEffect } from 'react';
import { Zap, ArrowRight, Search, X, Plus, Trash2, Info } from 'lucide-react';
import type { Rule, AdAccount } from '../hooks/useFacebookAPI';
import type { Campaign, AdSet, Ad } from '../shared/types';

const METRICS: { value: string; label: string; short: string }[] = [
  { value: 'amount_spent', label: 'จำนวนเงินที่ใช้จ่ายไป', short: 'เงินใช้จ่าย' },
  { value: 'results', label: 'ผลลัพธ์', short: 'ผลลัพธ์' },
  { value: 'cost_per_result', label: 'ต้นทุนต่อผลลัพธ์', short: 'ต้นทุน/ผลลัพธ์' },
  { value: 'messaging_conversations', label: 'การส่งข้อความเพื่อเริ่มการสนทนา', short: 'เริ่มสนทนา' },
  { value: 'cost_per_messaging_conversation', label: 'ต้นทุนการเริ่มสนทนาทางข้อความ', short: 'ต้นทุน/สนทนา' },
  { value: 'purchase_roas', label: 'ผลตอบแทนค่าโฆษณา (ROAS)', short: 'ผลตอบแทน' },
  { value: 'purchases', label: 'การซื้อ', short: 'การซื้อ' },
  { value: 'cost_per_purchase', label: 'ต้นทุนการซื้อ', short: 'ต้นทุน/ซื้อ' },
  { value: 'avg_purchase_conversion_value', label: 'มูลค่าคอนเวอร์ชันการซื้อเฉลี่ย', short: 'มูลค่าเฉลี่ย' },
  { value: 'cpm', label: 'ต้นทุนต่ออิมเพรสชัน (CPM)', short: 'ต้นทุน/แสดงผล' },
  { value: 'ctr_all', label: 'อัตราคลิก (ทั้งหมด)', short: 'อัตราคลิกทั้งหมด' },
  { value: 'clicks_all', label: 'จำนวนคลิก (ทั้งหมด)', short: 'คลิกทั้งหมด' },
  { value: 'reach', label: 'การเข้าถึง', short: 'การเข้าถึง' },
  { value: 'roas', label: 'ผลตอบแทนค่าโฆษณา', short: 'ผลตอบแทน' },
  { value: 'ctr', label: 'อัตราคลิก (%)', short: 'อัตราคลิก' },
  { value: 'cpc', label: 'ต้นทุนต่อคลิก', short: 'ต้นทุน/คลิก' },
  { value: 'cpa', label: 'ต้นทุนต่อคอนเวอร์ชัน', short: 'ต้นทุน/คอนเวอร์ชัน' },
  { value: 'spend', label: 'ค่าใช้จ่าย', short: 'ค่าใช้จ่าย' },
  { value: 'conversions', label: 'คอนเวอร์ชัน', short: 'คอนเวอร์ชัน' },
  { value: 'open_rate', label: 'อัตราการเปิด (%)', short: 'อัตราเปิด' },
  { value: 'open_rate_male', label: 'อัตราการเปิดชาย (%)', short: 'อัตราเปิดชาย' },
];

const OPERATORS: { value: string; label: string; short: string }[] = [
  { value: 'gt', label: 'มากกว่า (>)', short: 'มากกว่า' },
  { value: 'lt', label: 'น้อยกว่า (<)', short: 'น้อยกว่า' },
  { value: 'gte', label: 'มากกว่าหรือเท่ากับ (≥)', short: 'มากกว่าหรือเท่ากับ' },
  { value: 'lte', label: 'น้อยกว่าหรือเท่ากับ (≤)', short: 'น้อยกว่าหรือเท่ากับ' },
  { value: 'eq', label: 'เท่ากับ (=)', short: 'เท่ากับ' },
];

const ACTION_TYPES: { value: string; label: string; short: string; needsValue: boolean; valueLabel?: string; valueSuffix?: string; helper?: string }[] = [
  { value: 'budget_increase', label: 'เพิ่มงบประมาณ (%)', short: 'เพิ่มงบ', needsValue: true },
  { value: 'budget_decrease', label: 'ลดงบประมาณ (%)', short: 'ลดงบ', needsValue: true },
  { value: 'bid_increase', label: 'เพิ่มราคาประมูล (%)', short: 'เพิ่มราคาประมูล', needsValue: true },
  { value: 'bid_decrease', label: 'ลดราคาประมูล (%)', short: 'ลดราคาประมูล', needsValue: true },
  { value: 'pause', label: 'ปิดโฆษณา', short: 'ปิดโฆษณา', needsValue: false },
  { value: 'enable', label: 'เปิดแคมเปญ', short: 'เปิดแคมเปญ', needsValue: false },
  { value: 'telegram_notify', label: 'ส่งการแจ้งเตือนทางแชท', short: 'แจ้งเตือน', needsValue: false },
  { value: 'clone_ad', label: 'โคลนแอด (ad ใหม่ใน campaign เดิม)', short: 'โคลนแอด', needsValue: true, valueLabel: 'จำนวน (ชุด)', valueSuffix: 'ชุด', helper: 'สร้างโฆษณาใหม่ภายในแคมเปญเดิม — ใช้เมื่อแคมเปญ perform ดีและอยากเพิ่ม ad variations' },
  { value: 'clone_campaign', label: 'โคลนแคมเปญ (ทั้งแคมเปญ)', short: 'โคลนแคมเปญ', needsValue: false, helper: 'สร้างแคมเปญใหม่ทั้งชุด (campaign + adsets + ads) — แคมเปญใหม่จะเริ่มแบบ PAUSED ต้องกด active เอง แคมเปญเดิมยังทำงานต่อ' },
];

const FREQUENCIES: { value: string; label: string }[] = [
  { value: '5m', label: 'ทุก 5 นาที' },
  { value: '10m', label: 'ทุก 10 นาที' },
  { value: '15min', label: 'ทุก 15 นาที' },
  { value: '20m', label: 'ทุก 20 นาที' },
  { value: '30min', label: 'ทุก 30 นาที' },
  { value: '1h', label: 'ทุก 1 ชั่วโมง' },
  { value: '3h', label: 'ทุก 3 ชั่วโมง' },
  { value: '6h', label: 'ทุก 6 ชั่วโมง' },
  { value: 'daily', label: 'วันละครั้ง' },
];

const PERIODS: { value: string; label: string }[] = [
  { value: 'last_7d', label: '7 วัน' },
  { value: 'last_14d', label: '14 วัน' },
  { value: 'last_30d', label: '30 วัน' },
  { value: 'last_90d', label: '90 วัน' },
  { value: 'all_time', label: 'ตลอด' },
  { value: 'custom', label: 'กำหนดเอง' },
];

interface Props {
  rule?: Rule;
  accountId: string;
  adAccounts?: AdAccount[];
  campaigns?: Campaign[];
  adSets?: AdSet[];
  ads?: Ad[];
  onSave: (data: Omit<Rule, 'id' | 'createdAt' | 'lastTriggeredAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export default function RuleEditor({ rule, accountId, adAccounts = [], campaigns = [], adSets = [], ads = [], onSave, onCancel }: Props) {
  const [selectedAccount, setSelectedAccount] = useState(rule?.accountId || accountId);
  const [name, setName] = useState(rule?.name || '');

  // Multi-condition support
  interface ConditionItem { id: number; metric: string; operator: string; threshold: number; }
  const initConditions = (): ConditionItem[] => {
    const base = rule?.condition;
    const first: ConditionItem = { id: 0, metric: base?.metric || 'roas', operator: base?.operator || 'gt', threshold: base?.value ?? 3.0 };
    // Load extra conditions from rule if available
    const extras: ConditionItem[] = ((rule as any)?.conditions || []).map((c: any, i: number) => ({ id: i + 1, ...c }));
    return extras.length > 0 ? [first, ...extras] : [first];
  };
  const [conditions, setConditions] = useState<ConditionItem[]>(initConditions);
  const [conditionLogic, setConditionLogic] = useState<'and' | 'or'>(((rule as any)?.conditionLogic) || 'and');
  const [nextCondId, setNextCondId] = useState(() => conditions.length);
  const [period, setPeriod] = useState(rule?.condition.period || 'last_7d');

  // Multi-action support
  interface ActionItem { id: number; type: string; value: number; maxBudget: number; cloneStatus: 'PAUSED' | 'ACTIVE'; }
  const readCloneStatus = (a: any): 'PAUSED' | 'ACTIVE' =>
    a?.action_params?.clone_status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
  const initActions = (): ActionItem[] => {
    const base = rule?.action;
    const first: ActionItem = { id: 0, type: base?.type || 'budget_increase', value: base?.value ?? 20, maxBudget: base?.maxBudget ?? 5000, cloneStatus: readCloneStatus(base) };
    const extras: ActionItem[] = ((rule as any)?.actions || []).map((a: any, i: number) => ({ id: i + 1, type: a.type, value: a.value ?? 0, maxBudget: a.maxBudget ?? 5000, cloneStatus: readCloneStatus(a) }));
    return extras.length > 0 ? [first, ...extras] : [first];
  };
  const [actions, setActions] = useState<ActionItem[]>(initActions);
  const [actionLogic, setActionLogic] = useState<'and' | 'or'>(((rule as any)?.actionLogic) || 'and');
  const [nextActId, setNextActId] = useState(() => actions.length);
  // cooldown: ป้องกัน trigger ซ้ำใน X นาที (0 = no cooldown)
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(((rule as any)?.cooldown_minutes) ?? ((rule as any)?.cooldownMinutes) ?? 0);
  // budget safety cap: max % change per trigger (default 100 = no extra cap)
  const [maxBudgetChangePercent, setMaxBudgetChangePercent] = useState<number>(((rule as any)?.max_budget_change_percent) ?? 100);
  // trigger mode: absolute = fire whenever condition true; incremental = fire only when value increased from last check
  const [triggerMode, setTriggerMode] = useState<'absolute' | 'incremental'>(
    ((rule as any)?.trigger_mode) === 'incremental' ? 'incremental' : 'absolute',
  );
  const [budgetReset, setBudgetReset] = useState((rule as any)?.budgetReset ?? false);
  const [resetTime, setResetTime] = useState((rule as any)?.resetTime || '00:00');
  const [targetLevel, setTargetLevel] = useState<'campaign' | 'adset' | 'ad'>((rule as any)?.targetLevel || 'campaign');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(rule?.campaignIds || (rule as any)?.adSetIds || (rule as any)?.adIds || []);
  const [itemSearch, setItemSearch] = useState('');
  const [frequency, setFrequency] = useState('1h');
  const [customDays, setCustomDays] = useState(5);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  // Extra rules for batch creation
  interface ExtraRule { id: number; name: string; metric: string; operator: string; threshold: number; period: string; actionType: string; actionValue: number; maxBudget: number; }
  const [extraRules, setExtraRules] = useState<ExtraRule[]>([]);
  const [nextExtraId, setNextExtraId] = useState(1);

  // Auto-select if only one account
  useEffect(() => {
    if (adAccounts.length === 1 && !rule) setSelectedAccount(adAccounts[0].id);
  }, [adAccounts, rule]);

  // Reset form when rule prop changes
  useEffect(() => {
    setSelectedAccount(rule?.accountId || accountId);
    setName(rule?.name || '');
    setConditions([{ id: 0, metric: rule?.condition.metric || 'roas', operator: rule?.condition.operator || 'gt', threshold: rule?.condition.value ?? 3.0 }]);
    setConditionLogic(((rule as any)?.conditionLogic) || 'and');
    setNextCondId(1);
    setPeriod(rule?.condition.period || 'last_7d');
    setActions([{ id: 0, type: rule?.action.type || 'budget_increase', value: rule?.action.value ?? 20, maxBudget: rule?.action.maxBudget ?? 5000, cloneStatus: readCloneStatus(rule?.action) }]);
    setActionLogic(((rule as any)?.actionLogic) || 'and');
    setNextActId(1);
    setCooldownMinutes(((rule as any)?.cooldown_minutes) ?? ((rule as any)?.cooldownMinutes) ?? 0);
    setMaxBudgetChangePercent(((rule as any)?.max_budget_change_percent) ?? 100);
    setTriggerMode(((rule as any)?.trigger_mode) === 'incremental' ? 'incremental' : 'absolute');
    setBudgetReset((rule as any)?.budgetReset ?? false);
    setResetTime((rule as any)?.resetTime || '00:00');
    setTargetLevel((rule as any)?.targetLevel || 'campaign');
    setSelectAll(!rule?.campaignIds && !(rule as any)?.adSetIds && !(rule as any)?.adIds);
    setSelectedIds(rule?.campaignIds || (rule as any)?.adSetIds || (rule as any)?.adIds || []);
    setItemSearch('');
    setErrors({});
  }, [rule]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'กรุณาตั้งชื่อกฎ';
    conditions.forEach((c, i) => {
      if (c.threshold <= 0) errs[`threshold_${i}`] = 'กรุณากรอกค่าที่ถูกต้อง';
    });
    actions.forEach((act, i) => {
      const actDef = ACTION_TYPES.find((a) => a.value === act.type);
      if (actDef?.needsValue && act.value <= 0) errs[`actionValue_${i}`] = actDef.valueLabel ? 'กรุณากรอกค่า' : 'กรุณากรอกค่า %';
      if (actDef?.needsValue && !actDef.valueSuffix && act.value > 100) errs[`actionValue_${i}`] = 'ค่าต้องไม่เกิน 100%';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const effectivePeriod = period === 'custom' ? `last_${customDays}d` : period;

  const buildActionParams = (a: { type: string; cloneStatus: 'PAUSED' | 'ACTIVE' }) => {
    if (a.type === 'clone_ad' || a.type === 'clone_campaign') {
      return { action_params: { clone_status: a.cloneStatus } };
    }
    return {};
  };

  const buildRuleData = () => ({
    name,
    accountId: selectedAccount,
    campaignIds: targetLevel === 'campaign' && !selectAll && selectedIds.length > 0 ? selectedIds : null,
    ...(targetLevel === 'adset' && !selectAll && selectedIds.length > 0 ? { adSetIds: selectedIds } : {}),
    ...(targetLevel === 'ad' && !selectAll && selectedIds.length > 0 ? { adIds: selectedIds } : {}),
    ...(targetLevel !== 'campaign' ? { targetLevel } : {}),
    isActive: rule?.isActive ?? true,
    condition: { metric: conditions[0].metric, operator: conditions[0].operator, value: conditions[0].threshold, period: effectivePeriod },
    ...(conditions.length > 1 ? {
      conditions: conditions.map((c) => ({ metric: c.metric, operator: c.operator, value: c.threshold })),
      conditionLogic: conditionLogic,
    } : {}),
    action: {
      type: actions[0].type,
      value: actions[0].value,
      unit: 'percent',
      maxBudget: actions[0].maxBudget,
      ...(buildActionParams(actions[0])),
    },
    ...(actions.length > 1 ? {
      actions: actions.map((a) => ({
        type: a.type,
        value: a.value,
        unit: 'percent',
        maxBudget: a.maxBudget,
        ...(buildActionParams(a)),
      })),
      actionLogic: actionLogic,
    } : {}),
    cooldownHours: 0,
    cooldown_minutes: cooldownMinutes,
    max_budget_change_percent: maxBudgetChangePercent,
    trigger_mode: triggerMode,
    ...(budgetReset ? { budgetReset: true, resetTime } : {}),
  });

  const handleSave = () => {
    if (!validate()) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      // Save main rule
      await onSave(buildRuleData());
      // Save extra rules
      for (const er of extraRules) {
        await onSave({
          name: er.name,
          accountId: selectedAccount,
          campaignIds: selectAll ? null : (selectedIds.length > 0 ? selectedIds : null),
          isActive: true,
          condition: { metric: er.metric, operator: er.operator, value: er.threshold, period: er.period },
          action: { type: er.actionType, value: er.actionValue, unit: 'percent', maxBudget: er.maxBudget },
          cooldownHours: 0,
        });
      }
      setExtraRules([]);
    } finally {
      setSaving(false);
    }
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, { id: nextCondId, metric: 'roas', operator: 'gt', threshold: 3 }]);
    setNextCondId((n) => n + 1);
  };

  const updateCondition = (id: number, field: string, value: string | number) => {
    setConditions((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCondition = (id: number) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const addAction = () => {
    setActions((prev) => [...prev, { id: nextActId, type: 'budget_increase', value: 20, maxBudget: 5000, cloneStatus: 'PAUSED' }]);
    setNextActId((n) => n + 1);
  };

  const updateAction = (id: number, field: string, value: string | number) => {
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, [field]: value } : a));
  };

  const removeAction = (id: number) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const addExtraRule = () => {
    setExtraRules((prev) => [...prev, { id: nextExtraId, name: '', metric: 'roas', operator: 'gt', threshold: 3, period: 'last_7d', actionType: 'budget_increase', actionValue: 20, maxBudget: 5000 }]);
    setNextExtraId((n) => n + 1);
  };

  const updateExtraRule = (id: number, field: string, value: string | number) => {
    setExtraRules((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeExtraRule = (id: number) => {
    setExtraRules((prev) => prev.filter((r) => r.id !== id));
  };

  const inputCls = 'w-full bg-surface-light border border-surface-lighter rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors';
  const labelCls = 'block text-xs font-medium text-text-muted mb-1.5';
  const errorCls = 'text-xs text-danger mt-1';

  // Live preview helpers
  const getMetricShort = (v: string) => METRICS.find((m) => m.value === v)?.short || v;
  const getOpShort = (v: string) => OPERATORS.find((o) => o.value === v)?.short || v;
  const getActionDef = (v: string) => ACTION_TYPES.find((a) => a.value === v);
  const periodLabel = period === 'custom' ? `${customDays} วัน` : (PERIODS.find((p) => p.value === period)?.label || period);
  const logicLabel = conditionLogic === 'and' ? 'และ' : 'หรือ';
  const actionLogicLabel = actionLogic === 'and' ? 'และ' : 'หรือ';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary-light" />
        <h2 className="text-lg font-bold">{rule ? 'แก้ไขกฎ' : 'สร้างกฎใหม่'}</h2>
      </div>

      {/* ชื่อกฎ */}
      <div>
        <label className={labelCls}>ชื่อกฎ</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="เช่น ปิดโฆษณา ROAS ต่ำ"
        />
        {errors.name && <p className={errorCls}>{errors.name}</p>}
      </div>

      {/* บัญชีโฆษณา */}
      {adAccounts.length > 1 ? (
        <div>
          <label className={labelCls}>บัญชีโฆษณา</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className={inputCls}
          >
            {adAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.id})
              </option>
            ))}
          </select>
        </div>
      ) : adAccounts.length === 1 ? (
        <div>
          <label className={labelCls}>บัญชีโฆษณา</label>
          <p className="text-sm bg-surface-light rounded-lg px-3 py-2.5 text-text-muted">
            {adAccounts[0].name} ({adAccounts[0].id})
          </p>
        </div>
      ) : null}

      {/* ถ้า (IF) — multi-condition */}
      <div className="rounded-xl border border-info/30 bg-info/5 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-info bg-info/10 px-2 py-0.5 rounded">ถ้า</span>
          <span className="text-sm text-text-muted">เงื่อนไข</span>
        </div>

        {conditions.map((cond, idx) => (
          <div key={cond.id}>
            {/* AND/OR separator between conditions */}
            {idx > 0 && (
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-info/20" />
                <select
                  value={conditionLogic}
                  onChange={(e) => setConditionLogic(e.target.value as 'and' | 'or')}
                  className="text-xs font-bold text-info bg-info/10 border border-info/30 rounded-lg px-3 py-1 focus:outline-none"
                >
                  <option value="and">และ (AND)</option>
                  <option value="or">หรือ (OR)</option>
                </select>
                <div className="flex-1 h-px bg-info/20" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 relative">
              {/* ปุ่มลบเงื่อนไข (ไม่แสดงถ้ามีแค่ 1) */}
              {conditions.length > 1 && (
                <button onClick={() => removeCondition(cond.id)} className="absolute -top-1 -right-1 p-0.5 bg-surface rounded-full text-text-muted hover:text-danger z-10">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <div>
                <label className={labelCls}>ตัวชี้วัด</label>
                <select value={cond.metric} onChange={(e) => updateCondition(cond.id, 'metric', e.target.value)} className={inputCls}>
                  {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>เงื่อนไข</label>
                <select value={cond.operator} onChange={(e) => updateCondition(cond.id, 'operator', e.target.value)} className={inputCls}>
                  {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>เกณฑ์</label>
                <input
                  type="number"
                  step="0.1"
                  value={cond.threshold}
                  onChange={(e) => updateCondition(cond.id, 'threshold', Number(e.target.value))}
                  className={inputCls}
                  placeholder="เช่น 1.5"
                />
                {errors[`threshold_${idx}`] && <p className={errorCls}>{errors[`threshold_${idx}`]}</p>}
              </div>
            </div>
          </div>
        ))}

        {/* + เพิ่มเงื่อนไข */}
        <button
          type="button"
          onClick={addCondition}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-info/30 text-xs text-info hover:bg-info/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          เพิ่มเงื่อนไข
        </button>

        <div>
          <label className={labelCls}>ช่วงเวลาพิจารณา</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={inputCls}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {period === 'custom' && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="90"
                value={customDays}
                onChange={(e) => setCustomDays(Number(e.target.value))}
                className={inputCls + ' !w-20'}
              />
              <span className="text-sm text-text-muted">วัน</span>
            </div>
          )}
        </div>
      </div>

      {/* ลูกศร */}
      <div className="flex justify-center">
        <ArrowRight className="w-6 h-6 text-text-muted rotate-90" />
      </div>

      {/* แล้วทำ (THEN) — multi-action */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-primary-light bg-primary/10 px-2 py-0.5 rounded">แล้วทำ</span>
          <span className="text-sm text-text-muted">การกระทำ</span>
        </div>

        {actions.map((act, idx) => {
          const actDef = getActionDef(act.type);
          return (
            <div key={act.id}>
              {/* AND/OR separator between actions */}
              {idx > 0 && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-primary/20" />
                  <select
                    value={actionLogic}
                    onChange={(e) => setActionLogic(e.target.value as 'and' | 'or')}
                    className="text-xs font-bold text-primary-light bg-primary/10 border border-primary/30 rounded-lg px-3 py-1 focus:outline-none"
                  >
                    <option value="and">และ (AND)</option>
                    <option value="or">หรือ (OR)</option>
                  </select>
                  <div className="flex-1 h-px bg-primary/20" />
                </div>
              )}

              <div className="space-y-2 relative">
                {actions.length > 1 && (
                  <button onClick={() => removeAction(act.id)} className="absolute -top-1 -right-1 p-0.5 bg-surface rounded-full text-text-muted hover:text-danger z-10">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <div>
                  <label className={labelCls}>เมื่อตรงเงื่อนไข ให้ทำ</label>
                  <select value={act.type} onChange={(e) => updateAction(act.id, 'type', e.target.value)} className={inputCls}>
                    {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  {actDef?.helper && (
                    <p className="mt-1 flex items-start gap-1 text-[11px] text-text-muted leading-snug">
                      <Info className="w-3 h-3 mt-[2px] shrink-0 text-primary-light" />
                      <span>{actDef.helper}</span>
                    </p>
                  )}
                </div>
                {actDef?.needsValue && (
                  <div className={act.type === 'clone_ad' ? '' : 'grid grid-cols-2 gap-3'}>
                    <div>
                      <label className={labelCls}>{actDef.valueLabel || 'ค่า (%)'}</label>
                      <input type="number" min="1" value={act.value} onChange={(e) => updateAction(act.id, 'value', Number(e.target.value))} className={inputCls} placeholder={act.type === 'clone_ad' ? 'เช่น 3' : 'เช่น 20'} />
                      {errors[`actionValue_${idx}`] && <p className={errorCls}>{errors[`actionValue_${idx}`]}</p>}
                    </div>
                    {act.type !== 'clone_ad' && <div>
                      <label className={labelCls}>งบประมาณสูงสุด (฿)</label>
                      <input type="number" value={act.maxBudget} onChange={(e) => updateAction(act.id, 'maxBudget', Number(e.target.value))} className={inputCls} />
                    </div>}
                  </div>
                )}
                {(act.type === 'clone_ad' || act.type === 'clone_campaign') && (
                  <label
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      act.cloneStatus === 'ACTIVE'
                        ? 'border-warning/60 bg-warning/10'
                        : 'border-surface-lighter bg-surface/40 hover:border-surface-lighter/80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={act.cloneStatus === 'ACTIVE'}
                      onChange={(e) => updateAction(act.id, 'cloneStatus', e.target.checked ? 'ACTIVE' : 'PAUSED')}
                      className="mt-0.5 accent-warning shrink-0"
                    />
                    <span className="flex-1 text-xs leading-snug">
                      <span className="font-medium text-text">เริ่มใช้งานทันที (ACTIVE)</span>
                      {act.cloneStatus === 'ACTIVE' ? (
                        <span className="block mt-0.5 text-warning">
                          ⚠️ {act.type === 'clone_campaign' ? 'แคมเปญที่ clone' : 'โฆษณาที่ clone'}จะใช้งบทันที — ใช้เฉพาะกรณีที่มั่นใจ
                        </span>
                      ) : (
                        <span className="block mt-0.5 text-text-muted">
                          Default: สร้างแบบ PAUSED (ปลอดภัย) — กด active เองหลัง review
                        </span>
                      )}
                    </span>
                  </label>
                )}
              </div>
            </div>
          );
        })}

        {/* + เพิ่มการกระทำ */}
        <button
          type="button"
          onClick={addAction}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-primary/30 text-xs text-primary-light hover:bg-primary/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          เพิ่มการกระทำ
        </button>

        {/* Trigger controls + safety caps (rule-level) */}
        <div className="pt-2 border-t border-surface-lighter space-y-3">
          <div>
            <label className={labelCls}>กระทำเมื่อ</label>
            <select
              value={triggerMode}
              onChange={(e) => setTriggerMode(e.target.value === 'incremental' ? 'incremental' : 'absolute')}
              className={inputCls}
            >
              <option value="absolute">ทุกครั้งที่เงื่อนไขเป็นจริง</option>
              <option value="incremental">เฉพาะเมื่อค่าเปลี่ยน (เพิ่มขึ้น)</option>
            </select>
            <p className="mt-1 flex items-start gap-1 text-[11px] text-text-muted leading-snug">
              <Info className="w-3 h-3 mt-[2px] shrink-0 text-primary-light" />
              <span>
                {triggerMode === 'incremental'
                  ? 'เหมาะสำหรับ rule ที่ค่าค่อยๆ เพิ่ม เช่น คนทัก / spend / impressions — trigger เฉพาะตอนค่าเพิ่มจากครั้งก่อน'
                  : 'เหมาะสำหรับ rule ที่ self-limit เช่น auto_pause (หยุดแล้วไม่ trigger ซ้ำ) — default behavior'}
              </span>
            </p>
          </div>
          {/* Cooldown (นาที) field removed per Golf 2026-04-18 (paired with
              budget-change-limit removal). cooldownMinutes state stays at
              default 0 (== "no cooldown") and still flows into
              buildRuleData() → cooldown_minutes payload. BE evaluate.ts
              treats 0 as no-op, so existing rules behave identically.
              Restore this block + the adjacent budget-change-limit block
              if the UI controls need to come back. */}
        </div>
      </div>

      {/* เลือกระดับที่ตรวจสอบ (แคมเปญ/ชุดโฆษณา/โฆษณา) */}
      {campaigns.length > 0 && (() => {
        const LEVELS = [
          { value: 'campaign' as const, label: 'แคมเปญ' },
          { value: 'adset' as const, label: 'ชุดโฆษณา' },
          { value: 'ad' as const, label: 'โฆษณา' },
        ];
        const levelLabel = LEVELS.find((l) => l.value === targetLevel)?.label || 'แคมเปญ';
        const items: { id: string; name: string; status: string }[] =
          targetLevel === 'campaign' ? campaigns :
          targetLevel === 'adset' ? adSets.map((s) => ({ id: s.id, name: s.name, status: s.status })) :
          ads.map((a) => ({ id: a.id, name: a.name, status: a.status }));

        return (
          <div>
            <label className={labelCls}>ระดับที่ตรวจสอบ</label>
            <div className="flex gap-1 mb-3">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => { setTargetLevel(l.value); setSelectAll(false); setSelectedIds([]); setItemSearch(''); }}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    targetLevel === l.value
                      ? 'bg-primary/15 text-primary-light ring-1 ring-primary/30'
                      : 'bg-surface-light text-text-muted hover:bg-surface-lighter'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => { setSelectAll(e.target.checked); if (e.target.checked) setSelectedIds([]); }}
                className="accent-primary rounded"
              />
              <span className="font-medium">เลือกทั้งหมด</span>
              <span className="text-[11px] text-text-muted">({items.length} {levelLabel})</span>
            </label>

            {!selectAll && (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-text-muted" />
                  <input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className={inputCls + ' !pl-8'}
                    placeholder={`ค้นหา${levelLabel}...`}
                  />
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto bg-surface-light rounded-lg p-2.5">
                  {items
                    .filter((item) => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
                    .map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-surface-lighter rounded px-1.5 py-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                            );
                          }}
                          className="accent-primary rounded"
                        />
                        <span className="truncate">{item.name}</span>
                        <span className={`text-[10px] ml-auto shrink-0 ${item.status === 'ACTIVE' ? 'text-success' : 'text-text-muted'}`}>
                          {item.status === 'ACTIVE' ? 'ทำงานอยู่' : 'หยุด'}
                        </span>
                      </label>
                    ))}
                  {items.length === 0 && (
                    <p className="text-xs text-text-muted text-center py-2">ไม่พบ{levelLabel}</p>
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-1.5">
                  {selectedIds.length === 0
                    ? `กรุณาเลือกอย่างน้อย 1 ${levelLabel} หรือเลือกทั้งหมด`
                    : `เลือก ${selectedIds.length} ${levelLabel}`}
                </p>
              </>
            )}
          </div>
        );
      })()}

      {/* ให้กระทำทุกๆ */}
      <div>
        <label className={labelCls}>ให้กระทำทุกๆ</label>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputCls}>
          {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* ปรับงบกลับมาที่เดิม */}
      <div className="space-y-3">
        <label className={labelCls}>ปรับงบกลับมาที่เดิม</label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="radio"
            name="budgetReset"
            checked={!budgetReset}
            onChange={() => setBudgetReset(false)}
            className="accent-primary mt-0.5"
          />
          <div>
            <p className="text-sm font-medium">ไม่ปรับงบ</p>
            <p className="text-[11px] text-text-muted">งบจะรันต่อตามที่บอทปรับไว้</p>
          </div>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="radio"
            name="budgetReset"
            checked={budgetReset}
            onChange={() => setBudgetReset(true)}
            className="accent-primary mt-0.5"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">ปรับงบกลับ</p>
            <p className="text-[11px] text-text-muted">งบจะกลับมาเท่าเดิมก่อนบอทปรับ ตามเวลาที่กำหนด</p>
            {budgetReset && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-text-muted">กลับมาตอน</span>
                <select
                  value={resetTime}
                  onChange={(e) => setResetTime(e.target.value)}
                  className={inputCls + ' !w-28'}
                >
                  {Array.from({ length: 24 }, (_, h) => {
                    const t = `${String(h).padStart(2, '0')}:00`;
                    return <option key={t} value={t}>{t}</option>;
                  })}
                </select>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* กฎเพิ่มเติม (multi-rule) */}
      {!rule && extraRules.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-text-muted">กฎเพิ่มเติม ({extraRules.length})</p>
          {extraRules.map((er) => {
            const erSelectedAction = ACTION_TYPES.find((a) => a.value === er.actionType);
            return (
              <div key={er.id} className="border border-surface-lighter rounded-xl p-4 space-y-4 relative">
                {/* ปุ่มลบ */}
                <button onClick={() => removeExtraRule(er.id)} className="absolute top-3 right-3 p-1.5 hover:bg-surface-lighter rounded-lg text-text-muted hover:text-danger">
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* ชื่อกฎ */}
                <div>
                  <label className={labelCls}>ชื่อกฎ</label>
                  <input value={er.name} onChange={(e) => updateExtraRule(er.id, 'name', e.target.value)} className={inputCls} placeholder="เช่น ปิดโฆษณา ROAS ต่ำ" />
                </div>

                {/* ถ้า (เงื่อนไข) */}
                <div className="rounded-xl border border-info/30 bg-info/5 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-info bg-info/10 px-2 py-0.5 rounded">ถ้า</span>
                    <span className="text-sm text-text-muted">เงื่อนไข</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>ตัวชี้วัด</label>
                      <select value={er.metric} onChange={(e) => updateExtraRule(er.id, 'metric', e.target.value)} className={inputCls}>
                        {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>เงื่อนไข</label>
                      <select value={er.operator} onChange={(e) => updateExtraRule(er.id, 'operator', e.target.value)} className={inputCls}>
                        {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>เกณฑ์</label>
                      <input type="number" step="0.1" value={er.threshold} onChange={(e) => updateExtraRule(er.id, 'threshold', Number(e.target.value))} className={inputCls} placeholder="เช่น 1.5" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>ช่วงเวลาพิจารณา</label>
                    <select value={er.period} onChange={(e) => updateExtraRule(er.id, 'period', e.target.value)} className={inputCls}>
                      {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* ลูกศร */}
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-text-muted rotate-90" />
                </div>

                {/* แล้วทำ (การกระทำ) */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary-light bg-primary/10 px-2 py-0.5 rounded">แล้วทำ</span>
                    <span className="text-sm text-text-muted">การกระทำ</span>
                  </div>
                  <div>
                    <label className={labelCls}>เมื่อตรงเงื่อนไข ให้ทำ</label>
                    <select value={er.actionType} onChange={(e) => updateExtraRule(er.id, 'actionType', e.target.value)} className={inputCls}>
                      {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                  {erSelectedAction?.needsValue && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>ค่า (%)</label>
                        <input type="number" value={er.actionValue} onChange={(e) => updateExtraRule(er.id, 'actionValue', Number(e.target.value))} className={inputCls} placeholder="เช่น 20" />
                      </div>
                      <div>
                        <label className={labelCls}>งบประมาณสูงสุด (฿)</label>
                        <input type="number" value={er.maxBudget} onChange={(e) => updateExtraRule(er.id, 'maxBudget', Number(e.target.value))} className={inputCls} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ปุ่มเพิ่มกฎ + สร้าง */}
      <div className="space-y-2 pt-2">
        {!rule && (
          <button
            type="button"
            onClick={addExtraRule}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-dashed border-surface-lighter text-sm text-text-muted hover:border-primary hover:text-primary-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            เพิ่มกฎ
          </button>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 px-5 py-2.5 rounded-lg bg-gradient-to-r from-success to-primary hover:opacity-90 text-white text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {saving ? 'กำลังบันทึก...' : rule ? 'บันทึก' : extraRules.length > 0 ? `สร้าง ${1 + extraRules.length} กฎ` : 'สร้างกฎ'}
          </button>
          {rule && (
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg bg-surface-light hover:bg-surface-lighter text-sm transition-colors"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-surface-lighter flex items-center justify-between">
              <h3 className="text-lg font-bold">ยืนยันสร้างกฎ</h3>
              <button onClick={() => setShowConfirm(false)} className="p-1 hover:bg-surface-light rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Main rule summary */}
              <div className="bg-surface-light rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold">{name}</p>
                {conditions.map((cond, idx) => (
                  <p key={cond.id} className="text-sm">
                    {idx === 0 ? 'ถ้า ' : <span className="text-info text-xs font-medium">{logicLabel} </span>}
                    <span className="text-info font-medium">{getMetricShort(cond.metric)}</span> {getOpShort(cond.operator)} <span className="font-semibold">{cond.threshold}</span>
                    {idx === 0 && ` (${periodLabel})`}
                  </p>
                ))}
                {actions.map((act, aidx) => {
                  const ad = getActionDef(act.type);
                  return (
                    <p key={act.id} className="text-sm">
                      {aidx === 0 ? 'จะ ' : <span className="text-primary-light text-xs font-medium">{actionLogicLabel} </span>}
                      <span className="text-primary-light font-medium">{ad?.short}{ad?.needsValue ? ` ${act.value}${ad.valueSuffix || '%'}` : ''}</span>
                    </p>
                  );
                })}
                <p className="text-xs text-text-muted">
                  กระทำ{FREQUENCIES.find((f) => f.value === frequency)?.label}
                  {budgetReset && ` · ปรับงบกลับตอน ${resetTime}`}
                </p>
              </div>

              {/* Extra rules summary */}
              {extraRules.map((er) => {
                const erMetric = METRICS.find((m) => m.value === er.metric)?.short || er.metric;
                const erOp = OPERATORS.find((o) => o.value === er.operator)?.short || er.operator;
                const erAct = ACTION_TYPES.find((a) => a.value === er.actionType);
                const erPeriodLabel = PERIODS.find((p) => p.value === er.period)?.label || er.period;
                return (
                  <div key={er.id} className="bg-surface-light rounded-xl p-4 space-y-1">
                    <p className="text-sm font-semibold">{er.name || '(ยังไม่ตั้งชื่อ)'}</p>
                    <p className="text-sm">
                      ถ้า <span className="text-info font-medium">{erMetric}</span> {erOp} <span className="font-semibold">{er.threshold}</span> ({erPeriodLabel})
                    </p>
                    <p className="text-sm">
                      จะ <span className="text-primary-light font-medium">{erAct?.short}{erAct?.needsValue ? ` ${er.actionValue}%` : ''}</span>
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-surface-lighter flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg bg-surface-light hover:bg-surface-lighter text-sm">ยกเลิก</button>
              <button onClick={handleConfirm} className="px-5 py-2 rounded-lg bg-gradient-to-r from-success to-primary text-white text-sm font-medium hover:opacity-90">
                ยืนยัน{extraRules.length > 0 ? ` (${1 + extraRules.length} กฎ)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
