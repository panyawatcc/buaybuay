// LicenseBanner — top-of-shell strip for warning / degrade / misconfigured /
// terms-unaccepted. hard_block is handled separately by <LicenseHardBlock />
// (full-page, replaces main content); banner is a narrow strip that co-exists
// with the normal UI.

import { AlertTriangle, Clock, FileText, Settings, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useLicense } from './LicenseContext';

function daysText(days?: number): string {
  if (days === undefined || days === null) return '';
  if (days <= 0) return 'วันนี้';
  if (days === 1) return '1 วัน';
  return `${days} วัน`;
}

export default function LicenseBanner() {
  const { status, banner, days_remaining, days_remaining_hard, grace_until, revoked_reason, config, refresh } = useLicense();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && status === 'warning') return null;  // warning is dismissable
  // degrade + hard_block + misconfigured + terms-unaccepted are NOT dismissable

  // Terms-unaccepted — license is active (JWT valid, domain ok) but the
  // customer never accepted TOS/DPA. Typical path: admin pushed the license
  // record to STATE_KV directly (bypassing /api/license/setup) OR a legal
  // version bump flipped prompt_reaccept=true. Can co-exist with any license
  // phase except hard_block (where HardBlock takes over the whole viewport).
  // Gated to active/warning so we don't double-stack on misconfigured/degrade
  // (those already nudge to /settings/license with different copy).
  const needsTermsAccept = Boolean(
    (status === 'active' || status === 'warning') &&
    config && (config.terms_accepted === false || config.prompt_reaccept === true),
  );
  if (needsTermsAccept) {
    const isVersionBump = config?.prompt_reaccept === true && config?.terms_accepted === true;
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-warning/15 border-b border-warning/40 text-sm">
        <FileText className="w-4 h-4 text-warning shrink-0" />
        <span className="flex-1 text-text">
          <strong>ต้องยอมรับข้อตกลง</strong> —
          {' '}
          {isVersionBump
            ? `Terms / DPA มีฉบับใหม่ (TOS v${config?.current_tos_version ?? '?'} · DPA v${config?.current_dpa_version ?? '?'}) — กรุณายอมรับก่อนใช้งานต่อ`
            : 'กรุณายอมรับ Terms of Service + Data Processing Agreement ก่อนใช้งาน'}
        </span>
        <Link
          to="/settings/license"
          className="flex items-center gap-1.5 px-3 py-1 bg-warning text-bg rounded-md font-medium hover:bg-warning/80 transition-colors"
          data-testid="tos-banner-accept-link"
        >
          <Settings className="w-3.5 h-3.5" />
          ยอมรับ
        </Link>
      </div>
    );
  }

  // Misconfigured — customer hasn't finished license setup. Nudge into setup.
  if (status === 'misconfigured') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-warning/15 border-b border-warning/40 text-sm">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
        <span className="flex-1 text-text">
          ยังไม่ได้ตั้งค่า License — ตั้งค่า License key เพื่อเริ่มใช้งาน AdsPanda AI
        </span>
        <Link
          to="/settings/license"
          className="flex items-center gap-1.5 px-3 py-1 bg-warning text-bg rounded-md font-medium hover:bg-warning/80 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          ตั้งค่า
        </Link>
      </div>
    );
  }

  // Warning — yellow countdown, dismissable. Mutations still work; banner
  // reminds customer to renew / reactivate before cutoff (7d default per B29).
  if (status === 'warning') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-warning/15 border-b border-warning/40 text-sm">
        <Clock className="w-4 h-4 text-warning shrink-0" />
        <span className="flex-1 text-text" title={banner?.en}>
          {banner?.th ?? 'License ใกล้หมดอายุ'}
          {days_remaining !== undefined && (
            <span className="text-text-muted ml-2">· เหลือ {daysText(days_remaining)}</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-xs text-text-muted hover:text-text underline"
        >
          รีเฟรช
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="ปิดข้อความ"
          className="p-1 text-text-muted hover:text-text"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Degrade — orange Sketch-soft read-only window. Mutations are 402'd by
  // middleware; this banner explains why buttons look disabled. Countdown
  // to hard_block helps customer urgency.
  if (status === 'degrade') {
    const graceDate = grace_until
      ? new Date(grace_until * 1000).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
      : null;
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-danger/15 border-b border-danger/40 text-sm">
        <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
        <span className="flex-1 text-text" title={banner?.en}>
          <strong>โหมดอ่านอย่างเดียว</strong> —
          {' '}
          {banner?.th ?? 'License ถูกระงับ ทำการแก้ไขไม่ได้ชั่วคราว'}
          {days_remaining_hard !== undefined && (
            <span className="ml-2">· ระบบจะปิดทั้งหมดใน {daysText(days_remaining_hard)}</span>
          )}
          {graceDate && (
            <span className="text-text-muted ml-2">· deadline: {graceDate}</span>
          )}
        </span>
        <Link
          to="/settings/license"
          className="flex items-center gap-1.5 px-3 py-1 bg-danger text-white rounded-md font-medium hover:bg-danger/80 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          แก้ไข License
        </Link>
      </div>
    );
  }

  // hard_block is handled by <LicenseHardBlock /> instead of this banner —
  // return null here so the layout isn't double-stacked.
  if (status === 'hard_block') {
    return null;
  }

  // loading/error/active → no banner
  void revoked_reason;  // available for debug logging if needed
  return null;
}
