import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { test as setup } from '@playwright/test';

setup('create authenticated storage state', async ({ page }) => {
  const storagePath = process.env.STORAGE_STATE_PATH ?? 'playwright/.auth/analyst.json';
  console.log(`Using storage state path: ${storagePath}`);

  let baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
  try {
    const overridePath = path.resolve(process.cwd(), 'data', 'last-base-url.txt');
    if (existsSync(overridePath)) {
      const candidate = readFileSync(overridePath, 'utf8').trim();
      if (candidate) {
        baseUrl = candidate;
        console.log(`Using overridden base URL from ${overridePath}: ${baseUrl}`);
      }
    }
  } catch (error) {
    console.warn(`Unable to read base URL override: ${(error as Error).message}`);
  }
  const loginUrl = new URL('/login', baseUrl).toString();
  await page.goto(loginUrl);
  console.log('Login page loaded');

  await page.fill('#username', 'demo@jurny.com');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/login/challenge');
  console.log('MFA challenge reached');

  await page.fill('#password', 'demo@jurny.com');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('Dashboard visible; storing state…');

  await page.context().storageState({ path: storagePath });
  console.log(`Storage state saved to ${storagePath}`);
});
