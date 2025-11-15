import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
  type Locator,
} from 'playwright';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type {
  ComputerAction,
  ComputerActionResult,
  DomSnapshotRequest,
  DomSnapshotResponse,
} from '../models/contracts';

export interface BrowserRunHandle {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  artifactDir: string;
  screenshotDir: string;
  screenshots: string[];
}

@Injectable()
export class WorkerGatewayService {
  private readonly logger = new Logger(WorkerGatewayService.name);
  private readonly artifactRoot: string;
  private readonly storageStatePath: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    this.artifactRoot = path.resolve(
      this.configService.get('ARTIFACT_DIR', { infer: true }) ?? 'artifacts',
    );
    this.storageStatePath = this.configService.get('STORAGE_STATE_PATH', {
      infer: true,
    });
    this.baseUrl = this.configService.get('BASE_URL', { infer: true });
  }

  async startRun(
    runId: string,
    route: string,
    baseUrlOverride?: string,
    storageStatePathOverride?: string,
  ): Promise<BrowserRunHandle> {
    const browser = await chromium.launch({
      headless: true,
    });

    const artifactDir = path.join(this.artifactRoot, runId);
    const screenshotDir = path.join(artifactDir, 'screenshots');
    await mkdir(screenshotDir, { recursive: true });

    const storageState = await this.resolveStorageStatePath(storageStatePathOverride);
    const contextOptions: BrowserContextOptions = {
      viewport: { width: 1366, height: 768 },
    };

    if (storageState) {
      contextOptions.storageState = storageState;
    }

    const context = await browser.newContext(contextOptions);

    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    const page = await context.newPage();
    const base = baseUrlOverride ?? this.baseUrl;
    const targetUrl = new URL(route, base).toString();
    this.logger.debug(`Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    return {
      browser,
      context,
      page,
      artifactDir,
      screenshotDir,
      screenshots: [],
    };
  }

  async stopRun(handle: BrowserRunHandle): Promise<void> {
    const tracePath = path.join(handle.artifactDir, 'trace.zip');
    await handle.context.tracing.stop({ path: tracePath });
    await handle.context.close();
    await handle.browser.close();
  }

  async performComputerAction(
    handle: BrowserRunHandle,
    action: ComputerAction,
  ): Promise<ComputerActionResult> {
    const { page } = handle;

    if (action.selector) {
      const locator = this.createLocator(page, action.selector);
      if (locator && (await locator.count())) {
        const box = await locator.first().boundingBox();
        if (box) {
          action.coords = {
            x: Math.round(box.x + box.width / 2),
            y: Math.round(box.y + box.height / 2),
          };
        }
      }
    }

    await this.dispatchAction(page, action);
    await this.applyWait(page, action);

    const screenshotPath = path.join(
      handle.screenshotDir,
      `${Date.now()}-${action.action}.png`,
    );

    let screenshotBase64: string;
    try {
      const screenshotBuffer = await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });
      handle.screenshots.push(screenshotPath);
      screenshotBase64 = screenshotBuffer.toString('base64');
    } catch (error) {
      const fallback = this.getFallbackScreenshotBase64();
      await writeFile(screenshotPath, Buffer.from(fallback, 'base64'));
      handle.screenshots.push(screenshotPath);
      this.logger.warn(
        `Failed to capture screenshot (${action.action}): ${(error as Error).message}. Using fallback image.`,
      );
      screenshotBase64 = fallback;
    }

    const viewport = page.viewportSize() ?? { width: 0, height: 0 };

    return {
      screenshot: screenshotBase64,
      viewport,
      consoleEvents: [],
      networkEvents: [],
    };
  }

  async getDomSnapshot(
    handle: BrowserRunHandle,
    request: DomSnapshotRequest,
  ): Promise<DomSnapshotResponse> {
    const locator = this.createLocator(handle.page, request.selector);
    if (!locator) {
      this.logger.warn(
        `DOM snapshot skipped: invalid selector "${request.selector}"`,
      );
      return { elements: [] };
    }
    const elements: DomSnapshotResponse['elements'] = [];

    if (request.mode === 'single') {
      const element = locator.first();
      if (await element.count()) {
        elements.push(await this.serializeElement(element, request.attributes));
      }
    } else {
      const count = await locator.count();
      for (let index = 0; index < count; index += 1) {
        const element = locator.nth(index);
        elements.push(await this.serializeElement(element, request.attributes));
      }
    }

    return { elements };
  }

  private async resolveStorageStatePath(
    storageStatePathOverride?: string,
  ): Promise<string | undefined> {
    const candidate = storageStatePathOverride ?? this.storageStatePath;
    if (!candidate) {
      return undefined;
    }

    const resolvedPath = path.resolve(candidate);

    try {
      await access(resolvedPath);
      return resolvedPath;
    } catch {
      this.logger.warn(
        [
          `Storage state file not found at ${resolvedPath}.`,
          'Continuing without persisted authentication.',
          'Run "npm run playwright:test" inside backend/ to capture an auth session or update STORAGE_STATE_PATH.',
        ].join(' '),
      );
      return undefined;
    }
  }

  private normalizeSelector(selector: string): string {
    if (!selector.includes(':contains(')) {
      return selector;
    }
    return selector.replace(/:contains\((["'`]?)(.*?)\1\)/g, (_match, quote, text) => {
      const safeText = text.replace(/"/g, '\\"');
      return `:has-text("${safeText}")`;
    });
  }

  private createLocator(page: Page, selector: string): Locator | null {
    try {
      const normalizedSelector = this.normalizeSelector(selector);
      return page.locator(normalizedSelector);
    } catch (error) {
      this.logger.warn(
        `Failed to create locator for selector "${selector}": ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async serializeElement(
    locator: import('playwright').Locator,
    attributes: string[],
  ): Promise<DomSnapshotResponse['elements'][number]> {
    const boundingBox = await locator.boundingBox();
    const attrEntries = await Promise.all(
      attributes.map(async (attribute) => [attribute, await locator.getAttribute(attribute)]),
    );

    return {
      selector: locator.toString(),
      innerText: (await locator.innerText({ timeout: 1000 }).catch(() => '')) ?? '',
      attributes: Object.fromEntries(attrEntries),
      boundingBox: boundingBox
        ? {
            x: Math.round(boundingBox.x),
            y: Math.round(boundingBox.y),
            width: Math.round(boundingBox.width),
            height: Math.round(boundingBox.height),
          }
        : null,
    };
  }

  async captureScreenshot(handle: BrowserRunHandle, label: string): Promise<string> {
    const screenshotPath = path.join(handle.screenshotDir, `${Date.now()}-${label}.png`);
    await mkdir(handle.screenshotDir, { recursive: true });
    await handle.page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    handle.screenshots.push(screenshotPath);
    return screenshotPath;
  }

  private async dispatchAction(page: Page, action: ComputerAction): Promise<void> {
    const coords = action.coords ?? { x: 0, y: 0 };

    switch (action.action) {
      case 'move':
        await page.mouse.move(coords.x, coords.y);
        break;
      case 'click':
        await page.mouse.click(coords.x, coords.y);
        break;
      case 'double_click':
        await page.mouse.dblclick(coords.x, coords.y);
        break;
      case 'right_click':
        await page.mouse.click(coords.x, coords.y, { button: 'right' });
        break;
      case 'type':
        if (action.text) {
          await page.keyboard.type(action.text);
        }
        break;
      case 'hotkey':
        if (action.hotkey) {
          await page.keyboard.press(action.hotkey);
        }
        break;
      case 'keypress':
        if (action.keys?.length) {
          for (const key of action.keys) {
            const normalizedKey = this.normalizeKey(key);
            try {
              await page.keyboard.press(normalizedKey);
            } catch (error) {
              this.logger.warn(
                `Failed to press key "${key}" (normalized: "${normalizedKey}") - ${(error as Error).message}`,
              );
            }
          }
        }
        break;
      case 'scroll':
        if (action.scroll) {
          await page.mouse.wheel(action.scroll.deltaX ?? 0, action.scroll.deltaY ?? 0);
        }
        break;
      case 'hover':
        await page.mouse.move(coords.x, coords.y);
        break;
      case 'drag':
        if (action.path && action.path.length >= 2) {
          const [first, ...rest] = action.path;
          await page.mouse.move(first.x, first.y);
          await page.mouse.down();
          for (const point of rest) {
            await page.mouse.move(point.x, point.y);
          }
          await page.mouse.up();
          break;
        }
        if (action.scroll) {
          await page.mouse.move(coords.x, coords.y);
          await page.mouse.down();
          await page.mouse.move(
            coords.x + (action.scroll.deltaX ?? 0),
            coords.y + (action.scroll.deltaY ?? 0),
          );
          await page.mouse.up();
        }
        break;
      case 'wait':
        // handled in applyWait to ensure consistent timing
        break;
      case 'screenshot':
        // no-op before screenshot capture
        break;
      default:
        this.logger.warn(`Action ${action.action} not implemented in worker adapter`);
    }
  }

  private normalizeKey(key: string): string {
    const trimmed = key.trim();
    const directMap: Record<string, string> = {
      ALT: 'Alt',
      CONTROL: 'Control',
      CTRL: 'Control',
      SHIFT: 'Shift',
      META: 'Meta',
      ENTER: 'Enter',
      RETURN: 'Enter',
      ESC: 'Escape',
      ESCAPE: 'Escape',
      SPACE: ' ',
      TAB: 'Tab',
      BACKSPACE: 'Backspace',
      DEL: 'Delete',
      DELETE: 'Delete',
    };

    if (directMap[trimmed.toUpperCase()]) {
      return directMap[trimmed.toUpperCase()];
    }

    if (/^Key[A-Z]$/.test(trimmed)) {
      return trimmed.replace(/^Key/, '').toUpperCase();
    }

    if (/^Digit[0-9]$/.test(trimmed)) {
      return trimmed.replace(/^Digit/, '');
    }

    if (/^[Ff][0-9]{1,2}$/.test(trimmed)) {
      return `F${trimmed.replace(/[Ff]/, '')}`;
    }

    return trimmed;
  }

  private async applyWait(page: Page, action: ComputerAction): Promise<void> {
    if (!action.wait) {
      return;
    }

    switch (action.wait.type) {
      case 'ms':
        if (action.wait.value) {
          await page.waitForTimeout(action.wait.value);
        }
        break;
      case 'networkidle':
        await page.waitForLoadState('networkidle');
        break;
      case 'selectorVisible':
        if (action.wait.selector) {
          await page.waitForSelector(action.wait.selector, { state: 'visible' });
        }
        break;
      default:
        break;
    }
  }

  private getFallbackScreenshotBase64(): string {
    // Transparent 1x1 PNG
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
  }
}
