import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  onSearch: (query: string) => void;
  onStatusFilter: (status: string) => void;
  statusFilter: string;
}

const STATUSES = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'ACTIVE', label: 'เปิดอยู่', cls: 'text-success' },
  { value: 'PAUSED', label: 'หยุดชั่วคราว', cls: 'text-warning' },
  { value: 'ARCHIVED', label: 'ลบแล้ว', cls: 'text-text-muted' },
];

export default function SearchFilter({ onSearch, onStatusFilter, statusFilter }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length === 0 || query.length >= 2) onSearch(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setQuery('');
        onSearch('');
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onSearch]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหา... (/ หรือ Ctrl+K)"
          className="w-full bg-surface border border-surface-lighter rounded-lg pl-9 pr-8 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
        />
        {query && (
          <button onClick={() => { setQuery(''); onSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-lighter">
            <X className="w-3.5 h-3.5 text-text-muted" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s.value ? 'bg-primary text-white' : `bg-surface text-text-muted hover:bg-surface-light ${s.cls || ''}`
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
