import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3101',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-375', use: { browserName: 'chromium', viewport: { width: 375, height: 812 } } },
    { name: 'mobile-430', use: { browserName: 'chromium', viewport: { width: 430, height: 932 } } },
    { name: 'desktop-1366', use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } } },
    { name: 'desktop-1920', use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    command: 'pnpm --filter liff-web exec next dev --port 3101',
    url: 'http://localhost:3101',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: 'http://api.test/v1',
      NEXT_PUBLIC_LIFF_ID: '',
      NEXT_PUBLIC_E2E_AUTH_BYPASS: 'true',
    },
  },
})
