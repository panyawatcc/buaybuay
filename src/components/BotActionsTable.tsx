import { useState } from 'react';
import { Undo2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { BotAction } from '../hooks/useFacebookAPI';
import { useToast } from './Toast';

interface Props {
  actions: BotAction[];
  onUndo: (id: string) => Promise<unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  budget_increase: 'เพิ่มงบ',
  budget_decrease: 'ลดงบ',
  pause: 'หยุดแคมเปญ',
  resume: 'เปิดแคมเปญ',
};

export default function BotActionsTable({ actions, onUndo }: Props) {
  const { toast } = useToast();
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleUndo = async (action: BotAction) => {
    setUndoingId(action.id);
    setConfirmId(null);
    try {
      await onUndo(action.id);
      toast(`ย้อนกลับ "${action.campaignName}" → ฿${action.previousValue.toLocaleString()}`, 'success');
    } catch {
      toast('ไม่สามารถย้อนกลับได้', 'error');
    } finally {
      setUndoingId(null);
    }
  };

  if (actions.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p>ยังไม่มีการกระทำของบอท</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-muted border-b border-surface-lighter text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-4">เวลา</th>
            <th className="text-left py-3 px-3">Rule</th>
            <th className="text-left py-3 px-3">แคมเปญ</th>
            <th className="text-left py-3 px-3">การกระทำ</th>
            <th className="text-right py-3 px-3">ก่อน</th>
            <th className="text-right py-3 px-3">หลัง</th>
            <th className="text-right py-3 px-3">เปลี่ยน</th>
            <th className="text-center py-3 px-3">ย้อนกลับ</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a.id} className="border-b border-surface-lighter/50 hover:bg-surface-light/50">
              <td className="py-3 px-4 text-xs text-text-muted">
                {new Date(a.executedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              <td className="py-3 px-3 text-xs">{a.ruleName}</td>
              <td className="py-3 px-3 font-medium">{a.campaignName}</td>
              <td className="py-3 px-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  a.actionType.includes('increase') || a.actionType === 'resume'
                    ? 'bg-success/10 text-success'
                    : 'bg-warning/10 text-warning'
                }`}>
                  {ACTION_LABELS[a.actionType] || a.actionType}
                </span>
              </td>
              <td className="py-3 px-3 text-right">฿{a.previousValue.toLocaleString()}</td>
              <td className="py-3 px-3 text-right font-medium">฿{a.newValue.toLocaleString()}</td>
              <td className="py-3 px-3 text-right">
                <span className={`flex items-center justify-end gap-1 ${a.changePercent >= 0 ? 'text-success' : 'text-danger'}`}>
                  {a.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {a.changePercent >= 0 ? '+' : ''}{a.changePercent}%
                </span>
              </td>
              <td className="py-3 px-3 text-center">
                {a.canUndo ? (
                  confirmId === a.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleUndo(a)}
                        disabled={undoingId === a.id}
                        className="text-xs bg-danger text-white px-2 py-1 rounded"
                      >
                        {undoingId === a.id ? '...' : 'ยืนยัน'}
                      </button>
                      <button onClick={() => setConfirmId(null)} className="text-xs text-text-muted px-2 py-1">
                        ยกเลิก
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(a.id)}
                      className="p-1.5 rounded-lg hover:bg-surface-lighter text-text-muted hover:text-warning"
                      title="ย้อนกลับ"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                  )
                ) : (
                  <span className="text-xs text-text-muted">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
