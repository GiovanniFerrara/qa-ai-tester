import { Injectable, Logger } from '@nestjs/common';
import type {
  Response,
  ResponseComputerToolCall,
  ResponseCreateParams,
  ResponseFunctionToolCallItem,
  ResponseInputItem,
  ResponseUsage,
} from 'openai/resources/responses/responses';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import {
  AssertToolRequestSchema,
  DomSnapshotRequestSchema,
  QaReportSchema,
  type ComputerAction,
  type DomSnapshotRequest,
  type QaReport,
  type Finding,
} from '../models/contracts';
import type { TaskSpec } from '../models/contracts';
import type { BrowserRunHandle } from '../worker/worker-gateway.service';
import { WorkerGatewayService } from '../worker/worker-gateway.service';
import { OpenAiProviderService } from './openai-provider.service';
import type { RunEvent, RunEventsService } from '../orchestrator/run-events.service';
import { RunCancelledError } from '../orchestrator/run-errors';

interface ComputerUseRunOptions {
  runId: string;
  task: TaskSpec;
  handle: BrowserRunHandle;
  initialScreenshotPath: string;
  startedAt: Date;
  events?: Pick<RunEventsService, 'emit'>;
  abortSignal?: AbortSignal;
}

export interface ComputerUseSessionResult {
  report: QaReport;
  eventsPath: string;
  responsesPath: string;
  usageTotals: {
    tokensInput: number;
    tokensOutput: number;
    totalTokens: number;
  };
  totalToolCalls: number;
  model: string;
}

interface ComputerUseEvent {
  step: number;
  type: 'computer' | 'function';
  tool: string;
  callId: string;
  input: unknown;
  output?: unknown;
  timestamp: string;
}

@Injectable()
export class OpenAiComputerUseService {
  private readonly logger = new Logger(OpenAiComputerUseService.name);

  constructor(
    private readonly provider: OpenAiProviderService,
    private readonly workerGateway: WorkerGatewayService,
  ) {}

