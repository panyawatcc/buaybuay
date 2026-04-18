import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export default function DemoBanner({ onConnect }: { onConnect: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-primary/20 via-info/15 to-primary/20 border-b border-primary/30 px-4 py-2.5 flex items-center gap-3 flex-wrap">
      <Sparkles className="w-4 h-4 text-primary-light shrink-0" />
      <span className="text-sm flex-1 min-w-0">
        <span className="font-medium text-text">กำลังดู Demo Data</span>
        <span className="text-text-muted ml-2 hidden sm:inline">— เชื่อมต่อ Facebook Ads Account เพื่อใช้งานจริง</span>
      </span>
      <button
        onClick={onConnect}
        className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors whitespace-nowrap"
      >
        เชื่อมต่อบัญชีจริง
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-text"
        aria-label="ปิด"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
