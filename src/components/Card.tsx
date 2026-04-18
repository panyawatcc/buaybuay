import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-xl border border-surface-lighter p-4 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, sub, color = 'text-text' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </Card>
  );
}

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: 'success' | 'warning' | 'danger' | 'default' | 'info' }) {
  const colors = {
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger',
    info: 'bg-info/15 text-info',
    default: 'bg-surface-lighter text-text-muted',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[variant]}`}>{children}</span>;
}
