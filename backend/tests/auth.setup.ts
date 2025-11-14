import { test as setup } from '@playwright/test';

setup('create authenticated storage state', async ({ page }) => {
await page.goto('http://localhost:3000/login');
await page.fill('#username', 'demo@jurny.com');
await page.click('button[type="submit"]');
await page.waitForURL('**/login/challenge');
await page.fill('#password', 'demo@jurny.com');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard');
});
