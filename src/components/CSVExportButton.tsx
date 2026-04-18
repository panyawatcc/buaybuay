import { Download } from 'lucide-react';
import { useConnection } from './ConnectionContext';
import { useDateRange, dateRangeToParams } from './DateRangeContext';

interface Props {
  endpoint: '/api/fb/insights' | '/api/fb/campaigns';
  filename?: string;
  label?: string;
}

export default function CSVExportButton({ endpoint, filename = 'export', label = 'CSV' }: Props) {
  const { selectedAccountId, fbConnected } = useConnection();
  const { dateRange } = useDateRange();
  const drParams = dateRangeToParams(dateRange);

  const handleExport = async () => {
    if (!fbConnected || !selectedAccountId) return;

    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('account_id', selectedAccountId);
    url.searchParams.set('format', 'csv');
    if (drParams.since) url.searchParams.set('since', drParams.since);
    if (drParams.until) url.searchParams.set('until', drParams.until);
    if (drParams.datePreset) url.searchParams.set('date_preset', drParams.datePreset);

    try {
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open URL directly (browser handles download)
      window.open(url.toString(), '_blank');
    }
  };

  if (!fbConnected) return null;

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 bg-surface border border-surface-lighter rounded-lg px-3 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-light transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
