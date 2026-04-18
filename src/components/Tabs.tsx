import { useState, type ReactNode } from 'react';

interface Tab {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
}

export default function Tabs({ tabs, defaultId }: { tabs: Tab[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId || tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) || tabs[0];

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-surface-lighter overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
              active === t.id
                ? 'text-primary-light border-primary'
                : 'text-text-muted border-transparent hover:text-text hover:border-surface-lighter'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-6">{current?.content}</div>
    </div>
  );
}
