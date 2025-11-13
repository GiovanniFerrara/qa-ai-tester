import { defineConfig, devices } from '@playwright/test';

const storageState = process.env.STORAGE_STATE_PATH ?? 'playwright/.auth/analyst.json';
const baseURL = process.env.BASE_URL ?? 'https://example.com';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    storageState,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1366, height: 768 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
