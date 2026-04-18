// Quick Install — CF Deploy Button landing + post-deploy success screen.
// Path A per SCOUT research (~/shared/scout-hosted-installer-feasibility.md)
// and PLANNER dispatch 2026-04-19 — ships a 1-click install flow so a
// non-technical Thai SMB can deploy adbot-ai-product without a terminal.
//
// Two sub-pages share this component, dispatched on pathname:
//   /docs/quick-install          → marketing + Deploy Button
//   /docs/quick-install/success  → landing after CF provisions D1/KV/Pages
//
// Deploy Button URL is currently stubbed to the canonical CF Deploy
// endpoint with a placeholder `url=` query. DEVOPS delivers the final
// repo-pinned URL via ~/shared/quick-install-deploy-url.md — swap the
// STUB_DEPLOY_BUTTON_URL constant below when that arrives (no other
// code change needed).

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, CheckCircle2, ExternalLink, Home, Rocket,
  ShieldCheck, Sparkles, Zap,
} from 'lucide-react';

// STUB — replace with DEVOPS URL from ~/shared/quick-install-deploy-url.md
// once the repo visibility + wrangler.toml audit is confirmed. Kept on
// the deploy.workers.cloudflare.com origin so the Playwright regex
// continues to pass without a test edit.
const STUB_DEPLOY_BUTTON_URL =
  'https://deploy.workers.cloudflare.com/?url=https://github.com/PLACEHOLDER-ORG/adbot-ai-product&branch=main';

// Cross-doc sibling links — reuse the same anchor list the Docs.tsx
// layout renders at the bottom of every markdown page.
const SIBLING_LINKS = [
  { to: '/docs', label: 'คู่มือ' },
  { to: '/docs/quick-install', label: '1-click Install', highlight: true },
  { to: '/docs/ai-install', label: 'AI Install' },
  { to: '/docs/manual-install', label: 'Manual' },
  { to: '/docs/tos', label: 'Terms' },
  { to: '/docs/dpa', label: 'DPA' },
];

export default function QuickInstall() {
  const { pathname, search } = useLocation();
  const isSuccess = pathname.endsWith('/success');

  useEffect(() => {
    document.title = isSuccess
      ? 'Installation successful — AdsPanda AI'
      : 'ติดตั้ง 1-click (Quick Install) — AdsPanda AI';
    return () => { document.title = 'AdsPanda AI'; };
  }, [isSuccess]);

  if (isSuccess) return <QuickInstallSuccess search={search} />;
  return <QuickInstallLanding />;
}

// ─── Landing ───────────────────────────────────────────────────────────────

