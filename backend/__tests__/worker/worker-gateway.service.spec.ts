import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { ConfigService } from '@nestjs/config';

import type { AppEnvironment } from 'src/config/environment';
import { WorkerGatewayService, type BrowserRunHandle } from 'src/worker/worker-gateway.service';

const createConfigService = (
  overrides: Partial<Record<keyof AppEnvironment, unknown>> = {},
): ConfigService<AppEnvironment, true> =>
  ({
    get: jest.fn((key: keyof AppEnvironment) => {
      const defaults: Record<keyof AppEnvironment, unknown> = {
        NODE_ENV: 'test',
        OPENAI_API_KEY: 'openai',
        CLAUDE_API_KEY: 'claude',
      BASE_URL: 'https://example.com',
      KPI_BASE_URL: 'https://api.example',
      STORAGE_STATE_PATH: 'playwright/.auth/analyst.json',
        ARTIFACT_DIR: path.join(os.tmpdir(), 'qa-artifacts'),
        DEFAULT_PROVIDER: 'openai',
        OPENAI_MODEL: 'o4-mini',
        CLAUDE_MODEL: 'claude-3-7',
        KPI_ENDPOINT: '/api/kpi',
        KPI_TOLERANCE_PERCENT: '1',
      };
      return (overrides[key] ?? defaults[key]) as never;
    }),
  } as unknown as ConfigService<AppEnvironment, true>);

describe('WorkerGatewayService', () => {
  let service: WorkerGatewayService;
  beforeEach(() => {
    service = new WorkerGatewayService(createConfigService());
  });

  const createHandle = async (): Promise<BrowserRunHandle> => {
    const artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), 'worker-handle-'));
    const screenshotDir = path.join(artifactDir, 'screens');
    await fs.mkdir(screenshotDir, { recursive: true });
    return {
      artifactDir,
      browser: {} as never,
      context: {} as never,
      page: {} as never,
      screenshotDir,
      screenshots: [],
    };
  };

  it('builds DOM snapshot for matching elements', async () => {
    const handle = await createHandle();
    const elementMock = {
      count: jest.fn().mockResolvedValue(1),
      boundingBox: jest.fn().mockResolvedValue({ x: 10, y: 20, width: 100, height: 40 }),
      getAttribute: jest.fn().mockImplementation(async (attr: string) => (attr === 'data-testid' ? 'kpi-card' : null)),
      innerText: jest.fn().mockResolvedValue('Revenue'),
      toString: () => 'locator("#kpi")',
    };
    const locatorMock = {
      first: jest.fn(() => elementMock),
      count: jest.fn().mockResolvedValue(1),
      nth: jest.fn(() => elementMock),
    };
    const pageMock = {
      locator: jest.fn(() => locatorMock),
    };
    handle.page = pageMock as never;

    const snapshot = await service.getDomSnapshot(handle, {
      selector: '#kpi',
      mode: 'single',
      attributes: ['data-testid'],
    });

    expect(snapshot.elements).toHaveLength(1);
    expect(snapshot.elements[0]).toMatchObject({
      selector: 'locator("#kpi")',
      innerText: 'Revenue',
      attributes: { 'data-testid': 'kpi-card' },
      boundingBox: { x: 10, y: 20, width: 100, height: 40 },
    });
    await fs.rm(handle.artifactDir, { recursive: true, force: true });
  });

  it('executes computer action and stores screenshot', async () => {
    const handle = await createHandle();
    const screenshotBuffer = Buffer.from('fake-screenshot');
    const pageMock = {
      mouse: {
        move: jest.fn(),
        click: jest.fn(),
        dblclick: jest.fn(),
      },
      keyboard: {
        type: jest.fn(),
        press: jest.fn(),
      },
      waitForLoadState: jest.fn(),
      waitForTimeout: jest.fn(),
      waitForSelector: jest.fn(),
      viewportSize: jest.fn(() => ({ width: 1366, height: 768 })),
      screenshot: jest.fn(async ({ path: screenshotPath }: { path: string }) => {
        await fs.writeFile(screenshotPath, screenshotBuffer);
        return screenshotBuffer;
      }),
      locator: jest.fn(),
    };
    handle.page = pageMock as never;

    const result = await service.performComputerAction(handle, {
      action: 'click',
      coords: { x: 100, y: 200 },
    });

    expect(pageMock.mouse.click).toHaveBeenCalledWith(100, 200);
    expect(result.viewport).toEqual({ width: 1366, height: 768 });
    expect(result.screenshot).toBe(screenshotBuffer.toString('base64'));
    expect(handle.screenshots.length).toBe(1);
    await fs.rm(handle.artifactDir, { recursive: true, force: true });
  });
});
