import { useState } from 'react';
import { Check, Unplug, Send, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTelegramStatus } from '../hooks/useFacebookAPI';
import { useToast } from './Toast';

export default function TelegramConnect() {
  const { user } = useAuth();
  const { status, loading, connect, disconnect, refetch } = useTelegramStatus(!!user);
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const handleConnect = async () => {
    if (!token.trim()) { toast('กรุณากรอก Bot Token', 'error'); return; }
    setConnecting(true);
    try {
      await connect(token.trim());
      toast('เชื่อมต่อ Telegram Bot สำเร็จ', 'success');
      setToken('');
      refetch();
    } catch {
      toast('ไม่สามารถเชื่อมต่อได้ — ตรวจสอบ Token', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnect();
      toast('ยกเลิกการเชื่อมต่อ Telegram แล้ว', 'warning');
      setConfirmDisconnect(false);
      refetch();
    } catch {
      toast('ไม่สามารถยกเลิกได้', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) return null;

  // Connected state
  if (status?.connected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
          <Check className="w-5 h-5 text-success shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">เชื่อมต่อแล้ว: @{status.botUsername}</p>
            {status.chatId && <p className="text-xs text-text-muted">Chat ID: {status.chatId}</p>}
            {status.lastMessageAt && (
              <p className="text-xs text-text-muted">
                ข้อความล่าสุด: {new Date(status.lastMessageAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>

        {!status.chatId && (
          <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning font-medium">ส่ง /start ไปที่บอทเพื่อเปิดใช้งาน</p>
            <p className="text-xs text-text-muted mt-1">เปิด Telegram แล้วส่ง /start ไปที่ @{status.botUsername}</p>
          </div>
        )}

        {confirmDisconnect ? (
          <div className="flex items-center gap-2">
            <button onClick={handleDisconnect} disabled={disconnecting} className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium disabled:opacity-50">
              {disconnecting ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
            </button>
            <button onClick={() => setConfirmDisconnect(false)} className="px-4 py-2 rounded-lg bg-surface-light text-sm">ไม่ยกเลิก</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDisconnect(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 text-sm font-medium border border-danger/20">
            <Unplug className="w-4 h-4" />
            ยกเลิกการเชื่อมต่อ
          </button>
        )}
      </div>
    );
  }

  // Disconnected state — setup flow
  return (
    <div className="space-y-4">
      {/* Setup Instructions */}
      <div className="bg-surface-light rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">วิธีตั้งค่า:</p>
        <ol className="text-xs text-text-muted space-y-1.5 list-decimal list-inside">
          <li>เปิด Telegram แล้วค้นหา <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[#229ED9] hover:underline">@BotFather <ExternalLink className="w-3 h-3 inline" /></a></li>
          <li>ส่งคำสั่ง <code className="bg-surface-lighter px-1.5 py-0.5 rounded text-text">/newbot</code> แล้วตั้งชื่อบอท</li>
          <li>คัดลอก Bot Token ที่ได้มาวางด้านล่าง</li>
          <li>กด Connect แล้วส่ง <code className="bg-surface-lighter px-1.5 py-0.5 rounded text-text">/start</code> ไปที่บอทของคุณ</li>
        </ol>
      </div>

      {/* Token Input */}
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Bot Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="1234567890:AAHxxxxxxxxxxxxxxxx"
          className="w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <button
        onClick={handleConnect}
        disabled={connecting || !token.trim()}
        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#229ED9] hover:bg-[#229ED9]/90 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {connecting ? 'กำลังเชื่อมต่อ...' : 'Connect'}
      </button>
    </div>
  );
}
