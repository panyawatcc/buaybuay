import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ChevronLeft, Save, Play, Pause } from 'lucide-react';
import { FEATURE_BY_SLUG, ACCENT_CLASSES, STATUS_LABEL, type FeatureSlug } from '../components/AiManaged/features';
import EmergencyStopButton from '../components/AiManaged/EmergencyStopButton';
import { useConnection } from '../components/ConnectionContext';
import { useAiManaged, formatClockTime } from '../hooks/useAiManaged';
import { useToast } from '../components/Toast';

interface FeatureActivity {
  iso: string;
  icon: string;
  line: string;
}

function mockActivity(slug: FeatureSlug): FeatureActivity[] {
  const now = Date.now();
  const m = (min: number) => new Date(now - min * 60000).toISOString();
  const byFeature: Record<FeatureSlug, FeatureActivity[]> = {
    copywriter: [
      { iso: m(7), icon: '✍️', line: 'สร้าง 3 variants ใหม่สำหรับ "Live ขายของ"' },
      { iso: m(22), icon: '⚡', line: 'ตรวจพบ fatigue ใน "Promo สีน้ำเงิน" · CTR -34%' },
      { iso: m(58), icon: '🔄', line: 'A/B test "Test A" — variant B ชนะ +12% CTR' },
    ],
    retargeting: [
      { iso: m(11), icon: '🛒', line: 'เพิ่ม 14 users เข้า Custom Audience (cart abandon)' },
      { iso: m(34), icon: '💸', line: 'ยิง retargeting coupon 10% ไปหา 234 users' },
      { iso: m(82), icon: '📈', line: 'Recovery rate วันนี้ 18% (ดีกว่าค่าเฉลี่ย)' },
    ],
    crm: [
      { iso: m(4), icon: '🔌', line: 'Sync 12 orders ใหม่จาก Kaojao' },
      { iso: m(28), icon: '📡', line: 'ส่ง Conversion API 34 events ไป Facebook' },
      { iso: m(64), icon: '🎯', line: 'AI learned: ลูกค้าโอนจริง vs chat — ปรับ target' },
    ],
    trends: [
      { iso: m(9), icon: '🔥', line: 'Viral keyword: "#สงกรานต์2569" · เริ่มมา 2 ชม.' },
      { iso: m(25), icon: '🔔', line: 'แจ้งเตือน: meme ใหม่บน TikTok (เพลง xxx)' },
      { iso: m(70), icon: '✍️', line: 'Suggest caption เกาะกระแส #xxx · deploy ได้ทันที' },
    ],
    ltv: [
      { iso: m(16), icon: '🔁', line: 'ลูกค้า 3 คนครบ cycle 25 วัน — พร้อม upsell' },
      { iso: m(42), icon: '📅', line: 'คาดการณ์: 8 คนจะกลับมาภายใน 3 วัน' },
      { iso: m(99), icon: '💎', line: 'Segment Top 20% LTV — average ฿4,230/คน' },
    ],
  };
  return byFeature[slug];
}

