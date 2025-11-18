import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { AiProvider } from 'src/models/run';
import { RunExecutionService } from 'src/orchestrator/run-execution.service';

describe('RunExecutionService', () => {
  const baseTask = {
    id: 'dashboard-sanity',
    name: 'Dashboard Sanity',
    description: 'Ensure the analyst dashboard renders correctly.',
    goal: 'Verify dashboard',
    instructions: 'Load the dashboard and confirm main widgets render.',
    route: '/dashboard',
    role: 'analyst',
    provider: 'openai',
    model: 'computer-use-preview',
    requireFindings: true,
    autoAuthEnabled: true,
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

    try {
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
      const authStateService = {
        createStorageState: jest.fn().mockResolvedValue('/tmp/run-1.json'),
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
            totalTokens: 15,
          },
          totalToolCalls: 2,
        }),
      };

      const runEvents = {
        emit: jest.fn(),
        complete: jest.fn(),
      };

      const service = new RunExecutionService(
        providerRegistry as any,
        workerGateway as any,
        authStateService as any,
        orchestrator as any,
        runEvents as any,
      );

      const result = await service.execute('run-1', baseTask, 'openai', undefined);

      expect(authStateService.createStorageState).toHaveBeenCalledWith('run-1', undefined);
      expect(workerGateway.startRun).toHaveBeenCalledWith(
        'run-1',
        '/dashboard',
        undefined,
        '/tmp/run-1.json',
      );
      expect(workerGateway.captureScreenshot).toHaveBeenCalledWith(mockHandle, 'initial');
      expect(workerGateway.stopRun).toHaveBeenCalled();
      expect(orchestrator.run).toHaveBeenCalled();
      expect(result.report.status).toBe('passed');
      expect(result.report.findings).toHaveLength(1);
      expect(result.report.findings[0].observed).toContain('No explicit findings');
      expect(result.artifacts.reportPath).toBeDefined();
      expect(result.artifacts.metadataPath).toBeDefined();
      expect(result.artifacts.logsPath).toBeDefined();

      const reportExists = await fs.stat(result.artifacts.reportPath!);
      expect(reportExists.isFile()).toBe(true);

      const metadata = JSON.parse(
        await fs.readFile(result.artifacts.metadataPath!, 'utf8'),
      ) as Record<string, any>;
      expect(metadata).toMatchObject({
        runId: 'run-1',
        taskId: 'dashboard-sanity',
        provider: 'openai',
        eventsPath: path.join(baseDir, 'computer-use-events.json'),
        responsesPath: path.join(baseDir, 'model-responses.jsonl'),
        baseUrlOverride: null,
        summary: {
          findings: 1,
          severityCounts: { info: 1 },
        },
      });

      expect(runEvents.complete).toHaveBeenCalledWith('run-1');
    } finally {
      await fs.rm(baseDir, { recursive: true, force: true });
    }
  });

  it('skips auth bootstrap and builds fallback artifacts when task disables it', async () => {
    const { baseDir, screenshotDir } = await createTmpDirs();

    try {
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
      const authStateService = {
        createStorageState: jest.fn(),
      };

      const orchestrator = {
        run: jest.fn().mockRejectedValue(new Error('not important')),
      };

      const runEvents = {
        emit: jest.fn(),
        complete: jest.fn(),
      };

      const service = new RunExecutionService(
        providerRegistry as any,
        workerGateway as any,
        authStateService as any,
        orchestrator as any,
        runEvents as any,
      );

      const taskWithoutAuth = { ...baseTask, autoAuthEnabled: false };

      const result = await service.execute('run-2', taskWithoutAuth as any, 'openai', undefined);

      expect(authStateService.createStorageState).not.toHaveBeenCalled();
      expect(workerGateway.startRun).toHaveBeenCalledWith(
        'run-2',
        '/dashboard',
        undefined,
        undefined,
      );
      expect(result.report.status).toBe('inconclusive');
      expect(result.report.summary).toContain('not important');
      expect(result.report.findings).toHaveLength(1);
      expect(result.artifacts.reportPath).toBeDefined();
      expect(result.artifacts.metadataPath).toBeDefined();
      await expect(fs.stat(result.artifacts.reportPath!)).resolves.toBeTruthy();

      const fallbackMetadata = JSON.parse(
        await fs.readFile(result.artifacts.metadataPath!, 'utf8'),
      ) as Record<string, any>;
      expect(fallbackMetadata).toMatchObject({
        runId: 'run-2',
        taskId: 'dashboard-sanity',
        baseUrlOverride: null,
        summary: {
          findings: 1,
          severityCounts: { info: 1 },
        },
      });

      expect(runEvents.complete).toHaveBeenCalledWith('run-2');
    } finally {
      await fs.rm(baseDir, { recursive: true, force: true });
    }
  });

  it('overrides report status to failed when blocking findings exist', async () => {
    const { baseDir, screenshotDir } = await createTmpDirs();

    try {
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
      const authStateService = {
        createStorageState: jest.fn().mockResolvedValue('/tmp/run-3.json'),
      };

      const orchestrator = {
        run: jest.fn().mockResolvedValue({
          report: {
            id: 'report-3',
            runId: 'run-3',
            taskId: baseTask.id,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            summary: 'Detected blocking issue.',
            status: 'passed',
            findings: [
              {
                id: 'finding-1',
                severity: 'critical',
                category: 'functional',
                assertion: 'Blocking regression',
                expected: 'Feature works',
                observed: 'Feature broken',
                tolerance: null,
                evidence: [],
                suggestedFix: 'Fix it',
                confidence: 0.9,
              },
            ],
            kpiTable: [],
            links: {
              traceUrl: null,
              screenshotsGalleryUrl: null,
              rawTranscriptUrl: null,
            },
            costs: {
              tokensInput: 1,
              tokensOutput: 1,
              toolCalls: 1,
              durationMs: 100,
            },
          },
          eventsPath: path.join(baseDir, 'computer-use-events.json'),
          responsesPath: path.join(baseDir, 'model-responses.jsonl'),
          usageTotals: {
            tokensInput: 1,
            tokensOutput: 1,
            totalTokens: 2,
          },
          totalToolCalls: 1,
        }),
      };

      const runEvents = {
        emit: jest.fn(),
        complete: jest.fn(),
      };

      const service = new RunExecutionService(
        providerRegistry as any,
        workerGateway as any,
        authStateService as any,
        orchestrator as any,
        runEvents as any,
      );

      const result = await service.execute('run-3', baseTask as any, 'openai', undefined);

      expect(result.report.status).toBe('failed');
      expect(result.report.findings).toHaveLength(1);
    } finally {
      await fs.rm(baseDir, { recursive: true, force: true });
    }
  });
});
