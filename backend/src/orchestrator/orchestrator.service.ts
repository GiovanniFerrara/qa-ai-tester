import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import type { AppEnvironment } from '../config/environment';
import type { QaReport, DismissReason } from '../models/contracts';
import type { AiProvider, RunResult, StoredRunRecord } from '../models/run';
import type { CollectionRunRecord, ExecutionMode } from '../models/collections';
import { TaskRegistryService } from '../tasks/task-registry.service';
import { TaskCollectionsService } from '../tasks/task-collections.service';
import { RunExecutionService } from './run-execution.service';
import { RunStorageService } from './run-storage.service';
import { CollectionRunStorageService } from './collection-run-storage.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly runs = new Map<string, StoredRunRecord>();
  private readonly collectionRuns = new Map<string, CollectionRunRecord>();
  private readonly runCompletionPromises = new Map<string, Promise<void>>();
  private readonly lastBaseUrlPath: string;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly taskRegistry: TaskRegistryService,
    private readonly taskCollections: TaskCollectionsService,
    private readonly runExecutionService: RunExecutionService,
    private readonly runStorage: RunStorageService,
    private readonly collectionRunStorage: CollectionRunStorageService,
  ) {
    this.lastBaseUrlPath = path.resolve(process.cwd(), 'data', 'last-base-url.txt');
    const storedRuns = this.runStorage.loadRuns();
    storedRuns.forEach((run) => this.runs.set(run.runId, run));
    const storedCollectionRuns = this.collectionRunStorage.loadRuns();
    storedCollectionRuns.forEach((run) => this.collectionRuns.set(run.id, run));
  }

  async startRun(taskId: string, providerOverride?: AiProvider, baseUrlOverride?: string): Promise<StoredRunRecord> {
    const task = this.taskRegistry.get(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const runId = uuidv4();
    const provider =
      providerOverride ??
      (this.configService.get('DEFAULT_PROVIDER', { infer: true }) as AiProvider);

    this.logger.log(`Creating run ${runId} for task ${taskId} with provider ${provider}`);
    if (baseUrlOverride) {
      await this.persistLastBaseUrl(baseUrlOverride);
    }
    const startedAt = new Date();
    const pendingRecord: StoredRunRecord = {
      runId,
      provider,
      taskId: task.id,
      status: 'running',
      startedAt: startedAt.toISOString(),
      baseUrlOverride: baseUrlOverride ?? undefined,
    };
    this.runs.set(runId, pendingRecord);
    this.persistRuns();

    const executionPromise = this.runExecutionService
      .execute(runId, task, provider, baseUrlOverride)
      .then((result: RunResult) => {
        const finishedAt = new Date();
        const completedRecord: StoredRunRecord = {
          ...pendingRecord,
          status: 'completed',
          finishedAt: finishedAt.toISOString(),
          report: result.report,
          artifacts: result.artifacts,
          summary: this.buildRunSummarySnapshot(result.report),
        };
        this.runs.set(runId, completedRecord);
        this.persistRuns();
        return result;
      })
      .catch((error) => {
        const finishedAt = new Date();
        this.logger.error(
          `Run ${runId} failed during execution: ${(error as Error).message}`,
          (error as Error).stack,
        );
        const failedRecord: StoredRunRecord = {
          ...pendingRecord,
          status: 'failed',
          finishedAt: finishedAt.toISOString(),
          error: (error as Error).message,
        };
        this.runs.set(runId, failedRecord);
        this.persistRuns();
        throw error;
      })
      .finally(() => {
        this.runCompletionPromises.delete(runId);
      });
    this.runCompletionPromises.set(
      runId,
      executionPromise.then(() => undefined).catch(() => undefined),
    );

    void executionPromise;

    return pendingRecord;
  }

  getRun(runId: string): StoredRunRecord {
    const run = this.runs.get(runId);
    if (!run) {
      throw new NotFoundException(`Run ${runId} not found`);
    }
    return run;
  }

  listRuns(): StoredRunRecord[] {
    return [...this.runs.values()];
  }

  getRunSummary(): {
    totals: {
      total: number;
      completed: number;
      running: number;
      failed: number;
      passed: number;
      avgDurationMs: number;
      findings: number;
      totalCostUsd: number;
      monthCostUsd: number;
    };
    severity: Record<string, number>;
    urgentFindings: Array<{
      runId: string;
      assertion: string;
      severity: string;
      observed: string;
    }>;
    kpiAlerts: Array<{
      runId: string;
      label: string;
      expected: string;
      observed: string;
    }>;
    providerUsage: Record<string, number>;
  } {
    const runs = [...this.runs.values()];
    const totalCostUsd = runs.reduce(
      (acc, run) => acc + (run.report?.costs.priceUsd ?? 0),
      0,
    );

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthCostUsd = runs
      .filter((run) => {
        const runDate = new Date(run.startedAt);
        return runDate.getMonth() === currentMonth && runDate.getFullYear() === currentYear;
      })
      .reduce((acc, run) => acc + (run.report?.costs.priceUsd ?? 0), 0);

    const totals = {
      total: runs.length,
      completed: runs.filter((run) => run.status === 'completed').length,
      running: runs.filter((run) => run.status === 'running').length,
      failed: runs.filter((run) => run.status === 'failed').length,
      passed: runs.filter((run) => run.report?.status === 'passed').length,
      avgDurationMs: 0,
      findings: runs.reduce(
        (acc, run) => acc + this.getActiveFindings(run.report).length,
        0,
      ),
      totalCostUsd,
      monthCostUsd,
    };
    const durations = runs
      .map((run) => run.report?.costs.durationMs)
      .filter((value): value is number => typeof value === 'number');
    if (durations.length > 0) {
      totals.avgDurationMs = Math.round(
        durations.reduce((sum, val) => sum + val, 0) / durations.length,
      );
    }

    const severity: Record<string, number> = {
      blocker: 0,
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
    };
    runs.forEach((run) => {
      this.getActiveFindings(run.report).forEach((finding) => {
        severity[finding.severity] = (severity[finding.severity] ?? 0) + 1;
      });
    });

    const urgentFindings = runs
      .flatMap((run) =>
        this.getActiveFindings(run.report).map((finding) => ({ finding, run })),
      )
      .filter(({ finding }) => ['blocker', 'critical'].includes(finding.severity))
      .slice(0, 10)
      .map(({ finding, run }) => ({
        runId: run.runId,
        assertion: finding.assertion,
        severity: finding.severity,
        observed: finding.observed,
      }));

    const kpiAlerts = runs
      .flatMap((run) =>
        this.getActiveKpiAlerts(run.report).map((kpi) => ({ kpi, run })),
      )
      .slice(0, 10)
      .map(({ kpi, run }) => ({
        runId: run.runId,
        label: kpi.label,
        expected: kpi.expected,
        observed: kpi.observed,
      }));

    const providerUsage = runs.reduce<Record<string, number>>((acc, run) => {
      acc[run.provider] = (acc[run.provider] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totals,
      severity,
      urgentFindings,
      kpiAlerts,
      providerUsage,
    };
  }

  listCollectionRuns(): CollectionRunRecord[] {
    return [...this.collectionRuns.values()];
  }

  listCollectionRunsForCollection(collectionId: string): CollectionRunRecord[] {
    return this.listCollectionRuns().filter((run) => run.collectionId === collectionId);
  }

  getCollectionRun(collectionRunId: string): CollectionRunRecord {
    const record = this.collectionRuns.get(collectionRunId);
    if (!record) {
      throw new NotFoundException(`Collection run ${collectionRunId} not found`);
    }
    return record;
  }

  getCollectionRunForCollection(
    collectionId: string,
    collectionRunId: string,
  ): CollectionRunRecord {
    const record = this.getCollectionRun(collectionRunId);
    if (record.collectionId !== collectionId) {
      throw new NotFoundException(
        `Collection run ${collectionRunId} not found for collection ${collectionId}`,
      );
    }
    return record;
  }

  async startCollectionRun(
    collectionId: string,
    options?: { executionMode?: ExecutionMode; baseUrl?: string | null },
  ): Promise<CollectionRunRecord> {
    const collection = this.taskCollections.get(collectionId);
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    const executionMode = options?.executionMode ?? collection.executionMode ?? 'parallel';
    const effectiveBaseUrl = this.normalizeBaseUrl(options?.baseUrl ?? collection.baseUrl);
    const collectionRunId = uuidv4();
    const record: CollectionRunRecord = {
      id: collectionRunId,
      collectionId,
      executionMode,
      status: 'running',
      startedAt: new Date().toISOString(),
      baseUrl: effectiveBaseUrl,
      items: [],
    };
    this.collectionRuns.set(collectionRunId, record);
    this.persistCollectionRuns();

    const startTask = async (taskId: string): Promise<string | null> => {
      try {
        const runRecord = await this.startRun(taskId, undefined, effectiveBaseUrl);
        record.items.push({
          taskId,
          runId: runRecord.runId,
          status: runRecord.status,
        });
        this.persistCollectionRuns();
        this.attachCollectionRunWatcher(collectionRunId, runRecord.runId);
        return runRecord.runId;
      } catch (error) {
        record.items.push({
          taskId,
          status: 'failed',
          error: (error as Error).message,
        });
        this.persistCollectionRuns();
        return null;
      }
    };

    if (executionMode === 'sequential') {
      for (const taskId of collection.taskIds) {
        const runId = await startTask(taskId);
        if (runId) {
          await this.waitForRunCompletion(runId);
        }
      }
    } else {
      await Promise.all(collection.taskIds.map((taskId) => startTask(taskId)));
    }

    this.evaluateCollectionRunCompletion(record);
    this.persistCollectionRuns();
    return record;
  }

  dismissFinding(
    runId: string,
    findingId: string,
    reason: DismissReason,
    dismissedBy?: string,
  ): StoredRunRecord {
    return this.updateRunReport(runId, (report) => {
      const index = report.findings.findIndex((finding) => finding.id === findingId);
      if (index === -1) {
        throw new NotFoundException(`Finding ${findingId} not found in run ${runId}`);
      }
      const dismissedAt = new Date().toISOString();
      const actor = dismissedBy?.trim() || 'manual';
      const updatedFindings = [...report.findings];
      updatedFindings[index] = {
        ...updatedFindings[index],
        dismissal: {
          reason,
          dismissedAt,
          dismissedBy: actor,
        },
      };
      return {
        ...report,
        findings: updatedFindings,
      };
    });
  }

  restoreFinding(runId: string, findingId: string): StoredRunRecord {
    return this.updateRunReport(runId, (report) => {
      const index = report.findings.findIndex((finding) => finding.id === findingId);
      if (index === -1) {
        throw new NotFoundException(`Finding ${findingId} not found in run ${runId}`);
      }
      const updatedFindings = [...report.findings];
      updatedFindings[index] = {
        ...updatedFindings[index],
        dismissal: undefined,
      };
      return {
        ...report,
        findings: updatedFindings,
      };
    });
  }

  dismissKpi(
    runId: string,
    label: string,
    reason: DismissReason,
    dismissedBy?: string,
  ): StoredRunRecord {
    return this.updateRunReport(runId, (report) => {
      const index = report.kpiTable.findIndex((row) => row.label === label);
      if (index === -1) {
        throw new NotFoundException(`KPI "${label}" not found in run ${runId}`);
      }
      const dismissedAt = new Date().toISOString();
      const actor = dismissedBy?.trim() || 'manual';
      const updatedTable = [...report.kpiTable];
      updatedTable[index] = {
        ...updatedTable[index],
        dismissal: {
          reason,
          dismissedAt,
          dismissedBy: actor,
        },
      };
      return {
        ...report,
        kpiTable: updatedTable,
      };
    });
  }

  restoreKpi(runId: string, label: string): StoredRunRecord {
    return this.updateRunReport(runId, (report) => {
      const index = report.kpiTable.findIndex((row) => row.label === label);
      if (index === -1) {
        throw new NotFoundException(`KPI "${label}" not found in run ${runId}`);
      }
      const updatedTable = [...report.kpiTable];
      updatedTable[index] = {
        ...updatedTable[index],
        dismissal: undefined,
      };
      return {
        ...report,
        kpiTable: updatedTable,
      };
    });
  }

  private persistRuns(): void {
    this.runStorage.saveRuns([...this.runs.values()]);
  }

  private waitForRunCompletion(runId: string): Promise<void> {
    const inFlight = this.runCompletionPromises.get(runId);
    if (inFlight) {
      return inFlight;
    }
    const run = this.runs.get(runId);
    if (!run || run.status !== 'running') {
      return Promise.resolve();
    }
    return Promise.resolve();
  }

  private attachCollectionRunWatcher(collectionRunId: string, runId: string): void {
    this.waitForRunCompletion(runId)
      .catch(() => undefined)
      .then(() => {
        this.updateCollectionRunItemFromRun(collectionRunId, runId);
      });
  }

  private updateCollectionRunItemFromRun(collectionRunId: string, runId: string): void {
    const record = this.collectionRuns.get(collectionRunId);
    if (!record) {
      return;
    }
    const item = record.items.find((entry) => entry.runId === runId);
    if (!item) {
      return;
    }
    const run = this.runs.get(runId);
    if (run) {
      item.status = run.status;
      item.error = run.error;
    } else {
      item.status = 'failed';
      item.error = item.error ?? 'Run data unavailable';
    }
    this.evaluateCollectionRunCompletion(record);
    this.persistCollectionRuns();
  }

  private evaluateCollectionRunCompletion(record: CollectionRunRecord): void {
    if (!record.items.length) {
      return;
    }
    const hasRunning = record.items.some((item) => item.status === 'running');
    if (!hasRunning) {
      record.status = 'completed';
      record.finishedAt = record.finishedAt ?? new Date().toISOString();
    }
  }

  private persistCollectionRuns(): void {
    this.collectionRunStorage.saveRuns([...this.collectionRuns.values()]);
  }

  private normalizeBaseUrl(value?: string | null): string | undefined {
    if (value === null) {
      return undefined;
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private getActiveFindings(report?: QaReport): QaReport['findings'] {
    return (report?.findings ?? []).filter((finding) => !finding.dismissal);
  }

  private getActiveKpiAlerts(report?: QaReport): QaReport['kpiTable'] {
    return (report?.kpiTable ?? []).filter(
      (kpi) => kpi.status !== 'ok' && !kpi.dismissal,
    );
  }

  private buildRunSummarySnapshot(report: QaReport): StoredRunRecord['summary'] {
    const activeFindings = this.getActiveFindings(report);
    const severityCounts: Record<string, number> = {
      blocker: 0,
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
    };
    activeFindings.forEach((finding) => {
      severityCounts[finding.severity] = (severityCounts[finding.severity] ?? 0) + 1;
    });
    const activeKpiAlerts = this.getActiveKpiAlerts(report).length;
    return {
      findings: activeFindings.length,
      severityCounts,
      kpiAlerts: activeKpiAlerts,
    };
  }

  private updateRunReport(
    runId: string,
    mutator: (report: QaReport) => QaReport,
  ): StoredRunRecord {
    const existing = this.getRun(runId);
    if (!existing.report) {
      throw new NotFoundException(`Run ${runId} does not have a QA report yet`);
    }
    const updatedReport = mutator(existing.report);
    const updatedRecord: StoredRunRecord = {
      ...existing,
      report: updatedReport,
      summary: this.buildRunSummarySnapshot(updatedReport),
    };
    this.runs.set(runId, updatedRecord);
    this.persistRuns();
    return updatedRecord;
  }

  private async persistLastBaseUrl(baseUrl: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.lastBaseUrlPath), { recursive: true });
      await fs.writeFile(this.lastBaseUrlPath, baseUrl.trim(), 'utf8');
    } catch (error) {
      this.logger.warn(
        `Failed to persist last base URL override: ${(error as Error).message}`,
      );
    }
  }
}
