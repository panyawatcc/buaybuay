import { Activity, AlertTriangle, Check } from 'lucide-react';
import { useConnection } from './ConnectionContext';
import { usePixels } from '../hooks/useFacebookAPI';

export default function PixelStatus() {
  const { fbConnected, selectedAccountId } = useConnection();
  const { data, loading } = usePixels(fbConnected, selectedAccountId);

  if (!fbConnected || loading || !data) return null;

  const { hasActivePixel, pixels, conversionEvents } = data;
  const activePixel = pixels.find((p) => p.isActive);

  if (!hasActivePixel) {
    return (
      <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-warning">ยังไม่มี Facebook Pixel ที่ active</p>
          <p className="text-xs text-text-muted mt-0.5">ติดตั้ง Pixel เพื่อติดตาม conversion — ไม่มี Pixel = ไม่เห็นยอดขายจริง</p>
        </div>
      </div>
    );
  }

  const lastFired = activePixel?.lastFiredTime
    ? new Date(activePixel.lastFiredTime).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
    : 'N/A';

  return (
    <div className="bg-surface rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
        <Activity className="w-5 h-5 text-success" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{activePixel?.name || 'Facebook Pixel'}</p>
          <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" /> Active
          </span>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          อัพเดทล่าสุด: {lastFired} · Events: {activePixel?.eventCount?.toLocaleString() || 0}
          {conversionEvents.length > 0 && ` · ${conversionEvents.join(', ')}`}
        </p>
      </div>
    </div>
  );
}
