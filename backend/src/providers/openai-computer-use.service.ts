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
} from '../models/contracts';
import type { TaskSpec } from '../models/contracts';
import type { BrowserRunHandle } from '../worker/worker-gateway.service';
import { WorkerGatewayService } from '../worker/worker-gateway.service';
import { OpenAiProviderService } from './openai-provider.service';

interface ComputerUseRunOptions {
  runId: string;
  task: TaskSpec;
  handle: BrowserRunHandle;
  initialScreenshotPath: string;
  startedAt: Date;
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
    const plan = this.provider.buildComputerUsePlan(task, runId);
    const client = this.provider.getClient();

    const initialScreenshotBuffer = await fs.readFile(options.initialScreenshotPath);
    const initialScreenshotBase64 = initialScreenshotBuffer.toString('base64');

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
    responsesSummary.push({ id: response.id, status: response.status, usage: response.usage });

    let iterations = 0;
    const maxIterations = task.budgets?.maxToolCalls ?? 200;
    let totalToolCalls = 0;

    while (iterations < maxIterations) {
      iterations += 1;

      const functionCalls = this.extractFunctionCalls(response);
      const computerCalls = this.extractComputerCalls(response);

      const followUpInputs: ResponseInputItem[] = [];

      if (functionCalls.length > 0) {
        for (const call of functionCalls) {
          const result = await this.handleFunctionCall(call, { runId, task, handle }, findingsFromTool);
          const outputPayload =
            typeof result.output === 'string' ? result.output : JSON.stringify(result.output);

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
          totalToolCalls += 1;
        }
      }

      if (computerCalls.length > 0) {
        for (const call of computerCalls) {
          const mappedAction = this.mapComputerAction(call);
          const actionResult = await this.workerGateway.performComputerAction(handle, mappedAction);
          events.push({
            step: events.length + 1,
            type: 'computer',
            tool: 'computer',
            callId: call.call_id,
            input: call.action,
            output: { viewport: actionResult.viewport },
            timestamp: new Date().toISOString(),
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
          totalToolCalls += 1;
        }
      }

      const maybeReport = this.tryExtractReport(response, findingsFromTool, options);
      if (followUpInputs.length === 0) {
        if (maybeReport) {
          await this.writeSessionArtifacts(handle.artifactDir, events, responsesSummary);
          return {
            report: maybeReport,
            eventsPath: path.join(handle.artifactDir, 'computer-use-events.json'),
            responsesPath: path.join(handle.artifactDir, 'model-responses.jsonl'),
            usageTotals,
            totalToolCalls,
          };
        }

        if (response.status === 'completed') {
          throw new Error('Model completed without returning a structured QAReport.');
        }
      }

      if (followUpInputs.length === 0) {
        // Nothing to send back but also not completed – prevent tight loop
        followUpInputs.push({
          type: 'computer_call_output',
          call_id: uuidv4(),
          output: {
            type: 'computer_screenshot',
            image_url: `data:image/png;base64,${initialScreenshotBase64}`,
          },
        });
      }

      const followUpParams: ResponseCreateParams = {
        model: plan.model,
        tools: plan.tools,
        input: followUpInputs,
        previous_response_id: response.id,
        max_output_tokens: plan.maxOutputTokens,
        truncation: 'auto',
      };

      response = await client.responses.create(followUpParams);

      recordResponseUsage(response.usage);
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
    const text = response.output_text?.trim();
    if (!text) {
      return null;
    }
    try {
      const candidate = JSON.parse(text);
      const report = QaReportSchema.parse(candidate);
      if (!report.findings.length && findings.length) {
        report.findings = findings;
      }
      return report;
    } catch (error) {
      this.logger.warn(`Failed to parse structured QAReport: ${(error as Error).message}`);
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
  }
}
