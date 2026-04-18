import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

interface InviteInfo {
  valid: boolean;
  email: string;
  role: string;
  name: string;
  expiresAt: string;
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/team/invite/${token}`)
      .then((r) => r.json())
      .then((data: InviteInfo) => { setInfo(data); setLoading(false); })
      .catch(() => { setError('ลิงก์ไม่ถูกต้องหรือหมดอายุ'); setLoading(false); });
  }, [token]);

  const handleAccept = async () => {
    if (password.length < 8) { toast('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'error'); return; }
    setAccepting(true);
    try {
      const res = await fetch(`/api/team/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error();
      toast('สร้างบัญชีสำเร็จ — กำลังเข้าสู่ระบบ', 'success');
      navigate('/', { replace: true });
    } catch {
      toast('ไม่สามารถยอมรับคำเชิญได้', 'error');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-muted">กำลังตรวจสอบคำเชิญ...</p>
      </div>
    );
  }

  if (error || !info?.valid) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="bg-surface rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">คำเชิญไม่ถูกต้อง</h2>
          <p className="text-text-muted text-sm mb-4">{error || 'ลิงก์หมดอายุหรือถูกยกเลิกแล้ว'}</p>
          <button onClick={() => navigate('/login')} className="bg-primary text-white px-5 py-2 rounded-lg text-sm">ไปหน้าเข้าสู่ระบบ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-8 w-full max-w-md space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-bold">ยินดีต้อนรับ!</h2>
          <p className="text-text-muted text-sm mt-1">คุณได้รับเชิญเข้าร่วม AdsPanda AI</p>
        </div>

        <div className="bg-surface-light rounded-lg p-4 text-sm space-y-1">
          {info.email && <p><span className="text-text-muted">อีเมล:</span> {info.email}</p>}
          {info.name && <p><span className="text-text-muted">ชื่อ:</span> {info.name}</p>}
          <p><span className="text-text-muted">Role:</span> {info.role}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">ตั้งรหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            className="w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
        >
          {accepting ? 'กำลังสร้างบัญชี...' : 'ยอมรับคำเชิญ'}
        </button>
      </div>
    </div>
  );
}
