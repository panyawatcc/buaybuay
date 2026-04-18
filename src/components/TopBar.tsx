import { useState } from 'react';
import { Bot, Shield, Bell, Zap, LogOut } from 'lucide-react';
import { useToast } from './Toast';
import Tooltip from './Tooltip';
import ConfirmDialog from './ConfirmDialog';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

type BotMode = 'manual' | 'alert' | 'autopilot';

interface Account {
  id: string;
  name: string;
  accountId?: string;
}

interface TopBarProps {
  accounts: Account[];
  selectedAccountId: string;
  onAccountChange: (id: string) => void;
  botMode: BotMode;
  onBotModeChange: (mode: BotMode) => void;
  notificationCount?: number;
  fbConnected?: boolean;
  loadingAccounts?: boolean;
}

const BOT_MODES: { mode: BotMode; label: string; icon: React.ReactNode; tip: string }[] = [
  { mode: 'manual', label: 'ปกติ', icon: <Shield size={14} />, tip: 'ปิดบอท — คุณจัดการแอดเอง 100%' },
  { mode: 'alert', label: 'แจ้งเตือน', icon: <Bell size={14} />, tip: 'บอทแนะนำ — คุณตัดสินใจ approve ก่อนบอททำจริง' },
  { mode: 'autopilot', label: 'อัตโนมัติ', icon: <Zap size={14} />, tip: 'บอททำเอง — scale/pause ตาม rules ที่คุณตั้งไว้' },
];

