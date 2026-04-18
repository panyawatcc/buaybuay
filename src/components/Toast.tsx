import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertTriangle, X, Info } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface ToastContextType {
  toast: (message: string, type?: ToastItem['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    error: <AlertTriangle className="w-5 h-5 text-danger" />,
    info: <Info className="w-5 h-5 text-info" />,
  };

  const borders = {
    success: 'border-success/30',
    warning: 'border-warning/30',
    error: 'border-danger/30',
    info: 'border-info/30',
  };

  const toastContainer = (
    <div
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, maxWidth: '24rem', pointerEvents: 'auto' }}
      className="flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`bg-surface border ${borders[t.type]} rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl shadow-black/40 animate-slide-up`}
        >
          {icons[t.type]}
          <span className="text-sm flex-1 text-text">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-text-muted hover:text-text">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted && typeof document !== 'undefined' && createPortal(toastContainer, document.body)}
    </ToastContext.Provider>
  );
}
