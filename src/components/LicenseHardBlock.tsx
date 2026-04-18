// LicenseHardBlock — full-page lockout screen shown in place of MainShell
// routes when status === 'hard_block'. The only navigable destinations are
// /settings/license (setup/retry) and /docs/* (read the terms + guide).
//
// Not used for 'degrade' — that keeps the full shell with read-only banner
// per Golf's Sketch-soft RO window directive.

import { KeyRound, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLicense } from './LicenseContext';

export default function LicenseHardBlock() {
  const { banner, revoked_reason, refresh } = useLicense();
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-text p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl p-8 border border-danger/40 shadow-xl text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-danger/20 flex items-center justify-center mb-4">
          <ShieldX className="w-7 h-7 text-danger" />
        </div>
        <h1 className="text-xl font-bold">License ถูกระงับ</h1>
        <p className="mt-2 text-sm text-text-muted" title={banner?.en}>
          {banner?.th ?? 'License ไม่สามารถใช้งานได้ในขณะนี้ — ระบบถูกปิดการใช้งานจนกว่าจะแก้ไข'}
        </p>
        {revoked_reason && (
          <p className="mt-2 text-[11px] text-text-muted font-mono">
            reason: {revoked_reason}
          </p>
        )}

        <div className="mt-6 space-y-2">
          <Link
            to="/settings/license"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            ไปหน้า ตั้งค่า License
          </Link>
          <button
            type="button"
            onClick={() => refresh()}
            className="w-full px-4 py-2 text-xs text-text-muted hover:text-text underline"
          >
            ตรวจสอบสถานะอีกครั้ง
          </button>
          <div className="pt-2 text-[11px] text-text-muted">
            <Link to="/docs" className="hover:text-text underline">คู่มือ</Link>
            {' · '}
            <Link to="/docs/tos" className="hover:text-text underline">Terms</Link>
            {' · '}
            <Link to="/docs/dpa" className="hover:text-text underline">DPA</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
