// Register — license-gated signup per BACKEND contract 0821f66.
//
// First admin: license_jwt + domain REQUIRED in POST /api/auth/register body.
// Subsequent admins: body license_jwt IGNORED (server uses stored).
//
// UX: single form + collapsible "License (first admin only)" section.
// Server 402 tells us what's missing; client expands section + highlights.
// No client-side guessing of first-admin state.

import { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Bot, ChevronDown, ChevronRight, ExternalLink, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { useLicense } from '../components/LicenseContext';
import { useToast } from '../components/Toast';

interface RegisterError {
  mode?: 'first_register_needs_license' | 'invalid' | 'missing_domain' | 'hard_block' | 'degrade' | 'misconfigured';
  reason?: string;
  revoked_reason?: string;
  days_remaining_hard?: number;
}

export default function Register() {
  const { user } = useAuth();
  const { refresh: refreshLicense, status: licenseStatus } = useLicense();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // License fields — expanded automatically when server tells us we're first.
  const [licenseJwt, setLicenseJwt] = useState('');
  const [domain, setDomain] = useState('');
  const [brainUrl, setBrainUrl] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [licenseExpanded, setLicenseExpanded] = useState(false);
  // TOS + DPA acceptance — Full Mirror disclosure gate. Required when the
  // license section is in play (first-admin path); server captures
  // accepted_at + accepted_ip + accepted_tos_version + accepted_dpa_version
  // per BACKEND 0821f66 so audit trail is complete from register, matching
  // /api/license/setup's flow.
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const needsAcceptance = licenseExpanded || licenseJwt.trim().length > 0;

  // If server already reports misconfigured, this deployment has no license
  // yet → next register is first-admin, pre-expand the section to hint.
  useEffect(() => {
    if (licenseStatus === 'misconfigured') setLicenseExpanded(true);
  }, [licenseStatus]);

  if (user) return <Navigate to="/" replace />;

  const autoSeedDomain = () => {
    if (!domain && typeof window !== 'undefined') setDomain(window.location.hostname);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('กรอกชื่อ + อีเมล + รหัสผ่าน ก่อน');
      return;
    }
    setSaving(true);
    try {
      if (needsAcceptance && !acceptedTerms) {
        setError('ต้องยอมรับ Terms of Service + Data Processing Agreement ก่อน (Full Mirror disclosure)');
        setSaving(false);
        return;
      }
      const body: Record<string, string | boolean> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      };
      // Always forward license fields if present — server ignores for
      // non-first admins, requires for first.
      if (licenseJwt.trim()) body.license_jwt = licenseJwt.trim();
      if (domain.trim()) body.domain = domain.trim();
      if (brainUrl.trim()) body.brain_url = brainUrl.trim();
      if (anthropicKey.trim()) body.anthropic_key = anthropicKey.trim();
      if (acceptedTerms) body.accept_terms = true;

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { user: { name?: string }; first_admin?: boolean };
        // Set-Cookie lands with the 201 — refresh the license guard so any
        // mode header captured during registration gets reflected in the SPA.
        await refreshLicense();
        toast(
          data.first_admin
            ? `ยินดีต้อนรับ ${name} — คุณคือ admin คนแรก เริ่มใช้งานได้เลย`
            : `ยินดีต้อนรับ ${name}`,
          'success',
        );
        navigate('/');
        return;
      }

      if (res.status === 402) {
        const body402 = (await res.json()) as RegisterError;
        const mode = body402.mode;
        if (mode === 'first_register_needs_license' || mode === 'missing_domain') {
          setLicenseExpanded(true);
          setError(
            mode === 'missing_domain'
              ? 'First admin ต้องใส่ Domain ด้วย — เพิ่มด้านล่าง'
              : 'บัญชีแรกต้องมี License key + Domain — เปิด "License (first admin)" ด้านล่าง',
          );
        } else if (mode === 'invalid') {
          setLicenseExpanded(true);
          setError('License key ไม่ถูกต้อง — ตรวจสอบว่า JWT ครบทั้ง 3 ส่วน (eyJ.eyJ.sig) + Domain ตรงกับในอีเมลของ Golf');
        } else if (mode === 'hard_block') {
          setError(`License ถูกระงับ — ${body402.revoked_reason ?? 'ติดต่อผู้ขาย'}`);
        } else if (mode === 'degrade') {
          setError(
            `License อยู่ในช่วง read-only (เหลือ ${body402.days_remaining_hard ?? '?'} วันก่อน hard-block) — แก้ License ก่อนสมัครสมาชิกใหม่`,
          );
        } else if (mode === 'misconfigured') {
          setLicenseExpanded(true);
          setError('Deployment ยังไม่ได้ตั้งค่า License — เพิ่ม license_jwt + domain ด้านล่าง');
        } else {
          setError(body402.reason ?? 'license_required');
        }
        return;
      }

      if (res.status === 409) {
        setError('อีเมลนี้ถูกใช้แล้ว — ลอง login แทน');
        return;
      }

      const errBody = await res.json().catch(() => ({}));
      setError(
        (errBody as { error?: string }).error ?? `สมัครไม่สำเร็จ (HTTP ${res.status})`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-surface-light border border-surface-lighter rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary';
  const labelCls = 'block text-xs text-text-muted mb-1.5';

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Bot className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">AdsPanda AI</span>
          </div>
          <p className="text-sm text-text-muted">
            {licenseStatus === 'misconfigured'
              ? 'ยินดีต้อนรับ — คุณคือ admin คนแรกของ deployment นี้'
              : 'สมัครสมาชิก'}
          </p>
        </div>

        <form onSubmit={submit} className="bg-surface border border-surface-lighter rounded-2xl p-6 space-y-4">
          <div>
            <label className={labelCls}>ชื่อ</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อของคุณ" autoFocus className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>อีเมล</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>รหัสผ่าน</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัว" className={inputCls} />
          </div>

          {/* License section — collapsible. Auto-expands when we know this is
              first admin (misconfigured license status) or when server 402s. */}
          <div className="border-t border-surface-lighter pt-3">
            <button
              type="button"
              onClick={() => setLicenseExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-left text-xs text-text-muted hover:text-text"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                License (first admin only — skip if someone else set it up)
              </span>
              {licenseExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {licenseExpanded && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className={labelCls}>License JWT</label>
                  <textarea
                    value={licenseJwt}
                    onChange={(e) => setLicenseJwt(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    rows={2}
                    className={`${inputCls} font-mono text-xs resize-y`}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <p className="mt-1 text-[11px] text-text-muted">
                    Golf ส่งให้ทาง email ตอนซื้อ — ดู{' '}
                    <Link to="/docs" target="_blank" className="text-primary-light hover:text-primary inline-flex items-center gap-0.5">
                      คู่มือ<ExternalLink className="w-3 h-3" />
                    </Link>
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Domain</label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onFocus={autoSeedDomain}
                    placeholder="adbot.mybrand.com"
                    className={`${inputCls} font-mono text-xs`}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
                <details>
                  <summary className="cursor-pointer text-[11px] text-text-muted hover:text-text">
                    ตั้งค่าขั้นสูง (brain URL + Anthropic key) ▾
                  </summary>
                  <div className="mt-2 space-y-3">
                    <div>
                      <label className={labelCls}>Brain URL (optional)</label>
                      <input
                        type="text"
                        value={brainUrl}
                        onChange={(e) => setBrainUrl(e.target.value)}
                        placeholder="https://api.adbot.io"
                        className={`${inputCls} font-mono text-xs`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Anthropic API key (BYOK, optional)</label>
                      <input
                        type="password"
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder="sk-ant-api03-..."
                        className={`${inputCls} font-mono text-xs`}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* TOS + DPA acceptance — Full Mirror disclosure gate.
              Always visible when the License section is expanded OR when a
              JWT is pasted (both = first-admin-path indicators). Captured
              in POST body as accept_terms:true; server stores accepted_at,
              accepted_ip, accepted_tos_version, accepted_dpa_version per
              BACKEND 0821f66 — audit trail consistent with /api/license/setup. */}
          {needsAcceptance && (
            <label
              className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                acceptedTerms ? 'border-success/60 bg-success/5' : 'border-surface-lighter bg-surface-light/40'
              }`}
            >
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-primary shrink-0"
              />
              <span className="flex-1 text-xs leading-relaxed text-text">
                ฉันยอมรับ{' '}
                <Link to="/docs/tos" target="_blank" className="text-primary-light hover:text-primary underline">
                  Terms of Service
                </Link>
                {' '}และ{' '}
                <Link to="/docs/dpa" target="_blank" className="text-primary-light hover:text-primary underline">
                  Data Processing Agreement
                </Link>
                {' '}— รวมถึง <strong>Full Mirror access</strong> ที่ Vendor จะมีใน deployment ของฉัน เพื่อ security monitoring
              </span>
            </label>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving || (needsAcceptance && !acceptedTerms)}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            title={needsAcceptance && !acceptedTerms ? 'ต้องยอมรับ Terms + DPA ก่อน' : undefined}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิก'}
          </button>

          <p className="text-center text-sm text-text-muted">
            มีบัญชีอยู่แล้ว?{' '}
            <Link to="/login" className="text-primary-light hover:text-primary">เข้าสู่ระบบ</Link>
          </p>
          <p className="text-center text-xs text-text-muted">
            ไม่รู้ว่าเริ่มยังไง?{' '}
            <Link to="/docs/ai-install" className="text-primary-light hover:text-primary">Use AI to install →</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
