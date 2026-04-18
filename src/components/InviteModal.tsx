import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useToast } from './Toast';

interface Props {
  onInvite: (data: { email: string; name: string; role: string }) => Promise<{ inviteLink: string }>;
  onClose: () => void;
}

export default function InviteModal({ onInvite, onClose }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('viewer');
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) { toast('กรุณากรอกอีเมล', 'error'); return; }
    setSending(true);
    try {
      const res = await onInvite({ email: email.trim(), name: name.trim(), role });
      setInviteLink(res.inviteLink);
      toast('สร้างลิงก์เชิญสำเร็จ', 'success');
    } catch {
      toast('ไม่สามารถสร้างลิงก์เชิญได้', 'error');
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    toast('คัดลอกลิงก์แล้ว', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = 'w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">เชิญสมาชิกใหม่</h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-light rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {inviteLink ? (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">ส่งลิงก์นี้ให้สมาชิกใหม่:</p>
            <div className="flex items-center gap-2">
              <input value={inviteLink} readOnly className={`${inputCls} text-xs font-mono`} />
              <button onClick={copyLink} className="p-2 rounded-lg bg-primary text-white shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-text-muted">ลิงก์หมดอายุใน 72 ชั่วโมง</p>
            <button onClick={onClose} className="w-full bg-surface-light hover:bg-surface-lighter py-2 rounded-lg text-sm">ปิด</button>
          </div>
        ) : (
          <>
            <input placeholder="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            <input placeholder="ชื่อ (ไม่จำเป็น)" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              <option value="viewer">ผู้ดู (Viewer)</option>
              <option value="manager">ผู้จัดการ (Manager)</option>
              <option value="admin">แอดมิน (Admin)</option>
            </select>
            <button onClick={handleInvite} disabled={sending} className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
              {sending ? 'กำลังสร้าง...' : 'สร้างลิงก์เชิญ'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
