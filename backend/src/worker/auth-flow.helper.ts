import type { Page } from 'playwright';

export interface LoginCredentials {
  username: string;
  password: string;
}

export type LoginLogger = (message: string) => void;

const noopLog: LoginLogger = () => {};

export const performAnalystLogin = async (
  page: Page,
  baseUrl: string,
  credentials: LoginCredentials,
  log: LoginLogger = noopLog,
): Promise<void> => {
  const loginUrl = new URL('/login', baseUrl).toString();
  log(`Navigating to ${loginUrl}`);
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  log('Login page loaded');

  await page.fill('#username', credentials.username);
  await page.click('button[type="submit"]');
  log('Username submitted, waiting for MFA challenge');

  await page.waitForURL('**/login/challenge', { timeout: 15_000 });
  log('MFA challenge reached');
  await page.fill('#password', credentials.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  log('Dashboard visible after login');
};
