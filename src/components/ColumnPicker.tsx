import { useState, useRef, useEffect } from 'react';
import { Columns3 } from 'lucide-react';

interface Column {
  key: string;
  label: string;
}

interface Props {
  columns: Column[];
  storageKey: string;
  defaultVisible?: string[];
  onChange: (visible: Set<string>) => void;
}

function loadVisible(storageKey: string, defaults: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* use defaults */ }
  return new Set(defaults);
}

export default function ColumnPicker({ columns, storageKey, defaultVisible, onChange }: Props) {
  const defaults = defaultVisible || columns.map((c) => c.key);
  const [visible, setVisible] = useState<Set<string>>(() => loadVisible(storageKey, defaults));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (key: string) => {
    const next = new Set(visible);
    if (next.has(key)) {
      if (next.size > 1) next.delete(key); // Keep at least 1
    } else {
      next.add(key);
    }
    setVisible(next);
    localStorage.setItem(storageKey, JSON.stringify([...next]));
    onChange(next);
  };

  // Sync on mount
  useEffect(() => { onChange(visible); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-surface border border-surface-lighter rounded-lg px-3 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-light transition-colors"
      >
        <Columns3 className="w-3.5 h-3.5" />
        คอลัมน์
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-surface-lighter rounded-xl shadow-xl w-56 py-2">
          <p className="px-4 py-1 text-xs text-text-muted font-medium">แสดง/ซ่อนคอลัมน์</p>
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-3 px-4 py-1.5 hover:bg-surface-light cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={visible.has(col.key)}
                onChange={() => toggle(col.key)}
                className="rounded border-surface-lighter text-primary focus:ring-primary/30"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
