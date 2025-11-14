import { test as setup } from '@playwright/test';

setup('create authenticated storage state', async ({ page }) => {
  const storagePath = process.env.STORAGE_STATE_PATH ?? 'playwright/.auth/analyst.json';
  console.log(`Using storage state path: ${storagePath}`);

  await page.goto('http://localhost:3000/login');
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