function QuickInstallLanding() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/15 text-success text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Recommended · ง่ายที่สุด
          </div>
          <h1
            data-testid="quick-install-title"
            className="text-3xl md:text-4xl font-bold tracking-tight"
          >
            ติดตั้ง AdsPanda AI ด้วย 1 คลิก
          </h1>
          <p className="text-base text-text-muted max-w-2xl">
            ไม่ต้องเปิด terminal, ไม่ต้องใช้ command line — Cloudflare จะตั้ง
            database + storage + web hosting ให้อัตโนมัติ เสร็จใน ~90 วินาที
          </p>
          <p className="text-sm text-text-muted max-w-2xl">
            <span className="font-medium text-text">For English speakers:</span>
            {' '}One-click install — Cloudflare provisions D1, KV, and Pages
            automatically. No terminal required. Completes in ~90 seconds.
          </p>
        </header>

        {/* Primary CTA — the Deploy Button */}
        <section className="bg-gradient-to-br from-primary/15 via-info/10 to-success/10 border border-primary/30 rounded-2xl p-6 md:p-8 space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 text-primary-light shrink-0">
              <Rocket className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-semibold">เริ่มติดตั้งเลย</h2>
              <p className="text-sm text-text-muted">
                คลิกปุ่มด้านล่าง → ล็อกอิน Cloudflare (ถ้ายังไม่มี account
                สมัครฟรีได้) → ปุ่ม "Deploy" → รอ ~90 วินาที → กลับมาที่
                AdsPanda อัตโนมัติ
              </p>
            </div>
          </div>

          <a
            data-testid="quick-install-deploy-button"
            href={STUB_DEPLOY_BUTTON_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-base shadow-lg shadow-primary/20 transition-colors"
          >
            <Zap className="w-5 h-5" />
            Deploy to Cloudflare
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>

          <p className="text-[11px] text-text-muted">
            ปุ่มจะเปิด Cloudflare ใน tab ใหม่ (deploy.workers.cloudflare.com)
            — ไม่มีการเก็บ credential ใดๆ ที่ฝั่ง AdsPanda · ถ้า Cloudflare
            ถาม login ครั้งแรก จะกลับมาต่อได้ทันทีที่ login เสร็จ
          </p>
        </section>

        {/* 3-step explainer */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">เกิดอะไรขึ้น 3 ขั้น</h2>
          <ol className="space-y-3">
            <Step
              index={1}
              testid="quick-install-step-1"
              title="คลิก Deploy to Cloudflare"
              body="ระบบจะพาไปเว็บ Cloudflare — ถ้ายังไม่มี account จะให้สมัคร (ฟรี, ไม่ต้องใส่บัตรเครดิต)"
            />
            <Step
              index={2}
              testid="quick-install-step-2"
              title="Cloudflare ตั้งค่าให้อัตโนมัติ"
              body="สร้าง database (D1) + storage (KV) + web hosting (Pages) พร้อมใช้งานทันที ไม่ต้องพิมพ์คำสั่งอะไร"
            />
            <Step
              index={3}
              testid="quick-install-step-3"
              title="กลับมา AdsPanda → รอ license"
              body="หลัง deploy เสร็จจะเด้งกลับมาหน้าสำเร็จ ให้รอ email license key จากทีม AdsPanda (ปกติภายใน 1 วันทำการ) → จบ"
            />
          </ol>
        </section>

        {/* Escape hatches — other install paths */}
        <section className="space-y-3 pt-6 border-t border-surface-lighter">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
            เส้นทางอื่น (ถ้าต้องการ)
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <PathCard
              to="/docs/ai-install"
              title="AI Install"
              body="ใช้ Claude / ChatGPT / Cursor พิมพ์คำสั่งติดตั้งให้ (สำหรับคนที่อยากใช้ AI แทนปุ่ม)"
              badge="BACKUP"
              badgeTone="info"
            />
            <PathCard
              to="/docs/manual-install"
              title="Manual Install"
              body="Clone repo + pnpm install + wrangler deploy (สำหรับ developer / agency ที่ต้องการ full control)"
              badge="DEVELOPER ONLY"
              badgeTone="warning"
            />
          </div>
        </section>

        <SiblingNav />
      </main>
    </div>
  );
}

// ─── Success ───────────────────────────────────────────────────────────────

