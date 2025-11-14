import { Injectable, Logger } from '@nestjs/common';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import type { QaReport, TaskSpec } from '../models/contracts';
import type { AiProvider, RunResult } from '../models/run';
import { AiProviderRegistryService } from '../providers/ai-provider-registry.service';
import { ComputerUseOrchestratorService } from '../providers/computer-use-orchestrator.service';
import { WorkerGatewayService } from '../worker/worker-gateway.service';

@Injectable()
export class RunExecutionService {
  private readonly logger = new Logger(RunExecutionService.name);

  constructor(
    private readonly providerRegistry: AiProviderRegistryService,
    private readonly workerGateway: WorkerGatewayService,
    private readonly computerUseOrchestratorService: ComputerUseOrchestratorService,
  ) {}

  async execute(runId: string, task: TaskSpec, providerKey: AiProvider): Promise<RunResult> {
    const startedAt = new Date();
    const provider = this.providerRegistry.resolve(providerKey);
    this.logger.log(
      `Starting run ${runId} with task ${task.id} using provider ${provider.provider}`,
    );

    const handle = await this.workerGateway.startRun(runId, task.route);

    try {
      const initialScreenshot = await this.workerGateway.captureScreenshot(handle, 'initial');
      let report: QaReport | null = null;
      let eventsPath: string | undefined;
      let responsesPath: string | undefined;
      let usageTotals = { tokensInput: 0, tokensOutput: 0, totalTokens: 0 };
      let totalToolCalls = 0;
      let errorDuringRun: Error | null = null;

      try {
        const sessionResult = await this.computerUseOrchestratorService.run({
          provider: provider.provider,
          runId,
          task,
          handle,
          initialScreenshotPath: initialScreenshot,
          startedAt,
        });
        report = sessionResult.report;
        eventsPath = sessionResult.eventsPath;
        responsesPath = sessionResult.responsesPath;
        usageTotals = sessionResult.usageTotals;
        totalToolCalls = sessionResult.totalToolCalls;
      } catch (error) {
        errorDuringRun = error as Error;
        this.logger.error(
          `Computer-use session failed for run ${runId}: ${(error as Error).message}`,
        );
      }

      const finishedAt = new Date();
      const tracePath = path.join(handle.artifactDir, 'trace.zip');

      if (!report) {
        report = this.buildFallbackReport({
          runId,
          task,
          startedAt,
          finishedAt,
          initialScreenshot,
          tracePath,
          reason: errorDuringRun?.message ?? 'Computer-use session did not return a report.',
        });
      } else {
        report.runId = runId;
        report.taskId = task.id;
        report.startedAt = report.startedAt ?? startedAt.toISOString();
        report.finishedAt = finishedAt.toISOString();
        report.links = {
          ...(report.links ?? {}),
          traceUrl: tracePath,
          screenshotsGalleryUrl: handle.screenshotDir,
          rawTranscriptUrl: responsesPath ?? null,
        };
        report.costs = {
          ...(report.costs ?? {}),
          tokensInput: usageTotals.tokensInput,
          tokensOutput: usageTotals.tokensOutput,
          toolCalls: totalToolCalls,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        };
      }

      const reportPath = path.join(handle.artifactDir, 'qa-report.json');
      await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
      const metadataPath = path.join(handle.artifactDir, 'run-metadata.json');
      const metadata = {
        runId,
        taskId: task.id,
        provider: provider.provider,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        artifactDir: handle.artifactDir,
        screenshots: handle.screenshots,
        budgets: task.budgets,
        kpiSpec: task.kpiSpec,
        eventsPath: eventsPath ?? null,
        responsesPath: responsesPath ?? null,
        usageTotals,
        totalToolCalls,
      };
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      const logPath = path.join(handle.artifactDir, 'run-log.json');
      const logEvents = [
        {
          type: 'run_started',
          timestamp: startedAt.toISOString(),
          message: `Run ${runId} created for task ${task.id}`,
        },
        {
          type: report.status === 'passed' ? 'run_completed' : 'run_completed_with_notes',
          timestamp: finishedAt.toISOString(),
          message:
            report.status === 'passed'
              ? 'AI computer-use session completed successfully.'
              : `Run finished with status ${report.status}. ${report.summary}`,
        },
      ];
      if (errorDuringRun) {
        logEvents.push({
          type: 'error',
          timestamp: finishedAt.toISOString(),
          message: errorDuringRun.message,
        });
      }
      await writeFile(logPath, JSON.stringify({ runId, events: logEvents }, null, 2), 'utf8');

      return {
        report,
        artifacts: {
          screenshots: handle.screenshots,
          traceZipPath: tracePath,
          reportPath,
          metadataPath,
          logsPath: logPath,
          transcriptPath: responsesPath,
          eventsPath,
        },
      };
    } finally {
      await this.workerGateway.stopRun(handle);
    }
  }

  private buildFallbackReport(options: {
    runId: string;
    task: TaskSpec;
    startedAt: Date;
    finishedAt: Date;
    initialScreenshot: string;
    tracePath: string;
    reason: string;
  }): QaReport {
    return {
      id: uuidv4(),
      runId: options.runId,
      taskId: options.task.id,
      startedAt: options.startedAt.toISOString(),
      finishedAt: options.finishedAt.toISOString(),
      summary: `Run ended without a structured QAReport: ${options.reason}`,
      status: 'inconclusive',
      findings: [
        {
          id: uuidv4(),
          severity: 'info',
          category: 'functional',
          assertion: 'AI session fallback',
          expected: 'The AI agent should complete a computer-use loop successfully.',
          observed: options.reason,
          tolerance: null,
          evidence: [
            {
              screenshotRef: options.initialScreenshot,
              selector: null,
              time: options.startedAt.toISOString(),
              networkRequestId: null,
            },
          ],
          suggestedFix: 'Review computer-use loop output and retry the run.',
          confidence: 0.1,
        },
      ],
      kpiTable: [],
      links: {
        traceUrl: options.tracePath,
        screenshotsGalleryUrl: path.dirname(options.initialScreenshot),
        rawTranscriptUrl: null,
      },
      costs: {
        tokensInput: 0,
        tokensOutput: 0,
        toolCalls: 0,
        durationMs: options.finishedAt.getTime() - options.startedAt.getTime(),
      },
    };
  }
}
