#!/usr/bin/env bun
/**
 * Pre-handoff Screenshot Script
 * Captures all pages for visual QA before sending to TESTER.
 *
 * Usage:
 *   bun src/scripts/screenshot.ts [task-id] [base-url]
 *
 * Examples:
 *   bun src/scripts/screenshot.ts P0-FIX
 *   bun src/scripts/screenshot.ts P0-FIX https://facebook-ad-scaler.pages.dev
 *
 * Output: ~/shared/screenshots/{task-id}/
 *
 * Requires: playwright (bun add -d playwright)
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const TASK_ID = process.argv[2] || `screenshot-${Date.now()}`;
const BASE_URL = process.argv[3] || 'https://facebook-ad-scaler.pages.dev';
const EMAIL = process.env.ADBOT_EMAIL || 'admin@test.com';
const PASSWORD = process.env.ADBOT_PASSWORD || 'test1234';
const OUTPUT_DIR = join(process.env.HOME || '~', 'shared', 'screenshots', TASK_ID);

const PAGES = [
  { name: '01-dashboard', path: '/' },
  { name: '02-campaigns', path: '/campaigns' },
  { name: '03-rankings', path: '/rankings' },
  { name: '04-content-analysis', path: '/content-analysis' },
  { name: '05-bot-rules', path: '/bot-rules' },
  { name: '06-bot-actions', path: '/bot-actions' },
  { name: '07-audience', path: '/audience' },
  { name: '08-rules-performance', path: '/rules/performance' },
  { name: '09-team', path: '/team' },
  { name: '10-settings', path: '/settings' },
  { name: '11-history', path: '/history' },
];

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`📸 Screenshot task: ${TASK_ID}`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  console.log('🔐 Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[placeholder*="อีเมล"], input[placeholder*="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"], button:has-text("เข้าสู่ระบบ")');
  await page.waitForURL('**/');
  await page.waitForTimeout(2000);
  console.log('✅ Logged in');

  // Capture each page
  for (const { name, path } of PAGES) {
    try {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForTimeout(3000); // Wait for data to load
      const filepath = join(OUTPUT_DIR, `${name}.png`);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`✅ ${name} → ${filepath}`);
    } catch (e) {
      console.error(`❌ ${name} failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Campaigns tabs — capture all 3
  for (const tab of ['Ad Sets', 'Ads']) {
    try {
      await page.goto(`${BASE_URL}/campaigns`);
      await page.waitForTimeout(2000);
      await page.click(`button:has-text("${tab}")`);
      await page.waitForTimeout(2000);
      const filepath = join(OUTPUT_DIR, `02-campaigns-${tab.toLowerCase().replace(' ', '-')}.png`);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`✅ campaigns-${tab} → ${filepath}`);
    } catch (e) {
      console.error(`❌ campaigns-${tab} failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Creative modal — click first ad row
  try {
    await page.goto(`${BASE_URL}/campaigns`);
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Ads")');
    await page.waitForTimeout(2000);
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count()) {
      await firstRow.click();
      await page.waitForTimeout(3000); // Wait for creative fetch
      const filepath = join(OUTPUT_DIR, `02-campaigns-creative-modal.png`);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`✅ creative-modal → ${filepath}`);
    }
  } catch (e) {
    console.error(`❌ creative-modal failed: ${e instanceof Error ? e.message : e}`);
  }

  await browser.close();
  console.log(`\n📸 Done! ${PAGES.length + 3} screenshots in ${OUTPUT_DIR}`);
}

run().catch(console.error);
