import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import type { AppEnvironment } from '../config/environment';
import type { QaReport } from '../models/contracts';
import type { AiProvider, RunResult, StoredRunRecord } from '../models/run';
import { TaskRegistryService } from '../tasks/task-registry.service';
import { RunExecutionService } from './run-execution.service';
import { RunStorageService } from './run-storage.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly runs = new Map<string, StoredRunRecord>();
  private readonly lastBaseUrlPath: string;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly taskRegistry: TaskRegistryService,
    private readonly runExecutionService: RunExecutionService,
    private readonly runStorage: RunStorageService,
  ) {
    this.lastBaseUrlPath = path.resolve(process.cwd(), 'data', 'last-base-url.txt');
    const storedRuns = this.runStorage.loadRuns();
    storedRuns.forEach((run) => this.runs.set(run.runId, run));
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

    void this.runExecutionService
      .execute(runId, task, provider, baseUrlOverride)
      .then((result: RunResult) => {
        const finishedAt = new Date();
        const completedRecord: StoredRunRecord = {
          ...pendingRecord,
          status: 'completed',
          finishedAt: finishedAt.toISOString(),
          report: result.report,
          artifacts: result.artifacts,
        };
        this.runs.set(runId, completedRecord);
        this.persistRuns();
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
      });

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
    const totals = {
      total: runs.length,
      completed: runs.filter((run) => run.status === 'completed').length,
      running: runs.filter((run) => run.status === 'running').length,
      failed: runs.filter((run) => run.status === 'failed').length,
      passed: runs.filter((run) => run.report?.status === 'passed').length,
      avgDurationMs: 0,
      findings: runs.reduce((acc, run) => acc + (run.report?.findings.length ?? 0), 0),
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
      run.report?.findings.forEach((finding) => {
        severity[finding.severity] = (severity[finding.severity] ?? 0) + 1;
      });
    });

    const urgentFindings = runs
      .flatMap((run) =>
        (run.report?.findings ?? []).map((finding) => ({ finding, run })),
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
        (run.report?.kpiTable ?? [])
          .filter((kpi) => kpi.status !== 'ok')
          .map((kpi) => ({ kpi, run })),
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

  private persistRuns(): void {
    this.runStorage.saveRuns([...this.runs.values()]);
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
