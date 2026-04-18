import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Zap, TrendingUp, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.includes('@') && password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password) && company.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await register(company.trim(), email.trim(), password);
    if (!res.ok) {
      setError(res.error);
      toast(res.error, 'error');
      setSubmitting(false);
      return;
    }
    toast('สมัครสำเร็จ — ไปต่อที่การเชื่อมต่อ', 'success');
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/40 to-indigo-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md md:max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 md:p-8 text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider bg-white/15 backdrop-blur px-2.5 py-1 rounded-full mb-4">
              <Sparkles className="w-3 h-3" />
              AI ทำงานให้ 24/7
            </span>
            <h1 className="text-2xl md:text-3xl font-black leading-tight">
              AI จัดการโฆษณาให้คุณ — ไม่ต้องเชี่ยว FB
            </h1>
            <p className="text-sm text-white/85 mt-3 leading-relaxed">
              Set & forget — บอก AI ราคา + กำไร · AI ดูแลแคมเปญ 24 ชม. · หยุดได้ตลอด
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-6 md:mt-10">
            <Chip icon={<Zap className="w-3 h-3" />} label="Setup 5 นาที" />
            <Chip icon={<Shield className="w-3 h-3" />} label="ไม่ต้อง login FB" />
            <Chip icon={<TrendingUp className="w-3 h-3" />} label="+45% ROAS" />
          </div>
        </div>

        {/* Form */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">สมัครใช้งาน — 30 วันแรกฟรี</h2>
            <p className="text-xs text-slate-500 mt-0.5">ไม่ต้องใช้บัตรเครดิต · ยกเลิกได้ตลอด</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="อีเมลธุรกิจ" helper="ใช้อีเมลจริงที่อ่านได้">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourcompany.com"
                autoComplete="email"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </Field>

            <Field label="รหัสผ่าน" helper="อย่างน้อย 8 ตัว (มีตัวอักษร + ตัวเลข)">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label="toggle password"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <Field label="ชื่อบริษัท / แบรนด์" helper='เช่น "เสื้อยืด Cool Co."'>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ชื่อร้าน / บริษัท"
                autoComplete="organization"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </Field>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white font-bold shadow-lg shadow-indigo-200 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'กำลังสมัคร...' : 'เริ่มใช้งานฟรี'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>

            <p className="text-[11px] text-slate-500 leading-relaxed text-center">
              การสมัครหมายถึงคุณยอมรับ <a href="#" className="underline text-indigo-600 hover:text-indigo-700">ข้อตกลง</a> และ{' '}
              <a href="#" className="underline text-indigo-600 hover:text-indigo-700">นโยบายความเป็นส่วนตัว</a>
            </p>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              มีบัญชีแล้ว?{' '}
              <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur rounded-xl px-2 py-2 text-center">
      <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">{icon}</div>
      <span className="text-[10px] font-semibold leading-tight">{label}</span>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {helper && <p className="text-[11px] text-slate-500 mt-1">{helper}</p>}
    </div>
  );
}
