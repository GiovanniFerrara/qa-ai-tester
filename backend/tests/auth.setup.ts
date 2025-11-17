import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { test as setup } from '@playwright/test';

import { performAnalystLogin } from '../src/worker/auth-flow.helper';

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
  const username = process.env.LOGIN_USERNAME ?? 'example@test.com';
  const password = process.env.LOGIN_PASSWORD ?? 'example@test.com';

  await performAnalystLogin(page, baseUrl, { username, password }, (message) =>
    console.log(message),
  );
  console.log('Dashboard visible; storing state…');

  await page.context().storageState({ path: storagePath });
  console.log(`Storage state saved to ${storagePath}`);
});
