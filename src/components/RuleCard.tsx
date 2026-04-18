import { useState } from 'react';
import { ArrowRight, Clock, Pencil, Trash2, Activity } from 'lucide-react';
import type { Rule } from '../hooks/useFacebookAPI';

const METRIC_LABELS: Record<string, string> = {
  amount_spent: 'เงินใช้จ่าย', results: 'ผลลัพธ์', cost_per_result: 'ต้นทุน/ผลลัพธ์',
  messaging_conversations: 'เริ่มสนทนา', cost_per_messaging_conversation: 'ต้นทุน/สนทนา',
  purchase_roas: 'ผลตอบแทน', roas: 'ผลตอบแทน', purchases: 'การซื้อ', cost_per_purchase: 'ต้นทุน/ซื้อ',
  avg_purchase_conversion_value: 'มูลค่าเฉลี่ย', cpm: 'ต้นทุน/แสดงผล', ctr_all: 'อัตราคลิกทั้งหมด',
  clicks_all: 'คลิกทั้งหมด', reach: 'การเข้าถึง', spend: 'ค่าใช้จ่าย', ctr: 'อัตราคลิก', cpc: 'ต้นทุน/คลิก',
  cpa: 'ต้นทุน/คอนเวอร์ชัน', conversions: 'คอนเวอร์ชัน', open_rate: 'อัตราเปิด', open_rate_male: 'อัตราเปิดชาย',
};
const OP_LABELS: Record<string, string> = { gt: 'มากกว่า', lt: 'น้อยกว่า', gte: '≥', lte: '≤', eq: '=' };
const PERIOD_LABELS: Record<string, string> = { last_7d: '7 วัน', last_14d: '14 วัน', last_30d: '30 วัน', last_90d: '90 วัน', all_time: 'ตลอด' };
const LOGIC_LABELS: Record<string, string> = { and: 'และ', or: 'หรือ' };
const ACTION_LABELS: Record<string, string> = {
  budget_increase: 'เพิ่มงบ', budget_decrease: 'ลดงบ', bid_increase: 'เพิ่มราคาประมูล', bid_decrease: 'ลดราคาประมูล',
  pause: 'ปิดโฆษณา', enable: 'เปิดแคมเปญ', telegram_notify: 'แจ้งเตือน', clone_ad: 'โคลนแอด', clone_campaign: 'โคลนแคมเปญ',
};
const ACTION_LOGIC_LABELS: Record<string, string> = { and: 'และ', or: 'หรือ' };

interface Props {
  rule: Rule;
  isEditing?: boolean;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
}

export default function RuleCard({ rule, isEditing, onToggle, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lastTriggered = rule.lastTriggeredAt
    ? new Date(rule.lastTriggeredAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className={`bg-surface rounded-xl p-5 transition-all border ${isEditing ? 'border-primary/50 ring-2 ring-primary/20' : 'border-transparent hover:border-surface-lighter'} ${!rule.isActive ? 'opacity-50' : ''}`}>
      {/* ชื่อ + สถานะ + ปุ่ม */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="font-semibold text-sm">{rule.name}</h3>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${rule.isActive ? 'bg-success/10 text-success' : 'bg-surface-lighter text-text-muted'}`}>
            {rule.isActive ? 'ทำงานอยู่' : 'หยุด'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onEdit(rule)} className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-text" title="แก้ไข">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { onDelete(rule.id); setConfirmDelete(false); }} className="text-[11px] bg-danger text-white px-2 py-1 rounded">ลบกฎ</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-text-muted px-2 py-1">ยกเลิก</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-danger" title="ลบ">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onToggle(rule.id, !rule.isActive)}
            className={`w-10 h-5 rounded-full transition-colors relative ${rule.isActive ? 'bg-success' : 'bg-surface-lighter'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${rule.isActive ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* ถ้า → แล้วทำ */}
      <div className="space-y-2">
        {/* Conditions */}
        <div className="flex items-start gap-3 flex-wrap">
          <div className="border-l-[3px] border-info bg-info/5 rounded-r-lg px-3 py-2 space-y-1">
            {((rule as any).conditions || [rule.condition]).map((cond: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5">
                {idx === 0 ? (
                  <span className="text-[11px] font-bold text-info">ถ้า</span>
                ) : (
                  <span className="text-[10px] font-bold text-info">{LOGIC_LABELS[(rule as any).conditionLogic] || 'และ'}</span>
                )}
                <span className="bg-surface-lighter px-1.5 py-0.5 rounded text-xs font-medium">{METRIC_LABELS[cond.metric] || cond.metric}</span>
                <span className="text-text-muted text-xs">{OP_LABELS[cond.operator]}</span>
                <span className="bg-surface-lighter px-1.5 py-0.5 rounded text-xs font-semibold">{cond.value ?? cond.threshold}</span>
                {idx === 0 && <span className="text-[10px] text-text-muted">({PERIOD_LABELS[rule.condition.period] || rule.condition.period})</span>}
              </div>
            ))}
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted shrink-0 mt-2" />
          <div className="border-l-[3px] border-primary bg-primary/5 rounded-r-lg px-3 py-2 space-y-1">
            {((rule as any).actions || [rule.action]).map((act: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5">
                {idx === 0 ? (
                  <span className="text-[11px] font-bold text-primary-light">แล้วทำ</span>
                ) : (
                  <span className="text-[10px] font-bold text-primary-light">{ACTION_LOGIC_LABELS[(rule as any).actionLogic] || 'และ'}</span>
                )}
                <span className="bg-surface-lighter px-1.5 py-0.5 rounded text-xs">
                  {ACTION_LABELS[act.type] || act.type}
                  {act.value > 0 ? ` ${act.value}${act.type === 'clone_ad' ? ' ชุด' : act.unit === 'percent' ? '%' : '฿'}` : ''}
                </span>
                {idx === 0 && act.maxBudget != null && act.maxBudget > 0 && (
                  <span className="text-[10px] text-text-muted">(สูงสุด ฿{act.maxBudget.toLocaleString()})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* สถิติ */}
      <div className="flex items-center gap-4 mt-3 text-[11px] text-text-muted">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />ห้ามทำซ้ำภายใน {rule.cooldownHours} ชม.</span>
        {lastTriggered ? (
          <span className="flex items-center gap-1"><Activity className="w-3 h-3" />ตรวจล่าสุด: {lastTriggered}</span>
        ) : (
          <span>ยังไม่เคยรัน</span>
        )}
        {rule.campaignIds && <span>{rule.campaignIds.length} แคมเปญ</span>}
      </div>
    </div>
  );
}