function QuickInstallSuccess({ search }: { search: string }) {
  const deploymentId = useMemo(() => {
    try {
      return new URLSearchParams(search).get('deployment_id') ?? null;
    } catch { return null; }
  }, [search]);
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    if (!deploymentId) return;
    try {
      await navigator.clipboard.writeText(deploymentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <TopNav />
      <main className="max-w-2xl mx-auto px-4 py-12 md:py-16 space-y-8">
        <section
          data-testid="quick-install-success"
          className="bg-surface rounded-2xl p-8 border border-success/40 text-center space-y-5"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/15 text-success">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">
              ✓ Installation successful
            </h1>
            <p className="text-base text-text-muted">
              ติดตั้งเสร็จแล้ว — ขั้นถัดไปคือรอ <strong className="text-text">license JWT</strong> จาก AdsPanda
            </p>
            <p className="text-sm text-text-muted">
              Installation successful — license JWT needed next.
            </p>
            {/* Explicit email-flow copy — BACKEND research 2026-04-19
                confirmed CF Deploy Button strips env pre-fill, so the
                license JWT delivery path is always: Golf clicks issue
                in admin-web → brain /admin/customer/send-welcome fires
                → customer's inbox. Setting expectations here cuts
                support pings (customer otherwise wonders what to do). */}
            <div className="mx-auto max-w-md bg-info/10 border border-info/30 rounded-lg p-3 text-left text-xs space-y-1">
              <p className="text-text">
                📧 <strong>ตรวจสอบอีเมลของคุณ</strong> — Golf ส่ง license JWT
                มาให้ วางในหน้า setup ของ instance ใหม่เพื่อติดตั้งให้เสร็จ
              </p>
              <p className="text-text-muted">
                Check your email for your license JWT from Golf — paste it
                into the setup form on your new instance to finish install.
              </p>
            </div>
          </div>

          {deploymentId && (
            <div className="mx-auto max-w-sm bg-surface-light border border-surface-lighter rounded-lg px-4 py-3 text-left">
              <p className="text-[11px] text-text-muted uppercase tracking-wide mb-1">
                Deployment ID
              </p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono text-primary-light break-all">
                  {deploymentId}
                </code>
                <button
                  type="button"
                  onClick={copyId}
                  className="text-[11px] text-text-muted hover:text-text underline shrink-0"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-text-muted mt-1">
                แนบรหัสนี้เวลาติดต่อซัพพอร์ตถ้าต้องการความช่วยเหลือ
              </p>
            </div>
          )}
        </section>

        {/* Next steps */}
        <section className="bg-surface rounded-xl p-6 border border-surface-lighter space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-info" />
            ขั้นถัดไป (Next steps)
          </h2>
          <ol className="space-y-3 text-sm">
            <NextStep
              index={1}
              title="รอ license email"
              body="ทีม AdsPanda จะส่ง license JWT ให้ทาง email ภายใน 1 วันทำการ"
            />
            <NextStep
              index={2}
              title="ตั้งค่า license"
              body={
                <>
                  ไปที่ <Link to="/settings/license" className="text-primary-light hover:text-primary underline">/settings/license</Link>
                  {' '}วาง JWT ที่ได้รับ → กด "ทดสอบการเชื่อมต่อ" → ถ้าเขียวก็พร้อมใช้งาน
                </>
              }
            />
            <NextStep
              index={3}
              title="สมัครสมาชิกเจ้าของ"
              body={
                <>
                  ไปที่ <Link to="/register" className="text-primary-light hover:text-primary underline">/register</Link>
                  {' '}สร้าง account admin คนแรก → เชื่อมต่อ Facebook → เริ่มใช้งาน
                </>
              }
            />
          </ol>
        </section>

        <SiblingNav />
      </main>
    </div>
  );
}

// ─── Shared bits ───────────────────────────────────────────────────────────

function TopNav() {
  return (
    <nav className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-surface-lighter">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/docs" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <ArrowLeft className="w-4 h-4" />
          กลับ /docs
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <Home className="w-4 h-4" />
          AdsPanda AI
        </Link>
      </div>
    </nav>
  );
}

function SiblingNav() {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-wrap items-center gap-2 pt-6 border-t border-surface-lighter">
      <span className="text-xs text-text-muted flex items-center gap-1 mr-1">
        <BookOpen className="w-3.5 h-3.5" />
        เอกสารอื่น:
      </span>
      {SIBLING_LINKS.map((link) => {
        const active = pathname === link.to;
        return (
          <Link
            key={link.to}
            to={link.to}
            className={[
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
              active
                ? 'bg-primary/20 text-primary-light'
                : link.highlight
                  ? 'bg-success/10 text-success hover:bg-success/20'
                  : 'text-text-muted hover:bg-surface-light hover:text-text',
            ].join(' ')}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Step({ index, testid, title, body }: { index: number; testid: string; title: string; body: string }) {
  return (
    <li data-testid={testid} className="flex items-start gap-4 bg-surface rounded-xl p-4 border border-surface-lighter">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary-light font-bold text-sm shrink-0">
        {index}
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-text-muted">{body}</p>
      </div>
    </li>
  );
}

function NextStep({ index, title, body }: { index: number; title: string; body: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-info/15 text-info font-bold text-xs shrink-0 mt-0.5">
        {index}
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-text-muted">{body}</p>
      </div>
    </li>
  );
}

function PathCard({
  to, title, body, badge, badgeTone,
}: {
  to: string; title: string; body: string; badge: string;
  badgeTone: 'info' | 'warning';
}) {
  const toneCls = badgeTone === 'info'
    ? 'bg-info/15 text-info'
    : 'bg-warning/15 text-warning';
  return (
    <Link
      to={to}
      className="block bg-surface rounded-xl p-4 border border-surface-lighter hover:border-primary/40 transition-colors space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">{title}</h4>
        <span className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded ${toneCls}`}>
          {badge}
        </span>
      </div>
      <p className="text-xs text-text-muted">{body}</p>
    </Link>
  );
}