export default function TopBar({
  accounts,
  selectedAccountId,
  onAccountChange,
  botMode,
  onBotModeChange,
  notificationCount = 0,
  fbConnected = false,
  loadingAccounts = false,
}: TopBarProps) {
  const { toast } = useToast();
  const [pendingMode, setPendingMode] = useState<BotMode | null>(null);
  const [confirmedModes, setConfirmedModes] = useState<Set<BotMode>>(new Set());

  const handleBotMode = (mode: BotMode) => {
    if (mode === botMode) return;
    if (!confirmedModes.has(mode)) {
      setPendingMode(mode);
      return;
    }
    onBotModeChange(mode);
    const msgs = { manual: 'เปลี่ยนเป็น Manual Mode', alert: 'เปลี่ยนเป็น Alert Mode', autopilot: 'เปลี่ยนเป็น Auto-Pilot Mode' };
    toast(msgs[mode], mode === 'autopilot' ? 'success' : 'info');
  };

  const confirmMessages: Record<BotMode, { title: string; message: string; variant: 'warning' | 'info' | 'danger' }> = {
    manual: {
      title: 'เปลี่ยนเป็น Manual Mode?',
      message: 'บอทจะหยุดทำงานทั้งหมด — คุณต้องจัดการแอดทุกอย่างเองทั้ง 100% ต้องการเปลี่ยนหรือไม่?',
      variant: 'info',
    },
    alert: {
      title: 'เปลี่ยนเป็น Alert Mode?',
      message: 'บอทจะส่งการแจ้งเตือนเมื่อพบปัญหา แต่ไม่ทำการเปลี่ยนแปลงใดๆ คุณต้องตัดสินใจ approve ก่อน ต้องการเปลี่ยนหรือไม่?',
      variant: 'info',
    },
    autopilot: {
      title: 'เปิด Auto-Pilot Mode?',
      message: 'บอทจะจัดการเงินของคุณจริง — เพิ่ม/ลดงบ และหยุดแคมเปญอัตโนมัติตาม Rules ที่ตั้งไว้. แน่ใจหรือไม่?',
      variant: 'warning',
    },
  };

  return (
    <>
      <header className="h-16 bg-surface border-b border-surface-lighter flex items-center px-6 gap-6 shrink-0">
        <div className="flex items-center gap-2 min-w-[160px]">
          <Bot size={22} className="text-primary" />
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent select-none">
            AdsPanda AI
          </span>
        </div>

        <div className="flex-1 flex justify-center">
          {!fbConnected ? (
            <div className="flex items-center gap-2 bg-bg border border-warning/30 text-warning text-sm rounded-lg px-3 py-2 min-w-[220px] cursor-not-allowed select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse-dot" />
              <span>Please connect Facebook</span>
            </div>
          ) : loadingAccounts ? (
            <div className="flex items-center gap-2 bg-bg border border-surface-lighter text-text-muted text-sm rounded-lg px-3 py-2 min-w-[220px] select-none animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-info" />
              <div className="h-4 w-32 bg-surface-lighter rounded" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex items-center gap-2 bg-bg border border-text-muted/30 text-text-muted text-sm rounded-lg px-3 py-2 min-w-[220px] select-none">
              <span>ไม่พบบัญชีโฆษณา</span>
            </div>
          ) : (
            <select
              value={selectedAccountId}
              onChange={(e) => {
                onAccountChange(e.target.value);
                const acc = accounts.find((a) => a.id === e.target.value);
                if (acc) toast(`เปลี่ยนเป็นบัญชี "${acc.name}"`, 'info');
              }}
              className="bg-bg border border-surface-lighter text-text text-sm rounded-lg px-3 py-2 min-w-[220px] focus:outline-none focus:border-primary cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} · {acc.accountId || acc.id.replace('act_', '')}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-4 min-w-fit">
          {/* Bot Mode toggle */}
          <div className="flex items-center bg-bg border border-surface-lighter rounded-lg overflow-hidden">
            {BOT_MODES.map(({ mode, label, icon, tip }) => (
              <Tooltip key={mode} text={tip}>
                <button
                  onClick={() => handleBotMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors duration-150 ${
                    botMode === mode
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:text-text hover:bg-surface-light'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              </Tooltip>
            ))}
          </div>

          <Tooltip text="การแจ้งเตือน">
            <button
              onClick={() => toast('ไม่มีการแจ้งเตือนใหม่', 'info')}
              className="relative p-2 rounded-lg hover:bg-surface-light transition-colors text-text-muted hover:text-text"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          </Tooltip>

          <UserMenu />
        </div>
      </header>

      <ConfirmDialog
        open={pendingMode !== null}
        title={pendingMode ? confirmMessages[pendingMode].title : ''}
        message={pendingMode ? confirmMessages[pendingMode].message : ''}
        confirmText="ยืนยัน"
        cancelText="ยกเลิก"
        variant={pendingMode ? confirmMessages[pendingMode].variant : 'info'}
        onConfirm={() => {
          const mode = pendingMode;
          setPendingMode(null);
          if (!mode) return;
          setConfirmedModes((prev) => new Set(prev).add(mode));
          onBotModeChange(mode);
          const msgs = { manual: 'เปลี่ยนเป็น Manual Mode แล้ว', alert: 'เปลี่ยนเป็น Alert Mode แล้ว', autopilot: 'เปิด Auto-Pilot Mode แล้ว — บอทเริ่มทำงาน' };
          toast(msgs[mode], mode === 'autopilot' ? 'success' : 'info');
        }}
        onCancel={() => setPendingMode(null)}
      />
    </>
  );
}

const roleColors = {
  admin: 'bg-danger/10 text-danger border-danger/30',
  manager: 'bg-primary/10 text-primary-light border-primary/30',
  viewer: 'bg-info/10 text-info border-info/30',
};
const roleLabels = { admin: 'Admin', manager: 'Manager', viewer: 'Viewer' };

function UserMenu() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;
  const initial = user.name.charAt(0).toUpperCase();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();

      // Clear per-user FB token too (stored in localStorage)
      localStorage.removeItem('fb_access_token');
      localStorage.removeItem('fb_token_expires_at');
      localStorage.removeItem('adbot_fb_connected');

      toast('ออกจากระบบแล้ว', 'info');
      setOpen(false);
      navigate('/login', { replace: true });
    } catch {
      toast('ออกจากระบบไม่สำเร็จ — ลองใหม่อีกครั้ง', 'error');
      setLoggingOut(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hover:bg-surface-light rounded-lg pl-1 pr-2 py-1 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
          {initial}
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-xs text-text font-medium leading-tight">{user.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${roleColors[user.role]} leading-tight`}>
            {roleLabels[user.role]}
          </span>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-56 bg-surface border border-surface-lighter rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
            <div className="p-3 border-b border-surface-lighter">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
              <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full border ${roleColors[user.role]}`}>
                {roleLabels[user.role]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-danger/10 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? 'กำลังออก...' : 'ออกจากระบบ'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

