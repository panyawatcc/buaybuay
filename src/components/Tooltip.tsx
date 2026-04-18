import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children?: ReactNode;
  showIcon?: boolean;
}

export default function Tooltip({ text, children, showIcon = false }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [show]);

  const tooltipEl =
    show && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              transform: 'translate(-50%, -100%)',
              zIndex: 10000,
              pointerEvents: 'none',
            }}
            className="bg-bg border border-surface-lighter text-text text-xs rounded-lg px-3 py-2 shadow-xl max-w-xs whitespace-normal"
          >
            {text}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={ref}
        className="relative inline-flex items-center gap-1"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >
        {children}
        {showIcon && <HelpCircle className="w-3.5 h-3.5 text-text-muted cursor-help shrink-0" />}
      </span>
      {tooltipEl}
    </>
  );
}

export function MetricLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip text={hint} showIcon>
      <span className="border-b border-dotted border-text-muted/40 cursor-help">{label}</span>
    </Tooltip>
  );
}
