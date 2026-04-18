import { Sparkles, Zap, BarChart3, Shield } from 'lucide-react';

function FacebookIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const features = [
  { icon: Zap, title: 'Auto-Scale อัตโนมัติ', desc: 'บอทปรับงบตาม ROAS ให้เอง 24 ชม.' },
  { icon: BarChart3, title: 'วิเคราะห์ลึก', desc: 'AI หาจุดแข็งจุดอ่อนของแต่ละแคมเปญ' },
  { icon: Shield, title: 'ปลอดภัย มั่นใจ', desc: 'ตั้ง safety limits — บอทไม่เกินงบที่คุณกำหนด' },
];

export default function WelcomeScreen({ onConnect, onSkip }: { onConnect: () => void; onSkip?: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary-light text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Facebook Ads Manager
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-light via-info to-primary-light bg-clip-text text-transparent">
            👋 ยินดีต้อนรับสู่ AdsPanda AI
          </h1>
          <p className="text-lg text-text-muted max-w-lg mx-auto leading-relaxed">
            เชื่อมต่อบัญชี Facebook Ads เพื่อเริ่มใช้งาน — หรือดู Demo Data ก่อนก็ได้
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onConnect}
            className="flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] shadow-lg shadow-[#1877F2]/20"
          >
            <FacebookIcon />
            เชื่อมต่อ Facebook Ads
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="flex items-center justify-center gap-2 bg-surface hover:bg-surface-light border border-surface-lighter text-text px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              ดู Demo ก่อน →
            </button>
          )}
        </div>
        {onSkip && (
          <p className="text-xs text-text-muted">
            คลิก "ดู Demo ก่อน" เพื่อสำรวจฟีเจอร์ด้วยข้อมูลตัวอย่าง — ไม่แสดงอีก
          </p>
        )}

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          {features.map((f) => (
            <div key={f.title} className="bg-surface border border-surface-lighter rounded-xl p-5 text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-primary-light" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-text-muted">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Onboarding checklist */}
        <div className="bg-surface border border-surface-lighter rounded-xl p-5 text-left mt-6">
          <h3 className="font-semibold mb-3 text-sm text-text-muted uppercase tracking-wider">ขั้นตอนเริ่มต้น</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center text-[10px] text-primary-light">1</div>
              <span>เชื่อมต่อบัญชี Facebook Ads</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-5 h-5 rounded-full border-2 border-surface-lighter flex items-center justify-center text-[10px] text-text-muted">2</div>
              <span>ตั้งค่า Rule แรก</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-5 h-5 rounded-full border-2 border-surface-lighter flex items-center justify-center text-[10px] text-text-muted">3</div>
              <span>เปิด Auto-Pilot Mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
