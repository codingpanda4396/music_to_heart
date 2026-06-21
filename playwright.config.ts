import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], channel: 'chromium' } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'pnpm --filter @qujing/server start',
    url: 'http://127.0.0.1:3000/healthz',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: '3000',
      APP_ORIGIN: 'http://127.0.0.1:3000',
      COOKIE_SECRET: 'e2e-cookie-secret-with-at-least-thirty-two-chars',
      STATIC_DIR: path.resolve('apps/web/dist'),
      APP_VERSION: 'e2e',
    },
  },
});
