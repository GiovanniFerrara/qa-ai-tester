import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { ConfigService } from '@nestjs/config';

import type { AppEnvironment } from 'src/config/environment';
import type { AiProvider } from 'src/models/run';
import { RunExecutionService } from 'src/orchestrator/run-execution.service';

describe('RunExecutionService', () => {
  const baseTask = {
    id: 'dashboard-sanity',
    goal: 'Verify dashboard',
    route: '/dashboard',
    role: 'analyst',
    kpiSpec: { type: 'staticValues', values: { revenue: 1000 } } as const,
    budgets: {
      maxToolCalls: 200,
      maxTimeMs: 120_000,
      maxScreenshots: 25,
    },
  };

  const createConfigService = (): ConfigService<AppEnvironment, true> =>
    ({
      get: jest.fn(),
    } as unknown as ConfigService<AppEnvironment, true>);

  const createTmpDirs = async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-run-'));
    const screenshotDir = path.join(baseDir, 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    return { baseDir, screenshotDir };
  };

  it('produces placeholder report and artifacts', async () => {
    const { baseDir, screenshotDir } = await createTmpDirs();

    const mockHandle = {
      artifactDir: baseDir,
      screenshotDir,
      screenshots: [] as string[],
    };

    const workerGateway = {
      startRun: jest.fn().mockResolvedValue(mockHandle),
      captureScreenshot: jest.fn().mockImplementation(async (handle: typeof mockHandle) => {
        const screenshotPath = path.join(handle.screenshotDir, 'initial.png');
        await fs.writeFile(screenshotPath, 'fake-screenshot');
        handle.screenshots.push(screenshotPath);
        return screenshotPath;
      }),
      stopRun: jest.fn().mockResolvedValue(undefined),
    };

    const providerRegistry = {
      resolve: jest.fn().mockReturnValue({ provider: 'openai' satisfies AiProvider }),
    };

    const kpiOracleService = {
      resolve: jest.fn().mockResolvedValue({ data: { revenue: 1000, orders: 12 } }),
    };

    const service = new RunExecutionService(
      createConfigService(),
      providerRegistry as any,
      workerGateway as any,
      kpiOracleService as any,
    );

    const result = await service.execute('run-1', baseTask, 'openai');

    expect(workerGateway.startRun).toHaveBeenCalledWith('run-1', '/dashboard');
    expect(workerGateway.captureScreenshot).toHaveBeenCalled();
    expect(workerGateway.stopRun).toHaveBeenCalled();
    expect(result.report.status).toBe('inconclusive');
    expect(result.report.kpiTable).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'revenue', expected: '1000', status: 'missing' }),
      ]),
    );
    expect(result.artifacts.reportPath).toBeDefined();
    expect(result.artifacts.metadataPath).toBeDefined();
    expect(result.artifacts.logsPath).toBeDefined();

    const reportExists = await fs.stat(result.artifacts.reportPath!);
    expect(reportExists.isFile()).toBe(true);

    const metadata = JSON.parse(
      await fs.readFile(result.artifacts.metadataPath!, 'utf8'),
    ) as Record<string, unknown>;
    expect(metadata).toMatchObject({
      runId: 'run-1',
      taskId: 'dashboard-sanity',
      provider: 'openai',
    });

    await fs.rm(baseDir, { recursive: true, force: true });
  });
});
