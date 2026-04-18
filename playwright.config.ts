import { defineConfig, devices } from '@playwright/test';

// Customer-side license lockdown regression suite. Tests the UI's phase-
// transition rendering + register 402 mode handling via page.route() mocks
// — no real brain required. Covers the coverage bisect BACKEND flagged:
// server-side smoke + product smoke both green, but the full browser path
// across phase boundaries is what catches SPA redirect / state-machine
// bugs (pattern from earlier admin web-auth 302-Location regression).

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'bunx vite --port 5173 --host 127.0.0.1 --strictPort',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
