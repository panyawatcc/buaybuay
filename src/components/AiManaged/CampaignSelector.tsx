import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED';
}

export default function CampaignSelector({
  campaigns,
  selectedIds,
  onChange,
}: {
  campaigns: Campaign[];
  selectedIds: string[] | null; // null = all
  onChange: (next: string[] | null) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => campaigns.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())),
    [campaigns, q]
  );

  const allSelected = selectedIds === null;
  const selectedSet = new Set(selectedIds || []);
  const count = allSelected ? campaigns.length : selectedIds!.length;

  const toggle = (id: string) => {
    if (allSelected) {
      onChange(campaigns.map((c) => c.id).filter((x) => x !== id));
      return;
    }
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-text-muted">
          AI ดูแล <span className="font-semibold text-text">{count}</span> / {campaigns.length} แคมเปญ
        </p>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`px-2 py-1 rounded-full ${
              allSelected
                ? 'bg-primary/20 text-primary-light ring-1 ring-primary/40'
                : 'bg-surface-light text-text-muted hover:text-text'
            }`}
          >
            เลือกทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-2 py-1 rounded-full bg-surface-light text-text-muted hover:text-text"
          >
            ยกเลิกทั้งหมด
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาแคมเปญ..."
          className="w-full bg-surface-light border border-surface-lighter rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      <div className="rounded-lg bg-surface-light/50 max-h-56 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center text-xs text-text-muted py-6">ไม่พบแคมเปญ</div>
        ) : (
          <ul className="divide-y divide-surface-lighter/60">
            {filtered.map((c) => {
              const isOn = allSelected || selectedSet.has(c.id);
              return (
                <li key={c.id}>
                  <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-light">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggle(c.id)}
                      className="accent-primary rounded"
                    />
                    <span className="text-sm flex-1 truncate">{c.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-surface-lighter text-text-muted'
                      }`}
                    >
                      {c.status === 'ACTIVE' ? 'ทำงาน' : 'หยุด'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
