import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNotificationSettings, useTelegramStatus } from '../hooks/useFacebookAPI';
import { useToast } from './Toast';

export default function NotificationSettings() {
  const { user } = useAuth();
  const { settings, loading, update } = useNotificationSettings(!!user);
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const [subscribing, setSubscribing] = useState(false);

  const pushSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

  const requestPush = async () => {
    if (!pushSupported) { toast('เบราว์เซอร์ไม่รองรับ Push Notifications', 'warning'); return; }
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast('ไม่ได้รับอนุญาตแจ้งเตือน — เปิดได้ในตั้งค่าเบราว์เซอร์', 'warning');
        return;
      }

      // Register service worker + subscribe
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BC4_KqDvlTidjLN8TZKW7J4wh-p2xHs4hHFn5b0cEG9lBPqRrh0xdC68Mv1um_uu2kSoX5Wa9hp_Kg4op5N2dEA',
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });

      setPushEnabled(true);
      toast('เปิดแจ้งเตือนสำเร็จ', 'success');
    } catch {
      toast('ไม่สามารถเปิดแจ้งเตือนได้ — ลองอีกครั้ง', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const { status: tgStatus } = useTelegramStatus(!!user);
  const tgConnected = tgStatus?.connected ?? false;

  const PUSH_TOGGLES: { key: keyof typeof settings; label: string; desc: string }[] = [
    { key: 'budgetChange', label: 'งบเปลี่ยน (Push)', desc: 'แจ้งเมื่อบอทเปลี่ยนงบแคมเปญ' },
    { key: 'ruleTriggered', label: 'Rule ทำงาน (Push)', desc: 'แจ้งเมื่อ Rule ถูก trigger' },
    { key: 'dailySummary', label: 'สรุปรายวัน (Push)', desc: 'สรุปยอดโฆษณาทุกเช้า' },
  ];

  const TG_TOGGLES: { key: keyof typeof settings; label: string; desc: string }[] = [
    { key: 'telegramAlerts' as keyof typeof settings, label: 'แจ้งเตือน (Telegram)', desc: 'ส่ง alert เมื่อ Rule trigger ผ่าน Telegram' },
    { key: 'telegramDailySummary' as keyof typeof settings, label: 'สรุปรายวัน (Telegram)', desc: 'สรุปยอดโฆษณาทุกเช้าผ่าน Telegram' },
  ];

  const renderToggleGroup = (title: string, toggles: typeof PUSH_TOGGLES, icon: React.ReactNode) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-text-muted font-medium uppercase tracking-wider">{title}</p>
      </div>
      <div className="bg-surface rounded-xl divide-y divide-surface-lighter">
        {toggles.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-text-muted">{desc}</p>
            </div>
            <button
              onClick={() => update({ [key]: !(settings as unknown as Record<string, boolean>)[key] })}
              disabled={loading}
              className={`relative w-11 h-6 rounded-full transition-colors ${(settings as unknown as Record<string, boolean>)[key] ? 'bg-primary' : 'bg-surface-lighter'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${(settings as unknown as Record<string, boolean>)[key] ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Push Permission */}
      <div className="bg-surface rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {pushEnabled ? <Bell className="w-5 h-5 text-success" /> : <BellOff className="w-5 h-5 text-text-muted" />}
            <div>
              <p className="font-medium text-sm">Push Notifications</p>
              <p className="text-xs text-text-muted">{pushEnabled ? 'เปิดอยู่ — แจ้งเตือนผ่านเบราว์เซอร์' : 'ปิดอยู่ — กดเปิดเพื่อรับแจ้งเตือน'}</p>
            </div>
          </div>
          {!pushEnabled && (
            <button
              onClick={requestPush}
              disabled={subscribing}
              className="bg-primary hover:bg-primary-dark text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {subscribing ? 'กำลังเปิด...' : 'เปิดแจ้งเตือน'}
            </button>
          )}
        </div>
      </div>

      {/* Push Toggles */}
      {renderToggleGroup('Push', PUSH_TOGGLES, <Bell className="w-4 h-4 text-text-muted" />)}

      {/* Telegram Toggles — only show if connected */}
      {tgConnected && renderToggleGroup('Telegram', TG_TOGGLES, <Bell className="w-4 h-4 text-[#229ED9]" />)}

      {!tgConnected && (
        <p className="text-xs text-text-muted">เชื่อมต่อ Telegram Bot ในหน้า Settings เพื่อเปิดแจ้งเตือนผ่าน Telegram</p>
      )}
    </div>
  );
}