  async run(options: ComputerUseRunOptions): Promise<ComputerUseSessionResult> {
    const { handle, runId, task } = options;
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
    const plan = this.provider.buildComputerUsePlan(task, runId);
    const client = this.provider.getClient();
    const emitEvent = (
      event: Omit<RunEvent, 'timestamp'> & Partial<Pick<RunEvent, 'timestamp'>>,
    ) => {
      if (!options.events) {
        return;
      }
      options.events.emit(runId, {
        ...event,
        timestamp: event.timestamp ?? new Date().toISOString(),
      });
    };

    const initialScreenshotBuffer = await fs.readFile(options.initialScreenshotPath);
    const initialScreenshotBase64 = initialScreenshotBuffer.toString('base64');

    const initialScreenshotName = path.basename(options.initialScreenshotPath);

    const input: ResponseCreateParams['input'] = [
      {
        role: 'system',
        content: [{ type: 'input_text', text: plan.systemPrompt }] as const,
      },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: plan.userPrompt },
          { type: 'input_image', image_url: `data:image/png;base64,${initialScreenshotBase64}` },
          {
            type: 'input_text',
            text: `Latest screenshot saved as ${initialScreenshotName}. Use this exact filename when referencing evidence screenshots.`,
          },
        ] as const,
      },
    ] as ResponseCreateParams['input'];

    const initialParams: ResponseCreateParams = {
      model: plan.model,
      tools: plan.tools,
      input,
      max_output_tokens: plan.maxOutputTokens,
      truncation: 'auto',
    };

    let response = await client.responses.create(initialParams);

    const events: ComputerUseEvent[] = [];
    const findingsFromTool: QaReport['findings'] = [];
    const responsesSummary: Array<{ id: string; status: Response['status']; usage?: ResponseUsage | null } & Record<string, unknown>> = [];
    const usageTotals = {
      tokensInput: 0,
      tokensOutput: 0,
      totalTokens: 0,
    };

    const recordResponseUsage = (usage?: ResponseUsage | null) => {
      if (!usage) return;
      usageTotals.tokensInput += usage.input_tokens ?? 0;
      usageTotals.tokensOutput += usage.output_tokens ?? 0;
      usageTotals.totalTokens += usage.total_tokens ?? 0;
    };

    recordResponseUsage(response.usage);
    this.logger.debug(
      `Run ${runId}: received initial response ${response.id} (status=${response.status})`,
    );
    responsesSummary.push({ id: response.id, status: response.status, usage: response.usage });
    emitEvent({
      type: 'log',
      message: `Initial model response ${response.id} (${response.status})`,
      payload: response.usage ? { usage: response.usage } : undefined,
    });

    let iterations = 0;
    const maxIterations = task.budgets?.maxToolCalls ?? 200;
    let totalToolCalls = 0;
    let promptedForReport = false;

    while (iterations < maxIterations) {
      ensureNotCancelled();
      iterations += 1;

      const functionCalls = this.extractFunctionCalls(response);
      const computerCalls = this.extractComputerCalls(response);
      this.logger.debug(
        `Run ${runId}: iteration ${iterations} => function calls=${functionCalls.length}, computer calls=${computerCalls.length}`,
      );
      emitEvent({
        type: 'log',
        message: `Iteration ${iterations}: function calls=${functionCalls.length}, computer calls=${computerCalls.length}`,
      });

      const followUpInputs: ResponseInputItem[] = [];
      const pushReportReminder = (): boolean => {
        if (promptedForReport) {
          return false;
        }
        promptedForReport = true;
        const reminderText =
          'Please respond with ONLY the QAReport JSON object that matches the provided schema. Include at least one finding entry if possible.';
        this.logger.debug(
          `Run ${runId}: prompting model for structured QAReport (no tool outputs returned).`,
        );
        emitEvent({
          type: 'log',
          message: 'Prompting model to produce structured QAReport.',
        });
        followUpInputs.push({
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: reminderText,
            },
          ],
        });
        return true;
      };

      if (functionCalls.length > 0) {
        for (const call of functionCalls) {
          ensureNotCancelled();
          const result = await this.handleFunctionCall(call, { runId, task, handle }, findingsFromTool);
          const outputPayload =
            typeof result.output === 'string' ? result.output : JSON.stringify(result.output);

          this.logger.debug(
            `Run ${runId}: function tool "${call.name}" call_id=${call.call_id}`,
          );

          followUpInputs.push({
            type: 'function_call_output',
            call_id: call.call_id,
            output: outputPayload,
          });
          events.push({
            step: events.length + 1,
            type: 'function',
            tool: call.name,
            callId: call.call_id,
            input: result.input,
            output: result.output,
            timestamp: new Date().toISOString(),
          });
          emitEvent({
            type: 'tool_call',
            message: `Function tool "${call.name}" executed`,
            payload: {
              callId: call.call_id,
              tool: call.name,
              input: result.input,
              output: result.output,
            },
          });
          totalToolCalls += 1;
        }
      }

      if (computerCalls.length > 0) {
        for (const call of computerCalls) {
          ensureNotCancelled();
          const mappedAction = this.mapComputerAction(call);
          this.logger.debug(
            `Run ${runId}: executing computer action ${call.action.type} (call_id=${call.call_id})`,
          );
          const actionResult = await this.workerGateway.performComputerAction(handle, mappedAction);
          const screenshotName = path.basename(actionResult.screenshotPath);
          events.push({
            step: events.length + 1,
            type: 'computer',
            tool: 'computer',
            callId: call.call_id,
            input: call.action,
            output: { viewport: actionResult.viewport },
            timestamp: new Date().toISOString(),
          });
          emitEvent({
            type: 'tool_call',
            message: `Computer action ${call.action.type}`,
            payload: {
              callId: call.call_id,
              action: call.action,
              viewport: actionResult.viewport,
              pendingSafetyChecks: call.pending_safety_checks,
            },
          });
          emitEvent({
            type: 'screenshot',
            message: `Screenshot after ${call.action.type}`,
            payload: {
              callId: call.call_id,
              image: `data:image/png;base64,${actionResult.screenshot}`,
              viewport: actionResult.viewport,
              screenshotName,
            },
          });

          followUpInputs.push({
            type: 'computer_call_output',
            call_id: call.call_id,
            output: {
              type: 'computer_screenshot',
              image_url: `data:image/png;base64,${actionResult.screenshot}`,
            },
            acknowledged_safety_checks: call.pending_safety_checks.map((safety) => ({
              id: safety.id,
              code: safety.code,
              message: safety.message,
            })),
          });
          followUpInputs.push({
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Screenshot saved as ${screenshotName}. Reference this filename for any findings or evidence.`,
              },
            ],
          });
            totalToolCalls += 1;
          }
        }

      ensureNotCancelled();
      const maybeReport = this.tryExtractReport(response, findingsFromTool, options);
      if (followUpInputs.length === 0) {
        if (maybeReport) {
          emitEvent({
            type: 'status',
            message: `Structured QAReport received with status ${maybeReport.status}`,
            payload: { report: maybeReport },
          });
          await this.writeSessionArtifacts(handle.artifactDir, events, responsesSummary);
          this.logger.debug(`Run ${runId}: AI returned structured report, finishing.`);
          return {
            report: maybeReport,
            eventsPath: path.join(handle.artifactDir, 'computer-use-events.json'),
            responsesPath: path.join(handle.artifactDir, 'model-responses.jsonl'),
            usageTotals,
            totalToolCalls,
            model: plan.model,
          };
        }

        if (!pushReportReminder()) {
          if (response.status === 'completed') {
            const finalText = (response.output_text ?? '').trim();
            this.logger.warn(
              `Run ${runId}: model completed without returning QAReport. Final output preview: ${finalText.slice(
                0,
                200,
              )}`,
            );
            emitEvent({
              type: 'status',
              message: 'Model completed without returning structured QAReport.',
              payload: finalText ? { finalText } : undefined,
            });
            throw new Error(
              `Model completed without returning a structured QAReport. Final output: ${
                finalText ? finalText.slice(0, 500) : '<empty>'
              }`,
            );
          }

          this.logger.warn(
            `Run ${runId}: no tool outputs even after reminder; aborting computer-use session.`,
          );
          emitEvent({
            type: 'status',
            message:
              'No additional tool outputs received after reminder; aborting computer-use session.',
          });
          throw new Error(
            'AI session stalled without returning tool outputs or structured QAReport.',
          );
        }
      }

      ensureNotCancelled();
      const followUpParams: ResponseCreateParams = {
        model: plan.model,
        tools: plan.tools,
        input: followUpInputs,
        previous_response_id: response.id,
        max_output_tokens: plan.maxOutputTokens,
        truncation: 'auto',
      };

      response = await client.responses.create(followUpParams);
      ensureNotCancelled();

      recordResponseUsage(response.usage);
      this.logger.debug(
        `Run ${runId}: received response ${response.id} (status=${response.status})`,
      );
      responsesSummary.push({ id: response.id, status: response.status, usage: response.usage });
    }

    throw new Error(`Exceeded maximum iteration limit (${maxIterations}) without completion.`);
  }

  private extractFunctionCalls(response: Response): ResponseFunctionToolCallItem[] {
    return (response.output ?? []).filter(
      (item): item is ResponseFunctionToolCallItem =>
        item.type === 'function_call',
    );
  }

  private extractComputerCalls(response: Response): ResponseComputerToolCall[] {
    return (response.output ?? []).filter(
      (item): item is ResponseComputerToolCall => item.type === 'computer_call',
    );
  }

  private mapComputerAction(call: ResponseComputerToolCall): ComputerAction {
    const { action } = call;
    switch (action.type) {
      case 'click':
        return {
          action: action.button === 'right' ? 'right_click' : 'click',
          coords: { x: Math.round(action.x), y: Math.round(action.y) },
        };
      case 'double_click':
        return {
          action: 'double_click',
          coords: { x: Math.round(action.x), y: Math.round(action.y) },
        };
      case 'move':
        return {
          action: 'move',
          coords: { x: Math.round(action.x), y: Math.round(action.y) },
        };
      case 'scroll':
        return {
          action: 'scroll',
          coords: { x: Math.round(action.x), y: Math.round(action.y) },
          scroll: { deltaX: action.scroll_x, deltaY: action.scroll_y },
        };
      case 'type':
        return { action: 'type', text: action.text };
      case 'keypress':
        return { action: 'keypress', keys: action.keys };
      case 'wait':
        return { action: 'wait', wait: { type: 'ms', value: 2000 } };
      case 'screenshot':
        return { action: 'screenshot' };
      case 'drag':
        return {
          action: 'drag',
          path: action.path.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })),
        };
      default:
        this.logger.warn(`Unhandled computer action type ${(action as { type: string }).type}`);
        return { action: 'screenshot' };
    }
  }

  private async handleFunctionCall(
    call: ResponseFunctionToolCallItem,
    context: { runId: string; task: TaskSpec; handle: BrowserRunHandle },
    findings: QaReport['findings'],
  ): Promise<{ input: unknown; output: unknown }> {
    const args = this.safeParseArguments(call.arguments);
    switch (call.name) {
      case 'dom_snapshot': {
        const snapshotInput = DomSnapshotRequestSchema.safeParse(args);
        if (!snapshotInput.success) {
          return {
            input: args,
            output: { error: 'Invalid dom_snapshot arguments', details: snapshotInput.error.issues },
          };
        }
        const result = await this.workerGateway.getDomSnapshot(context.handle, snapshotInput.data);
        return { input: snapshotInput.data, output: result };
      }
      case 'assert': {
        const parsed = AssertToolRequestSchema.safeParse(args);
        if (!parsed.success) {
          return {
            input: args,
            output: { error: 'Invalid assert payload', details: parsed.error.issues },
          };
        }
        const assertionId = uuidv4();
        findings.push({
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
          input: parsed.data,
          output: { assertionId },
        };
      }
      default:
        this.logger.warn(`Received call for unsupported tool ${call.name}`);
        return {
          input: args,
          output: { error: `Tool ${call.name} not implemented on orchestrator` },
        };
    }
  }

  private safeParseArguments(argumentsJson?: string | null): Record<string, unknown> {
    if (!argumentsJson) {
      return {};
    }
    try {
      return JSON.parse(argumentsJson) as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(`Failed to parse function arguments: ${(error as Error).message}`);
      return {};
    }
  }

  private tryExtractReport(
    response: Response,
    findings: QaReport['findings'],
    options: ComputerUseRunOptions,
  ): QaReport | null {
    const text = response.output_text ?? '';
    if (!text.trim()) {
      return null;
    }

    const parsed = this.extractJsonObject(text);
    if (!parsed) {
      this.logger.warn(`Failed to parse structured QAReport: no JSON detected in "${text.slice(0, 120)}..."`);
      return null;
    }

    try {
      const reportCandidate = QaReportSchema.parse(parsed);
      if (!reportCandidate.findings.length && findings.length) {
        reportCandidate.findings = findings;
      }
      if (options.task.requireFindings && reportCandidate.findings.length === 0) {
        reportCandidate.findings = [
          this.buildDefaultFinding(
            options,
            'The AI session completed without reporting specific issues.',
          ),
        ];
      }
      return reportCandidate;
    } catch (error) {
      this.logger.warn(`Failed to validate QAReport JSON: ${(error as Error).message}`);
      return null;
    }
  }

  private async writeSessionArtifacts(
    artifactDir: string,
    events: ComputerUseEvent[],
    responses: Array<Record<string, unknown>>,
  ): Promise<void> {
    const eventsPath = path.join(artifactDir, 'computer-use-events.json');
    await fs.writeFile(eventsPath, JSON.stringify(events, null, 2), 'utf8');

    const responsesPath = path.join(artifactDir, 'model-responses.jsonl');
    const responseLines = responses.map((entry) => JSON.stringify(entry));
    await fs.writeFile(responsesPath, `${responseLines.join('\n')}\n`, 'utf8');

    this.logger.debug(
      `Computer-use artifacts persisted to ${artifactDir} (events=${events.length}, responses=${responses.length})`,
    );
  }

  private buildDefaultFinding(options: ComputerUseRunOptions, message: string): Finding {
    return {
      id: uuidv4(),
      severity: 'info',
      category: 'functional',
      assertion: 'AI session summary',
      expected: 'A summary finding should be recorded for the run.',
      observed: message,
      tolerance: null,
      evidence: [
        {
          screenshotRef: options.initialScreenshotPath,
          selector: null,
          time: options.startedAt.toISOString(),
          networkRequestId: null,
        },
      ],
      suggestedFix: 'Review the run transcript for additional context if needed.',
      confidence: 0.5,
    };
  }

  private extractJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const direct = this.parseJsonObjectCandidate(trimmed);
    if (direct) {
      return direct;
    }

    const codeFenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
    let match: RegExpExecArray | null;
    while ((match = codeFenceRegex.exec(trimmed)) !== null) {
      const fenced = this.parseJsonObjectCandidate(match[1]);
      if (fenced) {
        return fenced;
      }
    }

    let startIndex = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = 0; index < trimmed.length; index += 1) {
      const char = trimmed[index];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        if (depth === 0) {
          startIndex = index;
        }
        depth += 1;
        continue;
      }

      if (char === '}' && depth > 0) {
        depth -= 1;
        if (depth === 0 && startIndex !== -1) {
          const candidate = trimmed.slice(startIndex, index + 1);
          const parsed = this.parseJsonObjectCandidate(candidate);
          if (parsed) {
            return parsed;
          }
          startIndex = -1;
        }
      }
    }

    return null;
  }

  private parseJsonObjectCandidate(candidate: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
}
