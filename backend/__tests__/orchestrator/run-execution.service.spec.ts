import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

    const orchestrator = {
      run: jest.fn().mockResolvedValue({
        report: {
          id: 'report-1',
          runId: 'run-1',
          taskId: baseTask.id,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          summary: 'Dashboard rendered successfully.',
          status: 'passed',
          findings: [],
          kpiTable: [],
          links: {
            traceUrl: null,
            screenshotsGalleryUrl: null,
            rawTranscriptUrl: null,
          },
          costs: {
            tokensInput: 10,
            tokensOutput: 5,
            toolCalls: 2,
            durationMs: 500,
          },
        },
        eventsPath: path.join(baseDir, 'computer-use-events.json'),
        responsesPath: path.join(baseDir, 'model-responses.jsonl'),
        usageTotals: {
          tokensInput: 10,
          tokensOutput: 5,
          reasoningTokens: 0,
        },
        totalToolCalls: 2,
      }),
    };

    const service = new RunExecutionService(providerRegistry as any, workerGateway as any, orchestrator as any);

    const result = await service.execute('run-1', baseTask, 'openai');

    expect(workerGateway.startRun).toHaveBeenCalledWith('run-1', '/dashboard');
    expect(workerGateway.captureScreenshot).toHaveBeenCalled();
    expect(workerGateway.stopRun).toHaveBeenCalled();
    expect(orchestrator.run).toHaveBeenCalled();
    expect(result.report.status).toBe('passed');
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
      eventsPath: path.join(baseDir, 'computer-use-events.json'),
      responsesPath: path.join(baseDir, 'model-responses.jsonl'),
    });

    await fs.rm(baseDir, { recursive: true, force: true });
  });
});
