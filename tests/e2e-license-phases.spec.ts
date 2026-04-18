// Customer-side license lockdown — 4 phases × register 402 modes.
// Route-mocks /api/auth/session + /api/license/status so the UI state-
// machine is exercised without a real backend.

import { test, expect, type Page } from '@playwright/test';

interface SessionMock {
  user?: { email: string; name: string; role?: 'admin' | 'manager' | 'viewer' };
  status?: number;
}

interface LicenseStatusMock {
  status: 'active' | 'warning' | 'degrade' | 'hard_block' | 'misconfigured' | 'error';
  mode?: 'active' | 'read_only' | 'blocked';
  tier?: string;
  seats?: number;
  expires_at?: number;
  warning?: string;
  days_remaining?: number;
  days_remaining_hard?: number;
  grace_until?: number;
  revoked_reason?: string;
  banner?: { en: string; th: string };
  config?: Record<string, unknown>;
}

async function mockBackend(page: Page, opts: { session?: SessionMock; license: LicenseStatusMock }) {
  // Single /api/** router — Playwright's last-registered-wins matching makes
  // overlapping patterns flaky. Dispatch by URL inside a single handler.
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === '/api/auth/me') {
      if (opts.session?.user) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: opts.session.user }),
        });
      } else {
        await route.fulfill({ status: opts.session?.status ?? 401, body: '' });
      }
      return;
    }
    if (path === '/api/license/status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(opts.license),
      });
      return;
    }
    if (path === '/api/auth/register') {
      // Handled per-test via page.route('**/api/auth/register', ...) which is
      // registered AFTER mockBackend and wins. Fall through.
      return route.fallback();
    }
    // Catchall — return empty 200 so boot-time probes don't 404.
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

const AUTHED = { user: { email: 'golf@test.local', name: 'Golf', role: 'admin' as const } };

