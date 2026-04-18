import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Bot, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';

export default function Login() {
  const { user, login, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await login(email, password);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast(`ยินดีต้อนรับ ${email.split('@')[0]}`, 'success');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Bot className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">AdsPanda AI</span>
          </div>
          <p className="text-sm text-text-muted">เข้าสู่ระบบเพื่อจัดการโฆษณา</p>
        </div>

        <form onSubmit={submit} className="bg-surface border border-surface-lighter rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            <p className="text-[10px] text-text-muted mt-1">💡 เพื่อทดสอบ: ใส่ "admin@x.com" = admin, "manager@x.com" = manager</p>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัว"
                className="w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

          <p className="text-center text-sm text-text-muted">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" className="text-primary-light hover:text-primary">
              สมัครสมาชิก
            </Link>
          </p>
          <div className="pt-2 border-t border-surface-lighter space-y-2">
            {/* Primary CTA — Quick Install (Path A) is the default path
                for non-technical customers per COMMANDER 2026-04-19
                dispatch. Green accent highlights RECOMMENDED posture
                vs the secondary (AI / Manual) tier below. */}
            <Link
              to="/docs/quick-install"
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-success/15 hover:bg-success/25 border border-success/40 text-success rounded-lg font-semibold text-sm transition-colors"
            >
              <span>ไม่รู้ code? ติดตั้ง 1-click →</span>
              <span className="hidden sm:inline text-[11px] font-normal opacity-80">· No code? 1-click install</span>
            </Link>
            <p className="text-center text-xs text-text-muted">
              อยากรู้จัก AdsPanda AI ก่อนสมัคร?{' '}
              <Link to="/docs" className="text-primary-light hover:text-primary">
                อ่านคู่มือการใช้งาน
              </Link>
            </p>
            <p className="text-center text-[11px] text-text-muted">
              ทางเลือกอื่น:{' '}
              <Link to="/docs/ai-install" className="text-primary-light hover:text-primary">
                AI Install
              </Link>
              {' · '}
              <Link to="/docs/manual-install" className="text-primary-light hover:text-primary">
                Manual (dev)
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