export default function AiManagedFeature() {
  const { slug } = useParams<{ slug: FeatureSlug }>();
  const { selectedAccountId } = useConnection();
  const { stop } = useAiManaged(selectedAccountId || 'act_demo');
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(true);
  const [aggressiveness, setAggressiveness] = useState(50);
  const [autoApply, setAutoApply] = useState(false);
  const [note, setNote] = useState('');
  const [activity, setActivity] = useState<FeatureActivity[]>(() =>
    slug && slug in FEATURE_BY_SLUG ? mockActivity(slug as FeatureSlug) : []
  );

  if (!slug || !(slug in FEATURE_BY_SLUG)) {
    return <Navigate to="/ai-managed" replace />;
  }
  const feature = FEATURE_BY_SLUG[slug as FeatureSlug];
  const Icon = feature.icon;
  const c = ACCENT_CLASSES[feature.accent];

  const refreshActivity = () => {
    setActivity(mockActivity(slug as FeatureSlug));
    toast('รีเฟรช activity log แล้ว', 'info');
  };

  const saveConfig = () => {
    toast(`บันทึกการตั้งค่า ${feature.name} แล้ว`, 'success');
  };

  const aggLabel = useMemo(() => {
    if (aggressiveness < 33) return 'ระมัดระวัง';
    if (aggressiveness < 67) return 'สมดุล';
    return 'ดุดัน';
  }, [aggressiveness]);

  return (
    <div className="pb-28">
      {/* Back nav + breadcrumb */}
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-1 pb-3 flex items-center gap-2">
        <Link
          to="/ai-managed"
          className="p-2 -ml-1 rounded-full hover:bg-surface-light transition"
          aria-label="back"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <span className="text-xs text-text-muted">จัดการโดย AI</span>
        <span className="text-xs text-text-muted">/</span>
        <span className="text-xs font-medium">{feature.name}</span>
        <span className={`ml-auto text-[10px] font-semibold px-2 py-1 rounded-full ${c.statusBg} ${c.statusText}`}>
          {enabled ? STATUS_LABEL[feature.status] : 'หยุด'}
        </span>
      </div>

      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto space-y-4">
        {/* Hero */}
        <div className={`rounded-2xl border border-surface-lighter ${c.bg} p-5 md:p-6`}>
          <div className="flex items-start gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${c.icon}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${c.text} opacity-80`}>{feature.nameEn}</p>
              <h1 className="text-xl md:text-2xl font-bold leading-tight mt-0.5">{feature.heroTitle}</h1>
              <p className={`text-sm mt-1 ${c.text} opacity-90`}>{feature.heroSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEnabled((v) => !v);
                toast(`${feature.name} ${!enabled ? 'เปิด' : 'หยุด'} แล้ว`, 'success');
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                enabled
                  ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                  : 'bg-surface-lighter text-text-muted hover:bg-surface-light'
              }`}
            >
              {enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {enabled ? 'หยุดฟีเจอร์นี้' : 'เปิดฟีเจอร์นี้'}
            </button>
          </div>
          <p className="text-xs md:text-sm text-text-muted leading-relaxed">{feature.overview}</p>
        </div>

        {/* Workflow */}
        <div className="rounded-2xl bg-surface border border-surface-lighter p-4 md:p-5">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">วิธีการทำงาน</h3>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {feature.workflow.map((step, idx) => (
              <li key={idx} className="relative flex items-start md:flex-col md:items-start gap-3 md:gap-2">
                <div
                  className={`shrink-0 w-8 h-8 rounded-full ${c.icon} flex items-center justify-center text-sm font-bold`}
                >
                  {idx + 1}
                </div>
                {idx < feature.workflow.length - 1 && (
                  <>
                    <span className="hidden md:block absolute top-4 left-10 right-0 h-px bg-surface-lighter" />
                    <span className="md:hidden absolute left-4 top-8 bottom-0 w-px bg-surface-lighter" />
                  </>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{step.title}</p>
                  <p className="text-[11px] md:text-xs text-text-muted mt-0.5 leading-snug">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Side-by-side on desktop: Configure + Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Configure */}
          <div className="rounded-2xl bg-surface border border-surface-lighter p-4 md:p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Configure</h3>
              <button
                type="button"
                onClick={saveConfig}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-primary/20 text-primary-light hover:bg-primary/30 transition"
              >
                <Save className="w-3 h-3" />
                บันทึก
              </button>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-xs text-text-muted">Aggressiveness ({aggLabel})</label>
                <span className={`text-sm font-semibold tabular-nums ${c.text}`}>{aggressiveness}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={aggressiveness}
                onChange={(e) => setAggressiveness(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>ระมัดระวัง</span><span>สมดุล</span><span>ดุดัน</span>
              </div>
            </div>

            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm">Auto-apply (ให้ AI ทำได้เลยไม่ต้องรอยืนยัน)</div>
                <div className="text-[11px] text-text-muted">ปิดไว้ = AI แค่แนะนำ คุณกด approve เอง</div>
              </div>
              <button
                type="button"
                onClick={() => setAutoApply((v) => !v)}
                className={`shrink-0 relative w-10 h-6 rounded-full transition ${autoApply ? 'bg-emerald-500' : 'bg-surface-lighter'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
                    autoApply ? 'translate-x-4' : ''
                  }`}
                />
              </button>
            </label>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">โน้ต (ส่งไปให้ AI ปรับ tone)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="เช่น ขายสินค้าผู้หญิง โทนอบอุ่น ไม่ hard-sale"
                className="w-full bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="rounded-lg bg-surface-light/50 p-3">
              <div className="text-[11px] text-text-muted mb-1.5">จุดเด่น</div>
              <ul className="space-y-1.5">
                {feature.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]">
                    <span aria-hidden>{b.emoji}</span>
                    <span className="leading-snug">{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Activity */}
          <div className="rounded-2xl bg-surface border border-surface-lighter p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Activity ล่าสุด</h3>
              <button
                type="button"
                onClick={refreshActivity}
                className="text-[11px] text-primary-light hover:underline"
              >
                รีเฟรช
              </button>
            </div>
            {activity.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-6">ยังไม่มีกิจกรรม</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5" aria-hidden>{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">{a.line}</p>
                      <p className="text-[10px] text-text-muted tabular-nums mt-0.5">{formatClockTime(a.iso)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 pt-3 border-t border-surface-lighter">
              <dl className="text-[11px] space-y-1">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Metric</dt>
                  <dd className="font-medium">{feature.metric}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Slug</dt>
                  <dd className="font-mono text-[10px]">{feature.slug}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <EmergencyStopButton onStop={stop} />
    </div>
  );
}
