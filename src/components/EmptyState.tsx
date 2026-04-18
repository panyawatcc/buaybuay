import { Plug, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  type: 'not-connected' | 'loading' | 'error' | 'no-data';
  title?: string;
  description?: string;
  error?: string | null;
}

export default function EmptyState({ type, title, description, error }: EmptyStateProps) {
  if (type === 'loading') {
    return (
      <div className="bg-surface rounded-xl p-12 text-center">
        <Loader2 className="w-8 h-8 text-primary-light mx-auto mb-3 animate-spin" />
        <p className="text-text-muted text-sm">{description || 'กำลังโหลดข้อมูล...'}</p>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="bg-surface rounded-xl p-12 text-center border border-danger/20">
        <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
        <h3 className="font-semibold text-danger mb-1">{title || 'เกิดข้อผิดพลาด'}</h3>
        <p className="text-text-muted text-sm">{error || description || 'ไม่สามารถโหลดข้อมูลได้'}</p>
      </div>
    );
  }

  if (type === 'no-data') {
    return (
      <div className="bg-surface rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-light mx-auto mb-3 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-text-muted" />
        </div>
        <h3 className="font-semibold mb-1">{title || 'ไม่พบข้อมูล'}</h3>
        <p className="text-text-muted text-sm">{description || 'ยังไม่มีข้อมูลในส่วนนี้'}</p>
      </div>
    );
  }

  // not-connected
  return (
    <div className="bg-surface rounded-xl p-12 text-center border border-warning/20">
      <div className="w-14 h-14 rounded-full bg-warning/10 mx-auto mb-4 flex items-center justify-center">
        <Plug className="w-7 h-7 text-warning" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title || 'ยังไม่ได้เชื่อมต่อ Facebook'}</h3>
      <p className="text-text-muted text-sm mb-5 max-w-md mx-auto">
        {description || 'เชื่อมต่อบัญชี Facebook Ads เพื่อดูข้อมูลจริงในส่วนนี้'}
      </p>
      <Link
        to="/settings"
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        <Plug className="w-4 h-4" />
        ไปที่ Settings
      </Link>
    </div>
  );
}
