import { OrchestratorService } from 'src/orchestrator/orchestrator.service';
import type { StoredRunRecord, RunResult } from 'src/models/run';
import type { QaReport, TaskSpec } from 'src/models/contracts';
import { RunCancelledError } from 'src/orchestrator/run-errors';

const createTask = (taskId: string): TaskSpec => ({
  id: taskId,
  name: `Task ${taskId}`,
  description: '',
  goal: 'goal',
  instructions: '',
  route: '/',
  role: 'analyst',
  provider: 'openai',
  model: 'computer-use-preview',
  requireFindings: true,
  autoAuthEnabled: false,
  budgets: {
    maxToolCalls: 10,
    maxTimeMs: 1_000,
    maxScreenshots: 5,
  },
});

const baseReport: QaReport = {
  id: 'report-1',
  runId: 'run-1',
  taskId: 'task-1',
  startedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  finishedAt: new Date('2024-01-01T00:05:00Z').toISOString(),
  summary: 'Test report',
  status: 'failed',
  findings: [
    {
      id: 'finding-1',
      severity: 'critical',
      category: 'functional',
      assertion: 'Login should succeed',
      expected: 'User logs in',
      observed: 'Error toast',
      tolerance: null,
      evidence: [],
      suggestedFix: 'Fix login form',
      confidence: 0.8,
    },
  ],
  links: {
    traceUrl: null,
    screenshotsGalleryUrl: null,
    rawTranscriptUrl: null,
  },
  costs: {
    tokensInput: 0,
    tokensOutput: 0,
    toolCalls: 0,
    durationMs: 300000,
    priceUsd: 0,
  },
};

const createRunRecord = (): StoredRunRecord => ({
  runId: 'run-1',
  taskId: 'task-1',
  provider: 'openai',
  status: 'completed',
  startedAt: baseReport.startedAt,
  finishedAt: baseReport.finishedAt,
  report: JSON.parse(JSON.stringify(baseReport)),
});

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const waitForCallCount = async (mockFn: jest.Mock, expected: number) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (mockFn.mock.calls.length >= expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`Expected mock to be called ${expected} times`);
};

describe('OrchestratorService dismissals and collections', () => {
  let configService: { get: jest.Mock };
  let taskRegistry: { get: jest.Mock };
  let taskCollections: { get: jest.Mock; list: jest.Mock };
  let runExecutionService: { execute: jest.Mock };
  let runStorage: { loadRuns: jest.Mock; saveRuns: jest.Mock };
  let collectionRunStorage: { loadRuns: jest.Mock; saveRuns: jest.Mock };
  let service: OrchestratorService;

  const buildService = (storedRuns: StoredRunRecord[] = [createRunRecord()]) => {
    configService = {
      get: jest.fn().mockReturnValue('openai'),
    };
    taskRegistry = {
      get: jest.fn((taskId: string) => createTask(taskId)),
    };
    taskCollections = {
      get: jest.fn(),
      list: jest.fn(),
    };
    runExecutionService = {
      execute: jest.fn(),
    };
    runStorage = {
      loadRuns: jest.fn().mockReturnValue(storedRuns),
      saveRuns: jest.fn(),
    };
    collectionRunStorage = {
      loadRuns: jest.fn().mockReturnValue([
        {
          id: 'collection-run-existing',
          collectionId: 'collection-1',
          executionMode: 'parallel',
          status: 'completed',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          baseUrl: 'https://existing.example.com',
          items: [],
        },
      ]),
      saveRuns: jest.fn(),
    };
    service = new OrchestratorService(
      configService as never,
      taskRegistry as never,
      taskCollections as never,
      runExecutionService as never,
      runStorage as never,
      collectionRunStorage as never,
    );
  };

  beforeEach(() => {
    buildService();
  });

  it('dismisses and restores findings while updating summaries', () => {
    const summaryBefore = service.getRunSummary();
    expect(summaryBefore.totals.findings).toBe(1);

    const dismissed = service.dismissFinding('run-1', 'finding-1', 'false_positive');
    expect(dismissed.report?.findings[0].dismissal).toMatchObject({
      reason: 'false_positive',
    });
    expect(runStorage.saveRuns).toHaveBeenCalled();

    const summaryAfterDismiss = service.getRunSummary();
    expect(summaryAfterDismiss.totals.findings).toBe(0);

    service.restoreFinding('run-1', 'finding-1');
    const restored = service.getRun('run-1');
    expect(restored.report?.findings[0].dismissal).toBeUndefined();

    const summaryAfterRestore = service.getRunSummary();
    expect(summaryAfterRestore.totals.findings).toBe(1);
  });

  it('runs task collections sequentially', async () => {
    buildService([]);

    const now = new Date().toISOString();
    const suiteBaseUrl = 'https://env.example.com';
    taskCollections.get.mockReturnValue({
      id: 'collection-1',
      name: 'Smoke Suite',
      description: '',
      taskIds: ['task-1', 'task-2'],
      executionMode: 'sequential',
      baseUrl: suiteBaseUrl,
      createdAt: now,
      updatedAt: now,
    });

    const runResults = new Map<
      string,
      { resolve: (value: RunResult) => void; reject: (reason?: unknown) => void }
    >();
    runExecutionService.execute.mockImplementation((runId: string) => {
      const deferred = createDeferred<RunResult>();
      runResults.set(runId, { resolve: deferred.resolve, reject: deferred.reject });
      return deferred.promise;
    });

    const collectionRunPromise = service.startCollectionRun('collection-1');
    await waitForCallCount(runExecutionService.execute, 1);
    expect(runExecutionService.execute.mock.calls[0][3]).toBe(suiteBaseUrl);
    const [firstRunId] = Array.from(runResults.keys());
    const firstResult: RunResult = {
      report: {
        ...JSON.parse(JSON.stringify(baseReport)),
        id: `report-${firstRunId}`,
        runId: firstRunId,
        taskId: 'task-1',
        findings: [],
        status: 'passed',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      },
      artifacts: { screenshots: [] },
    };
    runResults.get(firstRunId)!.resolve(firstResult);
    await waitForCallCount(runExecutionService.execute, 2);
    const secondRunId = Array.from(runResults.keys()).find((id) => id !== firstRunId)!;
    expect(runExecutionService.execute.mock.calls[1][3]).toBe(suiteBaseUrl);
    runResults.get(secondRunId)!.reject(new Error('boom'));

    const collectionRun = await collectionRunPromise;
    expect(collectionRun.items).toHaveLength(2);
    expect(collectionRun.status).toBe('completed');
    expect(collectionRun.baseUrl).toBe(suiteBaseUrl);
    expect(collectionRun.items.map((item) => item.status)).toEqual(['completed', 'failed']);
  });

  it('scopes collection runs by collection id', () => {
    const run = service.getCollectionRun('collection-run-existing');
    expect(run.collectionId).toBe('collection-1');
    expect(run.baseUrl).toBe('https://existing.example.com');
    expect(() => service.getCollectionRunForCollection('other', 'collection-run-existing')).toThrow(
      /not found/,
    );
  });

  it('cancels an in-flight run', async () => {
    buildService([]);
    const deferred = createDeferred<RunResult>();
    runExecutionService.execute.mockReturnValue(deferred.promise);

    const pending = await service.startRun('task-1');
    const cancelPromise = service.cancelRun(pending.runId);

    const abortSignal = runExecutionService.execute.mock.calls[0][4];
    expect(abortSignal?.aborted).toBe(true);

    deferred.reject(new RunCancelledError());
    await cancelPromise;

    const stored = service.getRun(pending.runId);
    expect(stored.status).toBe('cancelled');
  });
});
