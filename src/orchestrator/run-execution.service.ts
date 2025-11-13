import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import type { AppEnvironment } from '../config/environment';
import type { QaReport, TaskSpec } from '../models/contracts';
import type { AiProvider, RunResult } from '../models/run';
import { AiProviderRegistryService } from '../providers/ai-provider-registry.service';
import { KpiOracleService } from '../services/kpi-oracle.service';
import { WorkerGatewayService } from '../worker/worker-gateway.service';

@Injectable()
export class RunExecutionService {
  private readonly logger = new Logger(RunExecutionService.name);

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly providerRegistry: AiProviderRegistryService,
    private readonly workerGateway: WorkerGatewayService,
    private readonly kpiOracleService: KpiOracleService,
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

      const finishedAt = new Date();
      const tracePath = path.join(handle.artifactDir, 'trace.zip');

      const oracle = await this.kpiOracleService.resolve(task.kpiSpec);
      const kpiTable = Object.entries(oracle.data).map(([label, expected]) => ({
        label,
        expected: String(expected),
        observed: 'pending-ai-verification',
        status: 'missing' as const,
      }));

      const placeholderFinding = {
        id: uuidv4(),
        severity: 'info' as const,
        category: 'functional' as const,
        assertion: 'AI run orchestration is pending completion',
        expected: 'The AI provider should perform a full computer-use session.',
        observed:
          'This is a scaffolded run awaiting integration with the provider-specific loop implementation.',
        tolerance: null,
        evidence: [
          {
            screenshotRef: initialScreenshot,
            selector: null,
            time: startedAt.toISOString(),
            networkRequestId: null,
          },
        ],
        suggestedFix: 'Implement provider execution loop that relays tool results to the LLM.',
        confidence: 0.1,
      };

      const report: QaReport = {
        id: uuidv4(),
        runId,
        taskId: task.id,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        summary:
          'Run scaffold executed. Awaiting implementation of provider-driven computer use orchestration.',
        status: 'inconclusive',
        findings: [placeholderFinding],
        kpiTable,
        links: {
          traceUrl: tracePath,
          screenshotsGalleryUrl: handle.screenshotDir,
          rawTranscriptUrl: null,
        },
        costs: {
          tokensInput: 0,
          tokensOutput: 0,
          toolCalls: 0,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        },
      };

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
        oracleData: oracle.data,
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
          type: 'placeholder_ai_summary',
          timestamp: finishedAt.toISOString(),
          message:
            'Structured AI session not yet executed; generated placeholder QA report with KPI oracle data.',
        },
      ];
      await writeFile(logPath, JSON.stringify({ runId, events: logEvents }, null, 2), 'utf8');

      return {
        report,
        artifacts: {
          screenshots: [initialScreenshot],
          traceZipPath: tracePath,
          reportPath,
          metadataPath,
          logsPath: logPath,
        },
      };
    } finally {
      await this.workerGateway.stopRun(handle);
    }
  }
}
