import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { useConnection } from '../components/ConnectionContext';
import { useDateRange, dateRangeToParams } from '../components/DateRangeContext';
import DateRangePicker from '../components/DateRangePicker';
import { useAudience } from '../hooks/useFacebookAPI';
import EmptyState from '../components/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AudienceInsights() {
  const { fbConnected, selectedAccountId } = useConnection();
  const { dateRange } = useDateRange();
  const drParams = dateRangeToParams(dateRange);
  const { audience, audienceLoading, audienceError } = useAudience(fbConnected, selectedAccountId, drParams);

  // Group by age
  const ageData = useMemo(() => {
    if (!audience?.data) return [];
    const map = new Map<string, { age: string; male: number; female: number }>();
    for (const seg of audience.data) {
      const entry = map.get(seg.age) || { age: seg.age, male: 0, female: 0 };
      if (seg.gender === 'male') entry.male += seg.spend;
      else entry.female += seg.spend;
      map.set(seg.age, entry);
    }
    return [...map.values()].sort((a, b) => a.age.localeCompare(b.age));
  }, [audience]);

  // Top segment
  const topSegment = audience?.summary;

  if (!fbConnected) return <EmptyState type="not-connected" title="ดู Audience Insights จริง" description="เชื่อมต่อ Facebook Ads เพื่อดูข้อมูลกลุ่มเป้าหมาย" />;
  if (audienceError) return <EmptyState type="error" error={audienceError} />;
  if (audienceLoading) return <EmptyState type="loading" description="กำลังโหลดข้อมูลกลุ่มเป้าหมาย..." />;
  if (!audience || audience.data.length === 0) return <EmptyState type="no-data" title="ไม่มีข้อมูลกลุ่มเป้าหมาย" description="ยังไม่มีข้อมูล breakdown สำหรับบัญชีนี้" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Users className="w-7 h-7 text-info" />
            กลุ่มเป้าหมาย
          </h1>
          <p className="text-sm text-text-muted mt-1">วิเคราะห์อายุ เพศ และประเทศ ของผู้ชมโฆษณา</p>
        </div>
        <DateRangePicker />
      </div>

      {/* Top Segment Highlight */}
      {topSegment && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface rounded-xl p-5 text-center">
            <p className="text-text-muted text-sm">อายุที่ดีที่สุด</p>
            <p className="text-3xl font-bold mt-1 text-primary-light">{topSegment.topAge}</p>
          </div>
          <div className="bg-surface rounded-xl p-5 text-center">
            <p className="text-text-muted text-sm">เพศที่ดีที่สุด</p>
            <p className="text-3xl font-bold mt-1 text-info">{topSegment.topGender === 'female' ? 'หญิง' : 'ชาย'}</p>
          </div>
          <div className="bg-surface rounded-xl p-5 text-center">
            <p className="text-text-muted text-sm">ประเทศหลัก</p>
            <p className="text-3xl font-bold mt-1 text-success">{topSegment.topCountry}</p>
          </div>
        </div>
      )}

      {/* Age x Gender Spend Chart */}
      <div className="bg-surface rounded-xl p-6">
        <h3 className="font-semibold mb-1">ยอดใช้จ่ายตามอายุ & เพศ</h3>
        <p className="text-xs text-text-muted mb-4">spend (฿) แยกตามช่วงอายุ</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={ageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#363650" />
            <XAxis dataKey="age" stroke="#6c7086" fontSize={12} />
            <YAxis stroke="#6c7086" fontSize={12} />
            <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid #363650', borderRadius: 8, color: '#cdd6f4' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="male" name="ชาย" fill="#89b4fa" radius={[4, 4, 0, 0]} />
            <Bar dataKey="female" name="หญิง" fill="#f5c2e7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail Table */}
      <div className="bg-surface rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted border-b border-surface-lighter text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-4">อายุ</th>
              <th className="text-left py-3 px-3">เพศ</th>
              <th className="text-right py-3 px-3">ใช้จ่าย</th>
              <th className="text-right py-3 px-3">Impressions</th>
              <th className="text-right py-3 px-3">Clicks</th>
              <th className="text-right py-3 px-3">Conversions</th>
            </tr>
          </thead>
          <tbody>
            {audience.data.map((seg, i) => (
              <tr key={i} className="border-b border-surface-lighter/50 hover:bg-surface-light/50">
                <td className="py-3 px-4 font-medium">{seg.age}</td>
                <td className="py-3 px-3">{seg.gender === 'male' ? 'ชาย' : 'หญิง'}</td>
                <td className="py-3 px-3 text-right">฿{seg.spend.toLocaleString()}</td>
                <td className="py-3 px-3 text-right">{seg.impressions.toLocaleString()}</td>
                <td className="py-3 px-3 text-right">{seg.clicks.toLocaleString()}</td>
                <td className="py-3 px-3 text-right font-medium text-success">{seg.conversions.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
