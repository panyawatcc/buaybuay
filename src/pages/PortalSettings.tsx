import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  Users,
  Wallet,
  Bell,
  ShieldAlert,
  LogOut,
  Plus,
  Edit3,
  Check,
  Circle,
  Sparkles,
  X,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { usePortal, formatBaht, type TeamRole } from '../hooks/usePortal';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/Toast';

export default function PortalSettings() {
  const { state, loading, updateCompany, updateNotifications, setPrimaryAccount, inviteMember, removeMember, mockMode } = usePortal();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [editName, setEditName] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showWhy, setShowWhy] = useState(false);

  if (loading || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-text-muted">กำลังโหลด...</div>
    );
  }

  const { company, plan, ad_accounts, team, notifications } = state;
  const primary = ad_accounts.find((a) => a.is_primary) || ad_accounts[0];
  const spendPct = Math.min(100, (plan.spend_used / Math.max(1, plan.spend_limit)) * 100);
  const initials = company.name.slice(0, 2).toUpperCase();

  const handleInvite = async () => {
    if (!inviteEmail.trim() || team.length >= plan.team_limit) return;
    await inviteMember(inviteEmail.trim());
    toast(`ส่ง invite ไปที่ ${inviteEmail} แล้ว`, 'success');
    setInviteEmail('');
    setInviteOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50 py-6 px-4">
      <div className="max-w-md md:max-w-3xl mx-auto space-y-4 pb-12">
        {mockMode && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] text-amber-800 text-center">
            🧪 Mock mode — /api/portal/* ยังไม่มี
          </div>
        )}

        {/* Hero */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 md:p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold text-slate-900 truncate">{company.name}</h1>
            <p className="text-[11px] text-slate-500">
              {plan.key === 'pro' ? 'Pro plan' : 'Free trial'}
              {plan.trial_days_remaining != null && plan.key === 'free' && ` · เหลือ ${plan.trial_days_remaining} วัน`}
              {` · ${ad_accounts.length} ad accounts`}
            </p>
          </div>
          <Link to="/ai-managed" className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
            กลับหน้าแอป →
          </Link>
        </div>

        {/* Section: Company */}
        <Section icon={<Building2 className="w-4 h-4" />} title="ข้อมูลบริษัท">
          <Row
            label="ชื่อบริษัท"
            value={company.name}
            editing={editName}
            onEdit={() => setEditName(true)}
            onSave={(v) => { updateCompany({ name: v }); setEditName(false); toast('บันทึกแล้ว', 'success'); }}
            onCancel={() => setEditName(false)}
          />
          <Row
            label="อีเมล"
            value={company.email}
            editing={editEmail}
            type="email"
            onEdit={() => setEditEmail(true)}
            onSave={(v) => { updateCompany({ email: v }); setEditEmail(false); toast('บันทึกแล้ว', 'success'); }}
            onCancel={() => setEditEmail(false)}
          />
          <Row
            label="เบอร์โทร"
            value={company.phone || ''}
            placeholder="ยังไม่ได้กรอก"
            editing={editPhone}
            type="tel"
            onEdit={() => setEditPhone(true)}
            onSave={(v) => { updateCompany({ phone: v || null }); setEditPhone(false); toast('บันทึกแล้ว', 'success'); }}
            onCancel={() => setEditPhone(false)}
          />
        </Section>

        {/* Section: Plan */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-5 text-white shadow-lg shadow-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4" />
            <h2 className="text-sm font-bold">แพลน & การใช้งาน</h2>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">
              {plan.key === 'pro' ? 'Pro' : 'Free trial'}
            </span>
          </div>
          <p className="text-xs text-white/90 mb-2">
            ใช้ได้ทุก feature
            {plan.key === 'free' && plan.trial_days_remaining != null && ` · เหลือ ${plan.trial_days_remaining} วัน`}
            {` · ใช้ ${formatBaht(plan.spend_used)} (จาก ${formatBaht(plan.spend_limit)} limit)`}
          </p>
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: `${spendPct}%` }} />
          </div>
          {plan.key === 'free' && (
            <button
              type="button"
              onClick={() => toast('รอ Stripe integration', 'info')}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-slate-50 active:scale-[0.98] transition"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade เป็น Pro — ฿2,490/เดือน
            </button>
          )}
          {plan.key === 'free' && (
            <p className="text-[11px] text-white/75 text-center mt-1.5">
              ไม่จำกัดงบ · 5 ad accounts · priority support
            </p>
          )}
        </div>

        {/* Section: Team */}
        <Section
          icon={<Users className="w-4 h-4" />}
          title="ทีมงาน"
          aside={
            <span className="text-[11px] font-semibold text-slate-600">
              {team.length} / {plan.team_limit}
            </span>
          }
        >
          <div className="space-y-2">
            {team.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{m.email}</p>
                </div>
                <RolePill role={m.role} />
                {m.role !== 'Owner' && (
                  <button
                    type="button"
                    onClick={() => { removeMember(m.id); toast(`ลบ ${m.email} แล้ว`, 'success'); }}
                    className="p-1 text-slate-400 hover:text-rose-500"
                    aria-label="remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {inviteOpen ? (
            <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 space-y-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-white ring-1 ring-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || team.length >= plan.team_limit}
                  className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  ส่ง invite
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              disabled={team.length >= plan.team_limit}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              เชิญทีมงาน{team.length < plan.team_limit ? ` (เหลือ ${plan.team_limit - team.length} คน)` : ' (เต็มแล้ว)'}
            </button>
          )}
        </Section>

        {/* Section: Ad Accounts */}
        <Section icon={<Wallet className="w-4 h-4" />} title="Ad Accounts">
          <div className="space-y-2">
            {ad_accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-b-0">
                <Circle className={`w-2 h-2 shrink-0 ${a.status === 'active' ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.account_name}</p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">{a.account_id}</p>
                </div>
                {a.is_primary ? (
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setPrimaryAccount(a.id); toast(`ตั้ง ${a.account_name} เป็น primary`, 'success'); }}
                    className="shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    ตั้งเป็นหลัก
                  </button>
                )}
              </div>
            ))}
          </div>
          {primary && (
            <p className="text-[11px] text-slate-500 mt-2">
              กำลังใช้ <strong className="text-slate-700">{primary.account_name}</strong> เป็น context หลักของแอป
            </p>
          )}
        </Section>

        {/* Section: Notifications */}
        <Section icon={<Bell className="w-4 h-4" />} title="แจ้งเตือน">
          <ToggleRow
            label="📧 อีเมลสรุปทุกวัน"
            sub="รายงานสั้น ๆ ส่งเช้าทุกวัน 9:00"
            on={notifications.email_summary}
            onToggle={() => { updateNotifications({ email_summary: !notifications.email_summary }); toast('บันทึกแล้ว', 'success'); }}
          />
          <ToggleRow
            label="📱 LINE Notify"
            sub="เฉพาะแจ้งเตือนเร่งด่วน"
            on={notifications.line_notify}
            onToggle={() => { updateNotifications({ line_notify: !notifications.line_notify }); toast('บันทึกแล้ว', 'success'); }}
          />
        </Section>

        {/* Section: Danger zone — Revoke */}
        <div className="rounded-2xl bg-rose-50/80 border border-rose-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-rose-900">เลิกใช้งาน (Revoke access)</h2>
          </div>
          <p className="text-xs text-rose-800 mb-3">
            เพื่อความปลอดภัย เราไม่มีปุ่ม "Revoke ทันที" ในแอป — ติดต่อทีมเราเพื่อยืนยันตัวตนก่อน
          </p>
          <ol className="space-y-1.5 text-xs text-rose-900 mb-3 pl-4">
            <li>1️⃣ ติดต่อทีม: LINE @aiadmanager หรือ support@coolapp.com</li>
            <li>2️⃣ ทีมส่ง OTP ไปที่อีเมลคุณ — ยืนยันตัวตน</li>
            <li>3️⃣ ภายใน 24 ชม. AI หยุดเข้าถึง · คุณยังเก็บ ad account ของคุณไว้</li>
          </ol>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://line.me/ti/p/@aiadmanager"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#06c755] text-white text-xs font-semibold hover:brightness-110"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              ติดต่อ LINE
            </a>
            <a
              href="mailto:support@coolapp.com"
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-200 text-xs font-semibold hover:bg-slate-50"
            >
              <Mail className="w-3.5 h-3.5" />
              ส่งอีเมล
            </a>
          </div>
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="mt-2 text-[11px] text-rose-700 font-medium hover:underline"
          >
            {showWhy ? 'ปิด' : 'ทำไมไม่มีปุ่มถอน 1 คลิก?'}
          </button>
          {showWhy && (
            <p className="text-[11px] text-rose-800 mt-2 leading-relaxed">
              เพราะถ้ามีคน hijack บัญชีคุณ พวกเขาจะสามารถกดเพื่อทำลาย setup ได้ทันที — 2-step verification ผ่านทีมช่วยกันเคสนั้น
            </p>
          )}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={() => logout()}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-white ring-1 ring-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  aside,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">{icon}</div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  placeholder,
  editing,
  type = 'text',
  onEdit,
  onSave,
  onCancel,
}: {
  label: string;
  value: string;
  placeholder?: string;
  editing: boolean;
  type?: 'text' | 'email' | 'tel';
  onEdit: () => void;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <div>
        <p className="text-[11px] font-medium text-slate-600 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(draft);
              if (e.key === 'Escape') onCancel();
            }}
            className="flex-1 bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            aria-label="save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { setDraft(value); onCancel(); }}
            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
            aria-label="cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-600">{label}</p>
        <p className={`text-sm ${value ? 'text-slate-900' : 'text-slate-400 italic'}`}>{value || placeholder}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 p-1.5 text-slate-400 hover:text-indigo-600"
        aria-label="edit"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function RolePill({ role }: { role: TeamRole }) {
  const isOwner = role === 'Owner';
  return (
    <span
      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
        isOwner ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {role}
    </span>
  );
}

function ToggleRow({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500">{sub}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`shrink-0 relative w-10 h-6 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
        aria-label={label}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${on ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}
