import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const iconColor = variant === 'danger' ? 'text-danger' : variant === 'info' ? 'text-info' : 'text-warning';
  const bgColor = variant === 'danger' ? 'bg-danger/10' : variant === 'info' ? 'bg-info/10' : 'bg-warning/10';
  const confirmBg = variant === 'danger' ? 'bg-danger hover:bg-danger/80' : 'bg-primary hover:bg-primary-dark';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="bg-surface rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center shrink-0`}>
            <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="flex-1 pt-1">
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-surface-light rounded-lg shrink-0">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg bg-surface-light hover:bg-surface-lighter text-text font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg ${confirmBg} text-white font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
