import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import type { RuleExecution } from '../hooks/useFacebookAPI';

interface Props {
  executions: RuleExecution[];
}

export default function ExecutionTimeline({ executions }: Props) {
  const chartData = useMemo(() => {
    if (executions.length === 0) return [];
    return executions
      .filter((e) => e.triggered)
      .sort((a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime())
      .map((e) => ({
        date: new Date(e.evaluatedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        budget: e.newBudget,
        previous: e.previousBudget,
        rule: e.ruleName,
        campaign: e.campaignName,
      }));
  }, [executions]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        ยังไม่มีข้อมูล timeline — รอบอททำงาน
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#363650" />
        <XAxis dataKey="date" stroke="#6c7086" fontSize={11} />
        <YAxis stroke="#6c7086" fontSize={11} tickFormatter={(v) => `฿${v}`} />
        <Tooltip
          contentStyle={{ background: '#1e1e2e', border: '1px solid #363650', borderRadius: 8, color: '#cdd6f4' }}
          formatter={(value, name) => [`฿${Number(value).toLocaleString()}`, name === 'budget' ? 'งบใหม่' : 'งบเดิม']}
          labelFormatter={(label) => `วันที่ ${label}`}
        />
        <Area type="monotone" dataKey="budget" stroke="#8b5cf6" strokeWidth={2} fill="url(#budgetGrad)" name="budget" />
        <Area type="monotone" dataKey="previous" stroke="#6c7086" strokeWidth={1} strokeDasharray="5 5" fill="none" name="previous" />
        {chartData.map((d, i) => (
          <ReferenceDot key={i} x={d.date} y={d.budget} r={4} fill="#8b5cf6" stroke="#fff" strokeWidth={1} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
