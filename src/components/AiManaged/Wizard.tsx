import { useMemo, useState } from 'react';
import { Bot, Rocket, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  onSubmit: (payload: { product_aov: number; margin_pct: number; daily_spend_cap: number | null }) => Promise<void>;
}

const QUICK_AOV_CHIPS = [190, 290, 490, 990];

export default function AiManagedWizard({ onSubmit }: Props) {
  const [aov, setAov] = useState<number | null>(290);
  const [marginPct, setMarginPct] = useState<number>(60);
  const [capOpen, setCapOpen] = useState(false);
  const [dailyCap, setDailyCap] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breakeven = useMemo(() => {
    if (!aov || aov <= 0 || marginPct <= 0) return null;
    return aov * (marginPct / 100);
  }, [aov, marginPct]);

  const canSubmit = !!aov && aov > 0 && marginPct >= 5 && marginPct <= 95 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !aov) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        product_aov: aov,
        margin_pct: marginPct / 100,
        daily_spend_cap: dailyCap,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md md:max-w-lg mx-auto space-y-4">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-5 text-white shadow-lg shadow-violet-600/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-white/15 backdrop-blur">
            <Bot className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-full">ตั้งค่าครั้งแรก</span>
        </div>
        <h2 className="text-xl font-bold leading-snug">ให้ AI ดูแลโฆษณาให้</h2>
        <p className="text-sm text-white/85 mt-1 leading-relaxed">
          บอก AI 2 ข้อพื้นฐาน — แล้วปล่อยให้มันเปิด-ปิด-ปรับงบเอง 24 ชม. คุณรับเงินเข้าอย่างเดียว
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-primary-light font-semibold">
          <span className="w-2 h-2 rounded-full bg-primary-light" />
          ขั้นที่ 1: ราคา & กำไร
        </span>
        <span className="flex-1 h-px bg-surface-lighter" />
        <span className="flex items-center gap-1.5 text-text-muted">
          <span className="w-2 h-2 rounded-full bg-surface-lighter" />
          ขั้นที่ 2: เปิดใช้งาน
        </span>
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-surface border border-surface-lighter p-5 space-y-5">
        {/* AOV */}
        <div>
          <label className="block text-sm font-semibold mb-1">💰 ราคาขายเฉลี่ยต่อออเดอร์</label>
          <p className="text-xs text-text-muted mb-3">ออเดอร์ละกี่บาท (โดยเฉลี่ย) — AI ใช้คำนวณว่าโฆษณาคุ้มไหม</p>
          <div className="relative">
            <input
              type="number"
              value={aov ?? ''}
              onChange={(e) => setAov(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="290"
              className="w-full text-center text-3xl font-bold bg-surface-light border border-surface-lighter rounded-2xl py-4 pr-10 focus:outline-none focus:border-primary tabular-nums"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-text-muted">฿</span>
          </div>
          <div className="flex gap-2 mt-2">
            {QUICK_AOV_CHIPS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAov(v)}
                className={`flex-1 py-1.5 rounded-full text-xs font-medium transition ${
                  aov === v
                    ? 'bg-primary/20 text-primary-light ring-1 ring-primary/40'
                    : 'bg-surface-light text-text-muted hover:text-text'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Margin */}
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label className="text-sm font-semibold">📈 กำไรต่อออเดอร์</label>
            <span className="text-xl font-bold text-primary-light tabular-nums">{marginPct}%</span>
          </div>
          <p className="text-xs text-text-muted mb-3">% กำไรหลังหักต้นทุนสินค้า</p>
          <div className="relative">
            <div className="h-2 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 via-emerald-400 to-violet-500" />
            <input
              type="range"
              min={5}
              max={95}
              step={5}
              value={marginPct}
              onChange={(e) => setMarginPct(Number(e.target.value))}
              className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
              aria-label="margin"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow ring-2 ring-primary-light pointer-events-none"
              style={{ left: `calc(${((marginPct - 5) / 90) * 100}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-2">
            <span>10%</span><span>30%</span><span>50%</span><span>70%</span><span>90%</span>
          </div>
        </div>

        {/* Breakeven callout */}
        {breakeven != null && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] text-emerald-200/70">คำนวณอัตโนมัติ</div>
              <div className="text-xs text-emerald-200/90">AI จะตั้ง Breakeven CPA ที่</div>
            </div>
            <div className="text-xl font-bold text-emerald-200 tabular-nums">฿{breakeven.toFixed(1)}</div>
          </div>
        )}

        {/* Advanced collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setCapOpen((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-text-muted hover:text-text py-1.5"
          >
            <span>⚙ ตั้งค่าขั้นสูง (ไม่บังคับ)</span>
            {capOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {capOpen && (
            <div className="mt-2">
              <label className="block text-xs text-text-muted mb-1.5">งบสูงสุดต่อวัน (Cap)</label>
              <div className="relative">
                <input
                  type="number"
                  value={dailyCap ?? ''}
                  onChange={(e) => setDailyCap(e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="เช่น 1500"
                  className="w-full bg-surface-light border border-surface-lighter rounded-lg px-3 py-2.5 pr-16 text-sm focus:outline-none focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">฿/วัน</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">AI จะไม่ใช้เกินค่านี้ต่อวัน — เว้นว่างไว้ = ไม่จำกัด</p>
            </div>
          )}
        </div>
      </div>

      {/* Trust note */}
      <p className="text-xs text-text-muted text-center px-4 leading-relaxed">
        ✓ หยุดได้ทุกเมื่อ — มีปุ่มแดง "หยุด AI ทันที" ทุกหน้า · ทุกการตัดสินใจของ AI มีเหตุผลโชว์ให้เห็น
      </p>

      {/* CTA */}
      {error && <p className="text-xs text-danger text-center">{error}</p>}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-base shadow-lg shadow-violet-600/30 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
      >
        <Rocket className="w-5 h-5" />
        <span>{submitting ? 'กำลังตั้งค่า...' : 'เริ่มให้ AI จัดการ'}</span>
      </button>
      <p className="text-[11px] text-text-muted text-center">ใช้เวลา ~30 วิ ในการตั้งค่ากฎอัตโนมัติ 6 ข้อ</p>
    </div>
  );
}
