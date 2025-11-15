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
