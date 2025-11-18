import { Injectable, Logger } from '@nestjs/common';
import type {
  ImageBlockParam,
  MessageParam,
  Tool,
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import {
  AssertToolRequestSchema,
  DomSnapshotRequestSchema,
  KpiOracleResponseSchema,
  type QaReport,
  type Finding,
} from '../models/contracts';
import type { TaskSpec } from '../models/contracts';
import type { BrowserRunHandle } from '../worker/worker-gateway.service';
import { WorkerGatewayService } from '../worker/worker-gateway.service';
import { AnthropicProviderService } from './anthropic-provider.service';
import type { ComputerUseSessionResult } from './openai-computer-use.service';
import { KpiOracleService } from '../services/kpi-oracle.service';
import type { RunEvent, RunEventsService } from '../orchestrator/run-events.service';
import {
  AnthropicActionMapper,
  type ComputerToolInput,
} from './anthropic/action-mapper.service';
import {
  AnthropicQaReportService,
  type QaReportContext,
} from './anthropic/qa-report.service';
import { safeStringify } from './anthropic/utils';
import { RunCancelledError } from '../orchestrator/run-errors';

export interface AnthropicComputerUseOptions {
  runId: string;
  task: TaskSpec;
  handle: BrowserRunHandle;
  initialScreenshotPath: string;
  startedAt: Date;
  events?: Pick<RunEventsService, 'emit'>;
  abortSignal?: AbortSignal;
}

interface ComputerUseEvent {
  step: number;
  type: 'computer' | 'tool';
  tool: string;
  callId: string;
  input: unknown;
  output?: unknown;
  timestamp: string;
}

@Injectable()
export class AnthropicComputerUseService {
  private readonly logger = new Logger(AnthropicComputerUseService.name);

  constructor(
    private readonly provider: AnthropicProviderService,
    private readonly workerGateway: WorkerGatewayService,
    private readonly kpiOracleService: KpiOracleService,
    private readonly actionMapper: AnthropicActionMapper,
    private readonly qaReportService: AnthropicQaReportService,
  ) {}

  async run(options: AnthropicComputerUseOptions): Promise<ComputerUseSessionResult> {
    const { runId, task, handle, events: runEvents } = options;
    const ensureNotCancelled = (): void => {
      if (!options.abortSignal?.aborted) {
        return;
      }
      const reason = options.abortSignal.reason;
      if (reason instanceof Error) {
        throw reason;
      }
      if (typeof reason === 'string' && reason.length > 0) {
        throw new RunCancelledError(reason);
      }
      throw new RunCancelledError();
    };
    ensureNotCancelled();
    const plan = this.provider.buildPlan(task, runId);
    const client = this.provider.getClient();
    const emitEvent = (event: Omit<RunEvent, 'timestamp'> & Partial<Pick<RunEvent, 'timestamp'>>) => {
      if (!runEvents) return;
      runEvents.emit(runId, {
        ...event,
        timestamp: event.timestamp ?? new Date().toISOString(),
      });
    };

    const initialScreenshotBuffer = await fs.readFile(options.initialScreenshotPath);
    const initialScreenshotBase64 = initialScreenshotBuffer.toString('base64');

    const messages: MessageParam[] = plan.messages.map((message) => ({
      role: message.role,
      content: [{ type: 'text', text: message.content }],
    }));

    if (messages.length === 0 || messages[0].role !== 'user') {
      messages.unshift({
        role: 'user',
        content: [{ type: 'text', text: `Begin QA run ${runId}.` }],
      });
    }

    const firstUserMessage = messages.find((msg) => msg.role === 'user');
    const initialImageBlock: ImageBlockParam = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: initialScreenshotBase64,
      },
    };
    if (firstUserMessage && Array.isArray(firstUserMessage.content)) {
      firstUserMessage.content.push(initialImageBlock);
    }

    const usageTotals = {
      tokensInput: 0,
      tokensOutput: 0,
      totalTokens: 0,
    };
    const events: ComputerUseEvent[] = [];
    const responsesSummary: Array<Record<string, unknown>> = [];
    const findingsFromTool: Finding[] = [];
    const reportContext = this.buildQaReportContext(options);
    const maxIterations = task.budgets?.maxToolCalls ?? 500;

    let totalToolCalls = 0;
    let iterations = 0;
    let finalReport: QaReport | null = null;
    let lastTextResponse = '';
    let reportReminderSent = false;

    while (iterations < maxIterations) {
      ensureNotCancelled();
      iterations += 1;
      const response = await client.messages.create({
        model: plan.model,
        max_tokens: plan.max_output_tokens,
        system: plan.system,
        messages,
        tools: plan.tools as Tool[],
      },
      {
        headers: {
          'anthropic-beta': 'computer-use-2025-01-24',
        },
      });

      usageTotals.tokensInput += response.usage?.input_tokens ?? 0;
      usageTotals.tokensOutput += response.usage?.output_tokens ?? 0;
      usageTotals.totalTokens =
        usageTotals.tokensInput + usageTotals.tokensOutput;

      responsesSummary.push({
        id: response.id,
        stop_reason: response.stop_reason,
        usage: response.usage,
      });

      const assistantMessage: MessageParam = {
        role: 'assistant',
        content: response.content,
      };
      messages.push(assistantMessage);

      const toolUses = response.content.filter(
        (block): block is ToolUseBlock => block.type === 'tool_use',
      );
      const toolResultBlocks: ToolResultBlockParam[] = [];

      for (const toolUse of toolUses) {
        ensureNotCancelled();
        let resultBlock: ToolResultBlockParam | null = null;

        switch (toolUse.name) {
          case 'computer': {
            resultBlock = await this.handleComputerTool({
              toolUse,
              handle,
              events,
              emitEvent,
              abortSignal: options.abortSignal,
            });
            break;
          }
          case 'dom_snapshot': {
            resultBlock = await this.handleDomSnapshot({
              toolUse,
              handle,
            });
            break;
          }
          case 'kpi_oracle': {
            resultBlock = await this.handleKpiOracle({
              toolUse,
              task,
              abortSignal: options.abortSignal,
            });
            break;
          }
          case 'assert': {
            resultBlock = this.handleAssertTool({
              toolUse,
              findingsFromTool,
            });
            break;
          }
          case 'qa_report_submit': {
            const maybeReport = this.qaReportService.parseToolSubmit({
              toolUse,
              findingsFromTool,
              context: reportContext,
              emitEvent,
            });
            if (maybeReport) {
              finalReport = maybeReport;
              resultBlock = {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: [{ type: 'text', text: 'Report received.' }],
              };
            } else {
              resultBlock = {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: [{ type: 'text', text: 'Invalid QA report payload.' }],
              };
            }
            break;
          }
          default: {
            resultBlock = {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: [{ type: 'text', text: `Tool ${toolUse.name} not implemented.` }],
            };
          }
        }

        if (resultBlock) {
          toolResultBlocks.push(resultBlock);
          totalToolCalls += 1;
        }
      }

      const textBlocks = response.content.filter(
        (block): block is { type: 'text'; text: string } => block.type === 'text',
      );
      if (textBlocks.length > 0) {
        lastTextResponse = textBlocks.map((block) => block.text).join('\n');
        emitEvent({
          type: 'log',
          message: lastTextResponse.slice(0, 500),
        });
      }

      if (finalReport) {
        emitEvent({
          type: 'status',
          message: `Structured QAReport received with status ${finalReport.status}`,
          payload: { report: finalReport },
        });
        break;
      }

      if (toolResultBlocks.length > 0) {
        messages.push({
          role: 'user',
          content: toolResultBlocks,
        });
        continue;
      }

      if (!toolUses.length) {
        const parsed = this.qaReportService.tryParseFromText(
          lastTextResponse,
          findingsFromTool,
          reportContext,
        );
        if (parsed) {
          finalReport = parsed;
          break;
        }
        if (!reportReminderSent) {
          reportReminderSent = true;
          emitEvent({
            type: 'log',
            message: 'Prompting model to submit QA report after inactivity.',
          });
          messages.push({
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You appear to be done. Please call qa_report_submit now with the final QAReport JSON.',
              },
            ],
          });
          continue;
        }
        this.logger.warn(`Run ${runId}: assistant returned no tool calls or QAReport.`);
        break;
      }
    }

    if (!finalReport) {
      throw new Error(
        'Anthropic computer-use session ended without returning a QAReport.',
      );
    }

    const artifactPaths = await this.writeSessionArtifacts(
      handle.artifactDir,
      events,
      responsesSummary,
    );

    return {
      report: finalReport,
      eventsPath: artifactPaths.eventsPath,
      responsesPath: artifactPaths.responsesPath,
      usageTotals,
      totalToolCalls,
      model: plan.model,
    };
  }

  private async handleComputerTool(params: {
    toolUse: ToolUseBlock;
    handle: BrowserRunHandle;
    events: ComputerUseEvent[];
    emitEvent: (event: RunEvent) => void;
    abortSignal?: AbortSignal;
  }): Promise<ToolResultBlockParam> {
    const { toolUse, handle, events, emitEvent, abortSignal } = params;
    if (abortSignal?.aborted) {
      const reason = abortSignal.reason;
      if (reason instanceof Error) {
        throw reason;
      }
      if (typeof reason === 'string' && reason.length > 0) {
        throw new RunCancelledError(reason);
      }
      throw new RunCancelledError();
    }
    const action = this.actionMapper.toComputerAction(toolUse.input as ComputerToolInput);
    if (!action) {
      const rawInput = safeStringify(toolUse.input);
      this.logger.warn(
        `Unsupported computer action payload for tool_use ${toolUse.id}: ${rawInput}`,
      );
      emitEvent({
        type: 'log',
        message: 'Unsupported computer action payload.',
        payload: {
          toolUseId: toolUse.id,
          rawInput,
        },
        timestamp: new Date().toISOString(),
      });
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: [{ type: 'text', text: 'Unsupported computer action payload.' }],
      };
    }

    this.logger.debug(
      `Executing computer action ${action.action} for tool_use ${toolUse.id}`,
    );
    const start = Date.now();
    const result = await this.workerGateway.performComputerAction(handle, action);
    const screenshotName = path.basename(result.screenshotPath);
    const latency = Date.now() - start;
    if (abortSignal?.aborted) {
      const reason = abortSignal.reason;
      if (reason instanceof Error) {
        throw reason;
      }
      if (typeof reason === 'string' && reason.length > 0) {
        throw new RunCancelledError(reason);
      }
      throw new RunCancelledError();
    }

    events.push({
      step: events.length + 1,
      type: 'computer',
      tool: 'computer',
      callId: toolUse.id,
      input: action,
      output: { viewport: result.viewport },
      timestamp: new Date().toISOString(),
    });

    emitEvent({
      type: 'screenshot',
      message: `Screenshot after ${action.action}`,
      payload: {
        callId: toolUse.id,
        image: `data:image/png;base64,${result.screenshot}`,
        viewport: result.viewport,
        screenshotName,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: result.screenshot,
          },
        },
        {
          type: 'text',
          text: JSON.stringify({
            viewport: result.viewport,
            latencyMs: latency,
            screenshotName,
          }),
        },
        {
          type: 'text',
          text: `Screenshot saved as ${screenshotName}. Reference this filename when providing evidence.`,
        },
      ],
    };
  }

  private async handleDomSnapshot(params: {
    toolUse: ToolUseBlock;
    handle: BrowserRunHandle;
  }): Promise<ToolResultBlockParam> {
    const { toolUse, handle } = params;
    const parsed = DomSnapshotRequestSchema.safeParse(toolUse.input ?? {});
    if (!parsed.success) {
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: [{ type: 'text', text: `Invalid dom_snapshot payload: ${parsed.error.message}` }],
      };
    }
    const snapshot = await this.workerGateway.getDomSnapshot(handle, parsed.data);
    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: [{ type: 'text', text: JSON.stringify(snapshot) }],
    };
  }

  private async handleKpiOracle(params: {
    toolUse: ToolUseBlock;
    task: TaskSpec;
    abortSignal?: AbortSignal;
  }): Promise<ToolResultBlockParam> {
    const { toolUse, task, abortSignal } = params;
    if (abortSignal?.aborted) {
      const reason = abortSignal.reason;
      if (reason instanceof Error) {
        throw reason;
      }
      if (typeof reason === 'string' && reason.length > 0) {
        throw new RunCancelledError(reason);
      }
      throw new RunCancelledError();
    }
    const context =
      (typeof toolUse.input === 'object' && toolUse.input !== null
        ? (toolUse.input as Record<string, unknown>).filters
        : undefined) ?? {};
    const result = await this.kpiOracleService.resolve(task.kpiSpec, context as Record<string, unknown>);
    const validated = KpiOracleResponseSchema.parse(result);
    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: [{ type: 'text', text: JSON.stringify(validated) }],
    };
  }

  private handleAssertTool(params: {
    toolUse: ToolUseBlock;
    findingsFromTool: Finding[];
  }): ToolResultBlockParam {
    const { toolUse, findingsFromTool } = params;
    const parsed = AssertToolRequestSchema.safeParse(toolUse.input ?? {});
    if (!parsed.success) {
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: [{ type: 'text', text: `Invalid assert payload: ${parsed.error.message}` }],
      };
    }

    const assertionId = uuidv4();
    findingsFromTool.push({
      id: assertionId,
      severity: parsed.data.severity,
      category: parsed.data.category,
      assertion: parsed.data.assertion,
      expected: parsed.data.expected,
      observed: parsed.data.observed,
      tolerance: parsed.data.tolerance,
      evidence: parsed.data.evidence,
      suggestedFix: parsed.data.suggestedFix,
      confidence: parsed.data.confidence,
    });

    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ assertionId }),
        },
      ],
    };
  }

  private buildQaReportContext(options: AnthropicComputerUseOptions): QaReportContext {
    return {
      task: options.task,
      initialScreenshotPath: options.initialScreenshotPath,
      startedAt: options.startedAt,
    };
  }

  private async writeSessionArtifacts(
    artifactDir: string,
    events: ComputerUseEvent[],
    responses: Array<Record<string, unknown>>,
  ): Promise<{ eventsPath: string; responsesPath: string }> {
    const eventsPath = path.join(artifactDir, 'computer-use-events.json');
    const responsesPath = path.join(artifactDir, 'model-responses.jsonl');
    await fs.writeFile(eventsPath, JSON.stringify(events, null, 2), 'utf8');
    const responseLines = responses.map((entry) => JSON.stringify(entry));
    await fs.writeFile(responsesPath, `${responseLines.join('\n')}\n`, 'utf8');
    this.logger.debug(
      `Anthropic computer-use artifacts persisted to ${artifactDir} (events=${events.length}, responses=${responses.length})`,
    );
    return { eventsPath, responsesPath };
  }
}