test.describe('license lockdown UI — 4 phases', () => {
  test('active → no banner, dashboard renders', async ({ page }) => {
    await mockBackend(page, {
      session: AUTHED,
      license: { status: 'active', mode: 'active', tier: 'pro', seats: 1, expires_at: 4900000000 },
    });
    await page.goto('/');
    // No license banner (warning/degrade/misconfigured) should show.
    await expect(page.getByText(/โหมดอ่านอย่างเดียว|ใกล้หมดอายุ|ยังไม่ได้ตั้งค่า License|License ถูกระงับ/)).toHaveCount(0);
  });

  test('warning → yellow banner + countdown', async ({ page }) => {
    await mockBackend(page, {
      session: AUTHED,
      license: {
        status: 'warning',
        mode: 'active',
        tier: 'pro',
        seats: 1,
        warning: 'license_expiring',
        days_remaining: 5,
        banner: { en: 'License expiring soon.', th: 'License ใกล้หมดอายุ โปรดต่ออายุ' },
      },
    });
    await page.goto('/');
    await expect(page.getByText(/License ใกล้หมดอายุ/)).toBeVisible();
    await expect(page.getByText(/เหลือ 5 วัน/)).toBeVisible();
  });

  test('degrade → orange read-only banner + days-to-hard-block', async ({ page }) => {
    await mockBackend(page, {
      session: AUTHED,
      license: {
        status: 'degrade',
        mode: 'read_only',
        days_remaining_hard: 12,
        revoked_reason: 'chargeback',
        banner: { en: 'License on hold. Contact billing.', th: 'License ถูกระงับชั่วคราว ติดต่อฝ่ายการเงิน' },
      },
    });
    await page.goto('/');
    await expect(page.getByText(/โหมดอ่านอย่างเดียว/)).toBeVisible();
    await expect(page.getByText(/ปิดทั้งหมดใน 12 วัน/)).toBeVisible();
  });

  test('hard_block → full-page lockout + CTA to /settings/license', async ({ page }) => {
    await mockBackend(page, {
      session: AUTHED,
      license: {
        status: 'hard_block',
        mode: 'blocked',
        revoked_reason: 'fraud',
        banner: { en: 'License suspended. Contact vendor.', th: 'License ถูกระงับ ติดต่อผู้ขาย' },
      },
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /License ถูกระงับ/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /ตั้งค่า License/ })).toBeVisible();
    // Footer doc links survive the lockout so customer isn't trapped.
    await expect(page.getByRole('link', { name: 'คู่มือ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'DPA' })).toBeVisible();
  });

  test('misconfigured → yellow setup-nudge banner (NOT hard-block)', async ({ page }) => {
    await mockBackend(page, {
      session: AUTHED,
      license: { status: 'misconfigured', mode: 'blocked' },
    });
    await page.goto('/');
    await expect(page.getByText(/ยังไม่ได้ตั้งค่า License/)).toBeVisible();
    // Banner has a button-styled "ตั้งค่า" link (exact). Sidebar has other
    // links that include the word ตั้งค่า (ตั้งค่าเงื่อนไขบอท / เชื่อมต่อ & ตั้งค่า) —
    // use exact match to hit just the banner CTA.
    await expect(page.getByRole('link', { name: 'ตั้งค่า', exact: true })).toBeVisible();
    // Misconfigured is NOT hard_block — no full-page "License ถูกระงับ" screen.
    await expect(page.getByRole('heading', { name: /License ถูกระงับ/ })).toHaveCount(0);
  });

  test('active + terms_accepted:false → TOS banner nudges to /settings/license', async ({ page }) => {
    // Regression for TESTER gap #1 — license active but customer never
    // accepted TOS/DPA (typical when ops push license:self to KV directly).
    await mockBackend(page, {
      session: AUTHED,
      license: {
        status: 'active',
        mode: 'active',
        tier: 'pro',
        config: {
          has_jwt: true, domain: 'x.test', brain_url: null,
          anthropic_key_configured: false, terms_accepted: false,
          current_tos_version: '1.1', current_dpa_version: '1.1',
          prompt_reaccept: false,
        },
      },
    });
    await page.goto('/');
    await expect(page.getByText(/ต้องยอมรับข้อตกลง/)).toBeVisible();
    await expect(page.getByTestId('tos-banner-accept-link')).toBeVisible();
  });

  test('active + prompt_reaccept:true → TOS banner mentions new version', async ({ page }) => {
    await mockBackend(page, {
      session: AUTHED,
      license: {
        status: 'active',
        mode: 'active',
        config: {
          has_jwt: true, domain: 'x.test', brain_url: null,
          anthropic_key_configured: false, terms_accepted: true,
          accepted_tos_version: '1.0', accepted_dpa_version: '1.0',
          current_tos_version: '1.1', current_dpa_version: '1.1',
          prompt_reaccept: true,
        },
      },
    });
    await page.goto('/');
    await expect(page.getByText(/TOS v1\.1.*DPA v1\.1/)).toBeVisible();
  });

  test('hard_block exempts /settings/license route (so customer can fix)', async ({ page }) => {
    await mockBackend(page, {
      session: AUTHED,
      license: { status: 'hard_block', mode: 'blocked', revoked_reason: 'fraud' },
    });
    await page.goto('/settings/license');
    // HardBlock should NOT take over this route — setup form must be reachable.
    await expect(page.getByRole('heading', { name: /ตั้งค่า License/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^License ถูกระงับ$/ })).toHaveCount(0);
  });
});

test.describe('license-gated register — 402 modes', () => {
  // Register page is pre-auth; session stays 401 across these tests.
  async function mockRegister(page: Page, respond: { status: number; body: unknown }) {
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: respond.status,
        contentType: 'application/json',
        body: JSON.stringify(respond.body),
      });
    });
  }

  async function fillAndSubmit(page: Page) {
    await page.getByPlaceholder('ชื่อของคุณ').fill('Test');
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByPlaceholder('อย่างน้อย 6 ตัว').fill('hunter22');
    await page.getByRole('button', { name: /สมัครสมาชิก$/ }).click();
  }

  test('402 first_register_needs_license → auto-expand license section + copy', async ({ page }) => {
    await mockBackend(page, { license: { status: 'active', mode: 'active' } });
    await mockRegister(page, { status: 402, body: { error: 'license_required', mode: 'first_register_needs_license' } });
    await page.goto('/register');
    await fillAndSubmit(page);
    await expect(page.getByText(/บัญชีแรกต้องมี License key/)).toBeVisible();
    // License JWT textarea should now be visible (section auto-expanded).
    await expect(page.getByPlaceholder(/eyJhbGciOi/)).toBeVisible();
  });

  test('402 invalid → expand + JWT-integrity hint', async ({ page }) => {
    await mockBackend(page, { license: { status: 'active', mode: 'active' } });
    await mockRegister(page, { status: 402, body: { error: 'license_required', mode: 'invalid' } });
    await page.goto('/register');
    await fillAndSubmit(page);
    await expect(page.getByText(/JWT ครบทั้ง 3 ส่วน/)).toBeVisible();
  });

  test('402 hard_block → "License ถูกระงับ" error (no expand)', async ({ page }) => {
    await mockBackend(page, { license: { status: 'active', mode: 'active' } });
    await mockRegister(page, { status: 402, body: { error: 'license_required', mode: 'hard_block', revoked_reason: 'fraud' } });
    await page.goto('/register');
    await fillAndSubmit(page);
    await expect(page.getByText(/License ถูกระงับ — fraud/)).toBeVisible();
  });

  test('402 degrade → read-only countdown copy', async ({ page }) => {
    await mockBackend(page, { license: { status: 'active', mode: 'active' } });
    await mockRegister(page, { status: 402, body: { error: 'license_required', mode: 'degrade', days_remaining_hard: 7 } });
    await page.goto('/register');
    await fillAndSubmit(page);
    await expect(page.getByText(/read-only.*เหลือ 7/)).toBeVisible();
  });

  test('409 email exists → login hint', async ({ page }) => {
    await mockBackend(page, { license: { status: 'active', mode: 'active' } });
    await mockRegister(page, { status: 409, body: { error: 'Email already registered' } });
    await page.goto('/register');
    await fillAndSubmit(page);
    await expect(page.getByText(/อีเมลนี้ถูกใช้แล้ว/)).toBeVisible();
  });

  test('misconfigured at mount → section pre-expanded + first-admin hero copy', async ({ page }) => {
    await mockBackend(page, { license: { status: 'misconfigured', mode: 'blocked' } });
    await page.goto('/register');
    await expect(page.getByText(/ยินดีต้อนรับ — คุณคือ admin คนแรก/)).toBeVisible();
    // License fields already visible without needing to click.
    await expect(page.getByPlaceholder(/eyJhbGciOi/)).toBeVisible();
  });
});
