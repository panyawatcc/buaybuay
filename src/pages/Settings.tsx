import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ChevronRight } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConnection } from '../components/ConnectionContext';
import { useAuth } from '../components/AuthContext';
import { useFacebookToken, useAdAccounts, useDisplaySettings } from '../hooks/useFacebookAPI';
import { useLicense } from '../components/LicenseContext';
import TelegramConnect from '../components/TelegramConnect';
import NotificationSettings from '../components/NotificationSettings';

function FacebookIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-success' : 'bg-surface-lighter'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function MaskedInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { fbConnected, setFbConnected, setSelectedAccountId } = useConnection();
  const { refresh: refreshAuth } = useAuth();
  const { login } = useFacebookToken();
  const { accounts, loading: accountsLoading, error: accountsError } = useAdAccounts(fbConnected);
  const [disconnecting, setDisconnecting] = useState(false);

  // Show error toast if fetch fails
  useEffect(() => {
    if (accountsError) {
      toast(`ไม่สามารถดึงข้อมูล: ${accountsError}`, 'error');
    }
  }, [accountsError, toast]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/auth/disconnect-facebook', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('disconnect_failed');

      // Clear FB-only localStorage keys. Keep the session cookie — the user
      // stays logged into the app; only the FB connection is revoked.
      localStorage.removeItem('adbot_fb_connected');
      localStorage.removeItem('fb_token_expires_at');
      localStorage.removeItem('adbot_selected_account');

      setFbConnected(false);
      setSelectedAccountId('');

      // Same-tab listeners (ConnectionContext, MainShell) only fire on this
      // custom event; StorageEvent is cross-tab only.
      window.dispatchEvent(new Event('fb-connection-change'));

      await refreshAuth();

      toast('ตัดการเชื่อมต่อ Facebook แล้ว', 'success');
    } catch {
      toast('ยกเลิกไม่สำเร็จ — ลองอีกครั้ง', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  const { displaySettings, updateDisplaySettings } = useDisplaySettings();
  const license = useLicense();
  const [lineToken, setLineToken] = useState('');
  const [lineEnabled, setLineEnabled] = useState(false);
  const [refreshRate, setRefreshRate] = useState('60');

  const licenseBadge =
    license.status === 'active' ? { label: 'Active', cls: 'text-success bg-success/10', dot: 'bg-success' } :
    license.status === 'warning' ? { label: 'ใกล้หมดอายุ', cls: 'text-warning bg-warning/10', dot: 'bg-warning' } :
    license.status === 'degrade' ? { label: 'อ่านอย่างเดียว', cls: 'text-danger bg-danger/10', dot: 'bg-danger' } :
    license.status === 'hard_block' ? { label: 'ถูกระงับ', cls: 'text-danger bg-danger/10', dot: 'bg-danger' } :
    license.status === 'misconfigured' ? { label: 'ยังไม่ตั้งค่า', cls: 'text-text-muted bg-surface-lighter', dot: 'bg-text-muted' } :
    { label: 'กำลังโหลด...', cls: 'text-text-muted bg-surface-lighter', dot: 'bg-text-muted' };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">เชื่อมต่อ & ตั้งค่า</h1>
        <p className="text-text-muted text-sm mt-1">
          จัดการการเชื่อมต่อแพลตฟอร์มและการตั้งค่าระบบ
        </p>
      </div>

      {/* === License === */}
      <Link
        to="/settings/license"
        className="block bg-surface rounded-xl p-6 hover:bg-surface-light transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary-light">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-text">License</h2>
            <p className="text-text-muted text-xs mt-0.5">
              {license.status === 'active' && license.tier
                ? `Tier: ${license.tier}${license.seats ? ` · ${license.seats} seats` : ''}`
                : (license.status === 'warning' || license.status === 'degrade' || license.status === 'hard_block') && license.banner
                ? license.banner.th
                : 'ตั้งค่า license key + brain URL + Anthropic API key'}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${licenseBadge.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${licenseBadge.dot}`} />
            {licenseBadge.label}
          </span>
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text transition-colors" />
        </div>
      </Link>

      {/* === Facebook Connection === */}
      <div className="bg-surface rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-[#1877F2]/20 flex items-center justify-center text-[#1877F2]">
            <FacebookIcon />
          </div>
          <div>
            <h2 className="font-semibold text-text">Facebook Ads</h2>
            <p className="text-text-muted text-xs mt-0.5">เชื่อมต่อ Facebook Ads Manager</p>
          </div>
          <div className="ml-auto">
            {fbConnected ? (
              <span className="flex items-center gap-1.5 text-success text-xs font-medium bg-success/10 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                เชื่อมต่อแล้ว
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-text-muted text-xs font-medium bg-surface-lighter px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                ยังไม่เชื่อมต่อ
              </span>
            )}
          </div>
        </div>

        {fbConnected && (
          <div className="space-y-0 text-sm mb-5 divide-y divide-surface-lighter">
            {accountsLoading && (
              <div className="py-3 text-text-muted text-center">กำลังโหลด Ad Accounts...</div>
            )}
            {!accountsLoading && accounts.length > 0 && (
              <>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-text-muted">จำนวน Ad Accounts</span>
                  <span className="text-text">{accounts.length} บัญชี</span>
                </div>
                {accounts.slice(0, 3).map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between py-2.5">
                    <span className="text-text-muted truncate max-w-[60%]">{acc.name}</span>
                    <span className="text-text font-mono text-xs">{acc.id}</span>
                  </div>
                ))}
                {accounts.length > 3 && (
                  <div className="py-2.5 text-text-muted text-xs text-center">
                    + อีก {accounts.length - 3} บัญชี
                  </div>
                )}
              </>
            )}
            {!accountsLoading && accounts.length === 0 && !accountsError && (
              <div className="py-3 text-text-muted text-center text-xs">ไม่พบ Ad Account</div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={login}
            className="px-5 py-2 rounded-lg bg-[#1877F2] hover:bg-[#1877F2]/90 text-white text-sm font-medium transition-colors"
          >
            {fbConnected ? 'รีเชื่อมต่อ Facebook' : 'เชื่อมต่อ Facebook'}
          </button>
          {fbConnected && (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-5 py-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 text-sm font-medium transition-colors border border-danger/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disconnecting ? 'กำลังตัดการเชื่อมต่อ...' : 'ยกเลิกการเชื่อมต่อ'}
            </button>
          )}
        </div>
      </div>

      {/* === Telegram Bot === */}
      <div className="bg-surface rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-[#229ED9]/20 flex items-center justify-center text-[#229ED9]">
            <TelegramIcon />
          </div>
          <div>
            <h2 className="font-semibold text-text">Telegram Bot</h2>
            <p className="text-text-muted text-xs mt-0.5">รับการแจ้งเตือนผ่าน Telegram</p>
          </div>
        </div>
        <TelegramConnect />
      </div>

      {/* === Notification Settings === */}
      <div className="bg-surface rounded-xl p-6">
        <h2 className="font-semibold text-text mb-4">ตั้งค่าการแจ้งเตือน</h2>
        <NotificationSettings />
      </div>

      {/* === LINE Notify === */}
      <div className="bg-surface rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-[#00B900]/20 flex items-center justify-center text-[#00B900]">
            <LineIcon />
          </div>
          <div>
            <h2 className="font-semibold text-text">LINE Notify</h2>
            <p className="text-text-muted text-xs mt-0.5">รับการแจ้งเตือนผ่าน LINE</p>
          </div>
          <div className="ml-auto">
            <Toggle enabled={lineEnabled} onToggle={() => { const next = !lineEnabled; setLineEnabled(next); toast(next ? 'เปิดใช้งาน LINE Notify' : 'ปิด LINE Notify', next ? 'success' : 'warning'); }} />
          </div>
        </div>

        <div
          className={`transition-opacity ${lineEnabled ? 'opacity-100' : 'opacity-60'}`}
        >
          <div>
            <label className="block text-xs text-text-muted mb-1.5">LINE Notify Token</label>
            <MaskedInput
              value={lineToken}
              onChange={setLineToken}
              placeholder="LINE Notify Access Token"
            />
            <p className="text-text-muted text-xs mt-1">
              รับ Token ได้ที่{' '}
              <span className="text-[#00B900]">notify-bot.line.me/th/guides</span>
            </p>
          </div>
          <button
            onClick={() => {
              if (!lineToken) { toast('กรุณากรอก LINE Token ก่อน', 'error'); return; }
              toast('ส่งข้อความทดสอบ LINE Notify สำเร็จ', 'success');
            }}
            className="mt-4 px-5 py-2 rounded-lg bg-[#00B900]/10 text-[#00B900] hover:bg-[#00B900]/20 text-sm font-medium transition-colors border border-[#00B900]/20"
          >
            ทดสอบการส่ง LINE
          </button>
        </div>

        {!lineEnabled && (
          <p className="text-text-muted text-xs mt-2">เปิดสวิตช์เพื่อตั้งค่า LINE Notify</p>
        )}
      </div>

      {/* === Currency Display === */}
      <div className="bg-surface rounded-xl p-6">
        <h2 className="font-semibold text-text mb-4">การแสดงสกุลเงิน</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">แสดงเป็นบาท (฿)</p>
              <p className="text-xs text-text-muted">แปลงจาก USD → THB ด้วยอัตราแลกเปลี่ยน</p>
            </div>
            <button
              onClick={() => updateDisplaySettings({ currency: displaySettings.currency === 'THB' ? 'USD' : 'THB' })}
              className={`relative w-11 h-6 rounded-full transition-colors ${displaySettings.currency === 'THB' ? 'bg-primary' : 'bg-surface-lighter'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${displaySettings.currency === 'THB' ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {displaySettings.currency === 'THB' && (
            <div>
              <label className="block text-xs text-text-muted mb-1.5">อัตราแลกเปลี่ยน (1 USD = ? THB)</label>
              <input
                type="number"
                step="0.1"
                value={displaySettings.exchangeRate}
                onChange={(e) => updateDisplaySettings({ exchangeRate: Number(e.target.value) || 35 })}
                className="w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}
          <p className="text-xs text-text-muted">
            ปัจจุบัน: {displaySettings.currency === 'THB' ? `฿ (THB) × ${displaySettings.exchangeRate}` : '$ (USD) — ค่าจาก Facebook API'}
          </p>
        </div>
      </div>

      {/* === General Settings === */}
      <div className="bg-surface rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-surface-lighter flex items-center justify-center text-text-muted">
            <GlobeIcon />
          </div>
          <div>
            <h2 className="font-semibold text-text">ตั้งค่าทั่วไป</h2>
            <p className="text-text-muted text-xs mt-0.5">การตั้งค่าพื้นฐานของระบบ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">เขตเวลา</label>
            <select
              defaultValue="Asia/Bangkok"
              className="w-full bg-surface-light border border-surface-lighter text-text rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
              <option value="UTC">UTC (UTC+0)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">ภาษา</label>
            <select
              defaultValue="th"
              className="w-full bg-surface-light border border-surface-lighter text-text rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="th">ไทย</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">สกุลเงิน</label>
            <select
              defaultValue="THB"
              className="w-full bg-surface-light border border-surface-lighter text-text rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="THB">THB (฿) — บาทไทย</option>
              <option value="USD">USD ($) — ดอลลาร์สหรัฐ</option>
              <option value="EUR">EUR (€) — ยูโร</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">ความถี่รีเฟรช</label>
            <select
              value={refreshRate}
              onChange={(e) => setRefreshRate(e.target.value)}
              className="w-full bg-surface-light border border-surface-lighter text-text rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="30">30 วินาที</option>
              <option value="60">1 นาที</option>
              <option value="300">5 นาที</option>
              <option value="600">10 นาที</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={async () => {
            try {
              await fetch('/api/settings/display', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(displaySettings) });
              toast('บันทึกการตั้งค่าสำเร็จ', 'success');
            } catch { toast('บันทึกไม่สำเร็จ — ใช้ค่าใน localStorage', 'warning'); }
          }} className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors">
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
}
