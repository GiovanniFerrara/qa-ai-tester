import { OrchestratorService } from 'src/orchestrator/orchestrator.service';
import type { StoredRunRecord } from 'src/models/run';
import type { QaReport } from 'src/models/contracts';

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
  kpiTable: [
    {
      label: 'Revenue',
      expected: '100',
      observed: '50',
      status: 'mismatch',
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

describe('OrchestratorService dismissals', () => {
  const configService = {} as never;
  const taskRegistry = {} as never;
  const runExecutionService = {} as never;
  let runStorage: { loadRuns: jest.Mock; saveRuns: jest.Mock };
  let service: OrchestratorService;

  beforeEach(() => {
    runStorage = {
      loadRuns: jest.fn().mockReturnValue([createRunRecord()]),
      saveRuns: jest.fn(),
    };
    service = new OrchestratorService(
      configService,
      taskRegistry,
      runExecutionService,
      runStorage as never,
    );
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

  it('dismisses KPI alerts and removes them from summary lists', () => {
    const summaryBefore = service.getRunSummary();
    expect(summaryBefore.kpiAlerts).toHaveLength(1);

    const dismissed = service.dismissKpi('run-1', 'Revenue', 'fixed');
    expect(dismissed.report?.kpiTable[0].dismissal).toMatchObject({
      reason: 'fixed',
    });

    const summaryAfterDismiss = service.getRunSummary();
    expect(summaryAfterDismiss.kpiAlerts).toHaveLength(0);

    service.restoreKpi('run-1', 'Revenue');
    const summaryAfterRestore = service.getRunSummary();
    expect(summaryAfterRestore.kpiAlerts).toHaveLength(1);
  });
});
