import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

import type { AppEnvironment } from '../config/environment';
import type { QaReport } from '../models/contracts';
import type { AiProvider, RunResult } from '../models/run';
import { TaskRegistryService } from '../tasks/task-registry.service';
import { RunExecutionService } from './run-execution.service';

export interface StoredRun extends RunResult {
  runId: string;
  provider: AiProvider;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly runs = new Map<string, StoredRun>();

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly taskRegistry: TaskRegistryService,
    private readonly runExecutionService: RunExecutionService,
  ) {}

  async startRun(taskId: string, providerOverride?: AiProvider): Promise<StoredRun> {
    const task = this.taskRegistry.get(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const runId = uuidv4();
    const provider =
      providerOverride ??
      (this.configService.get('DEFAULT_PROVIDER', { infer: true }) as AiProvider);

    this.logger.log(`Creating run ${runId} for task ${taskId} with provider ${provider}`);
    const result = await this.runExecutionService.execute(runId, task, provider);
    const storedRun: StoredRun = { runId, provider, ...result };
    this.runs.set(runId, storedRun);
    return storedRun;
  }

  getReport(runId: string): QaReport {
    const run = this.runs.get(runId);
    if (!run) {
      throw new NotFoundException(`Run ${runId} not found`);
    }
    return run.report;
  }

  listRuns(): StoredRun[] {
    return [...this.runs.values()];
  }
}
