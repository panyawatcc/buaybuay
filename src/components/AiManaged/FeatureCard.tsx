import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ACCENT_CLASSES, STATUS_LABEL, type FeatureDef } from './features';

export default function FeatureCard({ feature }: { feature: FeatureDef }) {
  const Icon = feature.icon;
  const c = ACCENT_CLASSES[feature.accent];

  return (
    <Link
      to={`/ai-managed/${feature.slug}`}
      className={`block rounded-2xl border border-surface-lighter ${c.bg} p-3 hover:ring-1 ${c.ring} transition`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-xl ${c.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.statusBg} ${c.statusText}`}>
          {STATUS_LABEL[feature.status]}
        </span>
      </div>
      <div className="text-sm font-bold leading-tight">{feature.name}</div>
      <div className="text-[11px] text-text-muted mt-0.5 leading-snug line-clamp-2">{feature.subtitle}</div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-lighter/60">
        <span className={`text-[11px] tabular-nums leading-snug line-clamp-1 ${c.text}`}>{feature.metric}</span>
        <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0 ml-1" />
      </div>
    </Link>
  );
}
