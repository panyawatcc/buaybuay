// LicenseSetup — customer onboarding screen for the 3 self-host inputs:
// license JWT, brain URL, anthropic key. Posts to /api/license/setup which
// stores in STATE_KV['license:self']. A "Test connection" button fires the
// setup then reads /api/license/status to verify the server can validate
// the JWT end-to-end before the customer closes the form.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ExternalLink, KeyRound, Link as LinkIcon, Loader2, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLicense } from '../components/LicenseContext';

type TestResult =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'ok'; tier?: string; seats?: number }
  | { kind: 'grace'; banner_th?: string }
  | { kind: 'fail'; reason: string };

export default function LicenseSetup() {
  const { config, refresh } = useLicense();
  const navigate = useNavigate();

  const [jwt, setJwt] = useState('');
  const [domain, setDomain] = useState('');
  const [brainUrl, setBrainUrl] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [anthropicKeyTouched, setAnthropicKeyTouched] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<TestResult>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const alreadyAccepted = Boolean(config?.terms_accepted);
  // Acceptance is required when:
  //   - First-time (no prior record), OR
  //   - Customer pastes a new JWT (server also enforces), OR
  //   - Accepted TOS/DPA versions are older than the current server versions
  //     (material update = re-accept per DPA §8).
  // Server ships current_tos_version + current_dpa_version + prompt_reaccept
  // in /api/license/status config payload; single-source-of-truth at
  // functions/_lib/legal-versions.ts. No client hardcode = no drift on
  // legal-version bump.
  const jwtChanged = jwt.trim().length > 0;
  const CURRENT_TOS = config?.current_tos_version ?? '1.1';
  const CURRENT_DPA = config?.current_dpa_version ?? '1.1';
  const versionStale = Boolean(config?.prompt_reaccept);
  const acceptanceRequired = !alreadyAccepted || jwtChanged || versionStale;

  // Pre-fill from server config (minus secrets) on mount.
  useEffect(() => {
    if (!config) return;
    if (config.domain) setDomain(config.domain);
    if (config.brain_url) setBrainUrl(config.brain_url);
    // If the server reports anthropic_key_configured, display a placeholder
    // so the customer knows one exists without exposing it.
  }, [config]);

  // Auto-seed domain from current window origin if the customer leaves it blank
  // — most self-hosters run the brand's public domain on the same host.
  const autoSeedDomain = useCallback(() => {
    if (!domain && typeof window !== 'undefined') {
      setDomain(window.location.hostname);
    }
  }, [domain]);

  const submit = async (mode: 'save' | 'test') => {
    setError(null);
    setSaving(true);
    setResult({ kind: 'running' });
    try {
      const body: Record<string, string | boolean> = {};
      if (jwt.trim()) body.jwt = jwt.trim();
      if (domain.trim()) body.domain = domain.trim();
      if (brainUrl.trim()) body.brain_url = brainUrl.trim();
      if (anthropicKeyTouched && anthropicKey.trim()) body.anthropic_key = anthropicKey.trim();
      if (accepted) body.accept_terms = true;

      const setupRes = await fetch('/api/license/setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!setupRes.ok) {
        const errBody = (await setupRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? `setup_http_${setupRes.status}`);
      }

      if (mode === 'test') {
        // Force refresh so the guard re-validates with the new JWT.
        await refresh();
        // Poll once more after a short delay in case KV consistency hasn't
        // propagated in the same event loop tick.
        const statusRes = await fetch('/api/license/status', {
          method: 'GET',
          credentials: 'include',
        });
        const statusBody = (await statusRes.json()) as {
          status: string;
          tier?: string;
          seats?: number;
          banner?: { th?: string };
          error?: string;
        };
        if (statusBody.status === 'active') {
          setResult({ kind: 'ok', tier: statusBody.tier, seats: statusBody.seats });
        } else if (statusBody.status === 'grace') {
          setResult({ kind: 'grace', banner_th: statusBody.banner?.th });
        } else {
          setResult({ kind: 'fail', reason: statusBody.error ?? statusBody.status });
        }
      } else {
        setResult({ kind: 'ok' });
        await refresh();
        // A plain save doesn't need to stay on the page — navigate back to
        // Settings index where the License card now renders the new state.
        setTimeout(() => navigate('/settings'), 800);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setResult({ kind: 'fail', reason: msg });
    } finally {
      setSaving(false);
    }
  };

  const clearStoredLicense = async () => {
    if (!confirm('ลบ license ที่บันทึกไว้? ระบบจะกลับไปใช้ค่า env ถ้ามี')) return;
    setSaving(true);
    try {
      await fetch('/api/license/setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      });
      setJwt('');
      setAnthropicKey('');
      setAnthropicKeyTouched(false);
      setResult({ kind: 'idle' });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const fieldCls =
    'w-full px-3 py-2 bg-surface-light border border-surface-lighter rounded-lg focus:border-primary focus:outline-none text-sm font-mono';
  const labelCls = 'block text-sm font-medium mb-1.5 text-text';
  const hintCls = 'mt-1 text-xs text-text-muted';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-primary-light" />
            ตั้งค่า License
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            ใส่ license key + ข้อมูลเชื่อมต่อ brain server + Anthropic API key ของคุณ
          </p>
        </div>
        <a
          href="/docs#ตั้งค่า-license"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary-light hover:text-primary"
        >
          <BookOpen className="w-4 h-4" />
          คู่มือ
        </a>
      </header>

      <div className="bg-surface rounded-xl p-6 space-y-5">
        <div>
          <label htmlFor="license-jwt" className={labelCls}>
            License key (JWT)
          </label>
          <textarea
            id="license-jwt"
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            placeholder={config?.has_jwt ? '(มี license ถูกบันทึกไว้แล้ว — ใส่ค่าใหม่เพื่อเปลี่ยน)' : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'}
            rows={3}
            className={`${fieldCls} resize-y`}
            spellCheck={false}
            autoComplete="off"
          />
          <p className={hintCls}>
            Golf ส่งให้คุณทาง email ตอนซื้อ (หลังจาก whitelist domain แล้ว) — ดู /docs Step 3
          </p>
        </div>

        <div>
          <label htmlFor="license-domain" className={labelCls}>
            Domain ที่ใช้งาน
          </label>
          <input
            id="license-domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onFocus={autoSeedDomain}
            placeholder="adbot.mybrand.com"
            className={fieldCls}
            spellCheck={false}
            autoComplete="off"
          />
          <p className={hintCls}>
            ต้องตรงกับ claim `domain` ของ JWT (strict match) — brain ตรวจสอบทุก request
          </p>
        </div>

        <div>
          <label htmlFor="license-brain-url" className={labelCls}>
            Brain URL
          </label>
          <input
            id="license-brain-url"
            type="text"
            value={brainUrl}
            onChange={(e) => setBrainUrl(e.target.value)}
            placeholder="https://api.adbot.io"
            className={fieldCls}
            spellCheck={false}
            autoComplete="off"
          />
          <p className={hintCls}>
            Default = https://api.adbot.io ถ้าไม่ใส่ (Golf แจ้ง workers.dev subdomain แทนถ้า DNS ยังไม่พร้อม)
          </p>
        </div>

        <div>
          <label htmlFor="license-anthropic" className={labelCls}>
            Anthropic API key (ของคุณเอง, BYOK)
          </label>
          <input
            id="license-anthropic"
            type="password"
            value={anthropicKey}
            onChange={(e) => { setAnthropicKey(e.target.value); setAnthropicKeyTouched(true); }}
            placeholder={
              config?.anthropic_key_configured
                ? '(มี key ถูกบันทึกไว้แล้ว — ไม่ต้องใส่ถ้าไม่เปลี่ยน)'
                : 'sk-ant-api03-...'
            }
            className={fieldCls}
            spellCheck={false}
            autoComplete="new-password"
          />
          <p className={hintCls}>
            Key ของคุณส่งตรงถึง Anthropic ผ่าน brain proxy — brain ไม่เก็บ (stateless BYOK)
          </p>
        </div>

        <label
          className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
            accepted ? 'border-success/60 bg-success/5' : 'border-surface-lighter bg-surface-light/40'
          }`}
        >
          <input
            type="checkbox"
            checked={accepted || (alreadyAccepted && !jwtChanged)}
            disabled={alreadyAccepted && !jwtChanged}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-primary shrink-0"
          />
          <span className="flex-1 text-xs leading-relaxed text-text">
            ฉันยอมรับ
            {' '}
            <Link to="/docs/tos" target="_blank" className="text-primary-light hover:text-primary underline inline-flex items-center gap-0.5">
              Terms of Service<ExternalLink className="w-3 h-3" />
            </Link>
            {' '}และ{' '}
            <Link to="/docs/dpa" target="_blank" className="text-primary-light hover:text-primary underline inline-flex items-center gap-0.5">
              Data Processing Agreement<ExternalLink className="w-3 h-3" />
            </Link>
            {' '}— รวมถึง Full Mirror access ที่ Vendor จะมีใน deployment ของฉัน เพื่อ security monitoring
            {alreadyAccepted && !jwtChanged && !versionStale && config?.accepted_at && (
              <span className="block mt-1 text-success text-[11px]">
                ✓ ยอมรับไว้แล้วเมื่อ {new Date(config.accepted_at * 1000).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                {config.accepted_tos_version && ` · TOS v${config.accepted_tos_version} · DPA v${config.accepted_dpa_version ?? '?'}`}
              </span>
            )}
            {jwtChanged && alreadyAccepted && (
              <span className="block mt-1 text-warning text-[11px]">
                ⚠️ JWT เปลี่ยน — ต้องยอมรับใหม่ก่อนบันทึก
              </span>
            )}
            {versionStale && !jwtChanged && (
              <span className="block mt-1 text-warning text-[11px]">
                ⚠️ ฉบับใหม่ (TOS v{CURRENT_TOS} · DPA v{CURRENT_DPA}): เพิ่ม Anthropic เป็น sub-processor — ต้องยอมรับใหม่
                {config?.accepted_tos_version && ` (ที่คุณยอมรับไว้: TOS v${config.accepted_tos_version} · DPA v${config.accepted_dpa_version})`}
              </span>
            )}
          </span>
        </label>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/40 rounded-lg text-sm">
            <XCircle className="w-4 h-4 text-danger shrink-0" />
            <span>ผิดพลาด: {error}</span>
          </div>
        )}

        {result.kind === 'ok' && result.tier && (
          <div className="flex items-start gap-2 p-3 bg-success/10 border border-success/40 rounded-lg text-sm">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text">เชื่อมต่อสำเร็จ — License active</p>
              <p className="text-xs text-text-muted mt-0.5">
                Tier: {result.tier} · Seats: {result.seats ?? '?'}
              </p>
            </div>
          </div>
        )}
        {result.kind === 'grace' && (
          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/40 rounded-lg text-sm">
            <ShieldCheck className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text">License อยู่ในช่วงผ่อนผัน</p>
              <p className="text-xs text-text-muted mt-0.5">{result.banner_th}</p>
            </div>
          </div>
        )}
        {result.kind === 'fail' && (
          <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/40 rounded-lg text-sm">
            <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text">ทดสอบไม่สำเร็จ</p>
              <p className="text-xs text-text-muted mt-0.5">{result.reason}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => submit('test')}
            disabled={saving || (!jwt.trim() && !config?.has_jwt) || (acceptanceRequired && !accepted)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            title={acceptanceRequired && !accepted ? 'ต้องยอมรับ Terms + DPA ก่อน' : undefined}
          >
            {saving && result.kind === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
            ทดสอบการเชื่อมต่อ
          </button>
          <button
            type="button"
            onClick={() => submit('save')}
            disabled={saving || (acceptanceRequired && !accepted)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-light hover:bg-surface-lighter disabled:opacity-50 disabled:cursor-not-allowed text-text rounded-lg font-medium transition-colors"
            title={acceptanceRequired && !accepted ? 'ต้องยอมรับ Terms + DPA ก่อน' : undefined}
          >
            บันทึก
          </button>
          {config?.has_jwt && (
            <button
              type="button"
              onClick={clearStoredLicense}
              disabled={saving}
              className="flex items-center gap-1.5 ml-auto px-3 py-2 text-xs text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบที่บันทึกไว้
            </button>
          )}
        </div>
      </div>

      <aside className="text-xs text-text-muted leading-relaxed">
        <p>
          <strong>หมายเหตุความปลอดภัย</strong>: Anthropic key + JWT เก็บใน Cloudflare KV (STATE_KV)
          ของ deployment ของคุณเอง — ไม่มีใครนอกจากคุณเข้าถึงได้ Brain server ไม่เก็บ Anthropic key
          (BYOK stateless). ถ้าจะ rotate key ให้ใส่ค่าใหม่แล้วกด "บันทึก"
        </p>
      </aside>
    </div>
  );
}
