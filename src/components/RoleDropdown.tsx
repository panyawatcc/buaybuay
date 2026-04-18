import { useState, useRef, useEffect } from 'react';
import { Shield, UserCog, Eye } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'แอดมิน', color: 'text-danger bg-danger/10', icon: Shield },
  { value: 'manager', label: 'ผู้จัดการ', color: 'text-primary-light bg-primary/10', icon: UserCog },
  { value: 'viewer', label: 'ผู้ดู', color: 'text-info bg-info/10', icon: Eye },
] as const;

interface Props {
  currentRole: string;
  onChangeRole: (role: string) => void;
  disabled?: boolean;
}

export default function RoleDropdown({ currentRole, onChangeRole, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmRole, setConfirmRole] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setConfirmRole(null); }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = ROLES.find((r) => r.value === currentRole) || ROLES[2];
  const Icon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${current.color} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
      >
        <Icon className="w-3 h-3" />
        {current.label}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-surface-lighter rounded-xl shadow-xl w-48 py-1">
          {ROLES.map((role) => (
            <button
              key={role.value}
              onClick={() => {
                if (role.value === currentRole) { setOpen(false); return; }
                if (confirmRole === role.value) {
                  onChangeRole(role.value);
                  setOpen(false);
                  setConfirmRole(null);
                } else {
                  setConfirmRole(role.value);
                }
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-light ${role.value === currentRole ? 'opacity-50' : ''}`}
            >
              <role.icon className="w-4 h-4" />
              <span>{role.label}</span>
              {confirmRole === role.value && <span className="ml-auto text-xs text-warning">คลิกยืนยัน</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
