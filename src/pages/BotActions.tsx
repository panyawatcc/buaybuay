import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useConnection } from '../components/ConnectionContext';
import { useBotActions } from '../hooks/useFacebookAPI';
import BotActionsTable from '../components/BotActionsTable';
import EmptyState from '../components/EmptyState';

export default function BotActions() {
  const { fbConnected, selectedAccountId } = useConnection();
  const [page, setPage] = useState(1);
  const { actions, total, loading, error, undoAction } = useBotActions(fbConnected, selectedAccountId, page);

  const totalPages = Math.ceil(total / 20);

  if (!fbConnected) return <EmptyState type="not-connected" title="ดูประวัติบอท" description="เชื่อมต่อ Facebook Ads เพื่อดูสิ่งที่บอททำ" />;
  if (error) return <EmptyState type="error" error={error} />;
  if (loading && actions.length === 0) return <EmptyState type="loading" description="กำลังโหลดประวัติบอท..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bot className="w-7 h-7 text-primary-light" />
            ประวัติบอท
          </h1>
          <p className="text-sm text-text-muted mt-1">การกระทำทั้งหมดที่บอททำ — ย้อนกลับได้ภายใน 15 นาที</p>
        </div>
        <span className="text-sm text-text-muted">{total} รายการ</span>
      </div>

      <div className="bg-surface rounded-xl p-6">
        <BotActionsTable actions={actions} onUndo={undoAction} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm bg-surface hover:bg-surface-light disabled:opacity-50"
          >
            ← ก่อนหน้า
          </button>
          <span className="text-sm text-text-muted">หน้า {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm bg-surface hover:bg-surface-light disabled:opacity-50"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  );
}
