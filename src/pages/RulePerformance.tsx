import { useMemo } from 'react';
import { BarChart3, Check, X as XIcon, TrendingUp } from 'lucide-react';
import { useConnection } from '../components/ConnectionContext';
import { useDateRange, dateRangeToParams } from '../components/DateRangeContext';
import DateRangePicker from '../components/DateRangePicker';
import { useRuleHistory } from '../hooks/useFacebookAPI';
import ExecutionTimeline from '../components/ExecutionTimeline';
import EmptyState from '../components/EmptyState';

export default function RulePerformance() {
  const { fbConnected, selectedAccountId } = useConnection();
  const { dateRange } = useDateRange();
  dateRangeToParams(dateRange); // keep context reactive
  const { executions, total, loading, error } = useRuleHistory(fbConnected, selectedAccountId);

  const stats = useMemo(() => {
    const triggered = executions.filter((e) => e.triggered);
    const totalBudgetImpact = triggered.reduce((sum, e) => sum + (e.newBudget - e.previousBudget), 0);
    return {
      total: executions.length,
      triggered: triggered.length,
      successRate: executions.length > 0 ? Math.round((triggered.length / executions.length) * 100) : 0,
      budgetImpact: totalBudgetImpact,
      undone: executions.filter((e) => e.undone).length,
    };
  }, [executions]);

  if (!fbConnected) return <EmptyState type="not-connected" title="ดู Rule Performance" description="เชื่อมต่อ Facebook Ads เพื่อดูประวัติการทำงานของ Rules" />;
  if (error) return <EmptyState type="error" error={error} />;
  if (loading && executions.length === 0) return <EmptyState type="loading" description="กำลังโหลดประวัติ Rules..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary-light" />
            ประสิทธิภาพ Rules
          </h1>
          <p className="text-sm text-text-muted mt-1">ประวัติการทำงานและผลลัพธ์ของ Rules ทั้งหมด</p>
        </div>
        <DateRangePicker />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">ประเมินทั้งหมด</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">Triggered</p>
          <p className="text-3xl font-bold text-success mt-1">{stats.triggered}</p>
        </div>
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">Success Rate</p>
          <p className="text-3xl font-bold text-primary-light mt-1">{stats.successRate}%</p>
        </div>
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">Budget Impact</p>
          <p className={`text-3xl font-bold mt-1 ${stats.budgetImpact >= 0 ? 'text-success' : 'text-danger'}`}>
            {stats.budgetImpact >= 0 ? '+' : ''}฿{Math.abs(stats.budgetImpact).toLocaleString()}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-text-muted text-sm">Undone</p>
          <p className="text-3xl font-bold text-warning mt-1">{stats.undone}</p>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-surface rounded-xl p-6">
        <h3 className="font-semibold mb-1">Budget Timeline</h3>
        <p className="text-xs text-text-muted mb-4">การเปลี่ยนแปลงงบจาก Rules</p>
        <ExecutionTimeline executions={executions} />
      </div>

      {/* Execution Log */}
      <div className="bg-surface rounded-xl overflow-x-auto">
        <div className="px-6 py-4 border-b border-surface-lighter">
          <h3 className="font-semibold">ประวัติการทำงาน ({total} รายการ)</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted border-b border-surface-lighter text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-4">เวลา</th>
              <th className="text-left py-3 px-3">Rule</th>
              <th className="text-left py-3 px-3">แคมเปญ</th>
              <th className="text-center py-3 px-3">Triggered</th>
              <th className="text-right py-3 px-3">ค่าปัจจุบัน</th>
              <th className="text-right py-3 px-3">Threshold</th>
              <th className="text-right py-3 px-3">งบเดิม → ใหม่</th>
              <th className="text-center py-3 px-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((e) => (
              <tr key={e.id} className="border-b border-surface-lighter/50 hover:bg-surface-light/50">
                <td className="py-3 px-4 text-xs text-text-muted">
                  {new Date(e.evaluatedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="py-3 px-3 font-medium">{e.ruleName}</td>
                <td className="py-3 px-3 text-text-muted">{e.campaignName}</td>
                <td className="py-3 px-3 text-center">
                  {e.triggered ? <Check className="w-4 h-4 text-success mx-auto" /> : <XIcon className="w-4 h-4 text-text-muted mx-auto" />}
                </td>
                <td className="py-3 px-3 text-right">{e.currentValue?.toFixed(2)}</td>
                <td className="py-3 px-3 text-right text-text-muted">{e.threshold?.toFixed(2)}</td>
                <td className="py-3 px-3 text-right">
                  {e.triggered ? (
                    <span>
                      ฿{e.previousBudget?.toLocaleString()} <TrendingUp className="w-3 h-3 inline text-success" /> ฿{e.newBudget?.toLocaleString()}
                    </span>
                  ) : '-'}
                </td>
                <td className="py-3 px-3 text-center">
                  {e.undone ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">Undone</span>
                  ) : e.triggered ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">Success</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-lighter text-text-muted">Skipped</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
