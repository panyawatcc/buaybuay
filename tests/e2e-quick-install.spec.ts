// Quick Install (CF Deploy Button) — customer one-click install flow.
// Covers /docs/quick-install page + /docs/quick-install/success return
// landing. Test-must-fail-first empirical verify per PLANNER dispatch
// 2026-04-19 — page + routes must render BEFORE wiring external URL.
//
// Deploy Button URL is stubbed (DEVOPS ships real URL later via
// ~/shared/quick-install-deploy-url.md). Test asserts the button is
// present + external (target=_blank) + points at deploy.workers.
// cloudflare.com — any URL on that origin is acceptable while DEVOPS
// finalizes the repo pointer.

import { test, expect } from '@playwright/test';

test.describe('Quick Install — CF Deploy Button page', () => {
  test('renders page shell + prominent Deploy Button', async ({ page }) => {
    await page.goto('/docs/quick-install');
    await expect(page.getByTestId('quick-install-title')).toBeVisible();
    const button = page.getByTestId('quick-install-deploy-button');
    await expect(button).toBeVisible();
    const href = await button.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href!).toMatch(/^https:\/\/deploy\.workers\.cloudflare\.com\//);
    // External link discipline — must open in new tab.
    await expect(button).toHaveAttribute('target', '_blank');
    await expect(button).toHaveAttribute('rel', /noopener/);
  });

  test('explains the 3 steps + shows fallback links to other install paths', async ({ page }) => {
    await page.goto('/docs/quick-install');
    // 3-step customer-facing explainer (content-safe regex — CONTENT may
    // iterate copy; we assert structure, not exact wording).
    await expect(page.getByTestId('quick-install-step-1')).toBeVisible();
    await expect(page.getByTestId('quick-install-step-2')).toBeVisible();
    await expect(page.getByTestId('quick-install-step-3')).toBeVisible();
    // Decision-tree escape hatches for advanced users. Both show up in
    // the path cards AND the sibling nav footer; .first() is fine — we
    // only care that at least one of each exists on the page.
    await expect(page.getByRole('link', { name: /AI Install/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Manual/i }).first()).toBeVisible();
  });

  test('success screen renders with deployment_id from query', async ({ page }) => {
    await page.goto('/docs/quick-install/success?deployment_id=dep_abc123');
    await expect(page.getByTestId('quick-install-success')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Installation successful/i })).toBeVisible();
    await expect(page.getByText(/license JWT/i).first()).toBeVisible();
    // deployment_id echoed so customer can reference it when contacting
    // support. Absence = harmless; presence = must show verbatim.
    await expect(page.getByText('dep_abc123')).toBeVisible();
  });

  test('success screen is resilient when deployment_id missing', async ({ page }) => {
    // CF may omit the param on legacy flow — page should still render.
    await page.goto('/docs/quick-install/success');
    await expect(page.getByTestId('quick-install-success')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Installation successful/i })).toBeVisible();
  });
});
