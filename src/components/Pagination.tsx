import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({ total, page, perPage, onPageChange, onPerPageChange }: Props) {
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  // Keyboard shortcuts for page navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft' && page > 1) { e.preventDefault(); onPageChange(page - 1); }
      if (e.key === 'ArrowRight' && page < totalPages) { e.preventDefault(); onPageChange(page + 1); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [page, totalPages, onPageChange]);

  if (total === 0) return null;

  // Visible page numbers — max 5 centered
  const pages: number[] = [];
  const half = 2;
  let startPage = Math.max(1, page - half);
  const endPage = Math.min(totalPages, startPage + 4);
  startPage = Math.max(1, endPage - 4);
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
      <span className="text-text-muted text-xs">
        แสดง {start}-{end} จาก {total} รายการ
      </span>

      <div className="flex items-center gap-2">
        <select
          value={perPage}
          onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
          className="bg-surface border border-surface-lighter rounded-lg px-2 py-1 text-xs text-text"
        >
          {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n} / หน้า</option>)}
        </select>

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg bg-surface hover:bg-surface-light disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-medium ${p === page ? 'bg-primary text-white' : 'bg-surface hover:bg-surface-light text-text-muted'}`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg bg-surface hover:bg-surface-light disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
