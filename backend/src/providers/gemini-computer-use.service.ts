import { Injectable, Logger } from '@nestjs/common';
import { FunctionCallingConfigMode, type Content, type FunctionCall } from '@google/genai';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import {
  AssertToolRequestSchema,
  DomSnapshotRequestSchema,
  QaReportSchema,
  type Finding,
  type QaReport,
} from '../models/contracts';
import type { TaskSpec } from '../models/contracts';
import type { BrowserRunHandle } from '../worker/worker-gateway.service';
import { WorkerGatewayService } from '../worker/worker-gateway.service';
import { GeminiProviderService } from './gemini-provider.service';
import type { ComputerUseSessionResult } from './openai-computer-use.service';
import type { RunEvent, RunEventsService } from '../orchestrator/run-events.service';
import { RunCancelledError } from '../orchestrator/run-errors';

interface GeminiComputerUseOptions {
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
  type: 'computer' | 'function';
  tool: string;
  callId: string;
  input: unknown;
  output?: unknown;
  timestamp: string;
}

type FunctionCallOutcome =
  | {
      kind: 'response';
      content: Content;
      event?: Omit<ComputerUseEvent, 'step' | 'timestamp'> &
        Partial<Pick<ComputerUseEvent, 'timestamp'>>;
      updatedUrl?: string;
      toolIncrement?: number;
    }
  | {
      kind: 'report';
      report: QaReport;
    };

@Injectable()
export class GeminiComputerUseService {
  private readonly logger = new Logger(GeminiComputerUseService.name);

  constructor(
    private readonly provider: GeminiProviderService,
    private readonly workerGateway: WorkerGatewayService,
  ) {}

  async run(options: GeminiComputerUseOptions): Promise<ComputerUseSessionResult> {
    const { runId, task, handle } = options;
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
    const initialScreenshotMime = this.getImageMimeTypeFromPath(options.initialScreenshotPath);
    const initialScreenshotName = path.basename(options.initialScreenshotPath);

    const history: Content[] = [
      {
        role: 'user',
        parts: [
          { text: plan.userPrompt },
          {
            inlineData: {
              mimeType: initialScreenshotMime,
              data: initialScreenshotBase64,
            },
          },
          {
            text: `Initial screenshot saved as ${initialScreenshotName}. Reference filenames exactly when citing evidence.`,
          },
        ],
      },
    ];

    const usageTotals = {
      tokensInput: 0,
      tokensOutput: 0,
      totalTokens: 0,
    };
    const events: ComputerUseEvent[] = [];
    const responsesSummary: Array<Record<string, unknown>> = [];
    const findingsFromTool: Finding[] = [];
    const maxIterations = task.budgets?.maxToolCalls ?? 200;
    let iterations = 0;
    let totalToolCalls = 0;
    let promptedForReport = false;
    let lastKnownUrl = await handle.page.url();
    let artifactsWritten = false;
    const persistArtifacts = async (): Promise<void> => {
      await this.writeSessionArtifacts(handle.artifactDir, events, responsesSummary);
      artifactsWritten = true;
    };

    try {
      while (iterations < maxIterations) {
        ensureNotCancelled();
        iterations += 1;
        const response = await client.models.generateContent({
          model: plan.model,
          contents: history,
          config: {
            maxOutputTokens: plan.maxOutputTokens,
            systemInstruction: plan.systemPrompt,
            tools: plan.tools,
            toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
          },
        });
        this.logger.debug(
          [
            `Gemini response metadata (iteration ${iterations})`,
            `responseId=${response.responseId ?? 'n/a'}`,
            `promptFeedback=${JSON.stringify(response.promptFeedback ?? null)}`,
            `usage=${JSON.stringify(response.usageMetadata ?? null)}`,
          ].join(' | '),
        );
        this.recordUsageTotals(usageTotals, response);
        responsesSummary.push({
          id: response.responseId ?? `iteration-${iterations}`,
          usage: response.usageMetadata ?? null,
          functionCalls: response.functionCalls ?? [],
          textPreview: response.text?.slice(0, 200),
          timestamp: new Date().toISOString(),
        });
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason === 'MALFORMED_FUNCTION_CALL') {
          this.logger.warn(
            `Gemini produced a malformed function call. Retrying... (iteration ${iterations})`,
          );
          history.push({
            role: 'user',
            parts: [{ text: 'The previous function call was malformed. Please try again.' }],
          });
          continue;
        }

        if (!candidate?.content) {
          this.logger.error(
            `Gemini response missing content. promptFeedback=${JSON.stringify(response.promptFeedback ?? null)} fullResponse=${JSON.stringify(response)}`,
          );
          throw new Error('Gemini response did not include any content.');
        }
        const modelContent = candidate.content;
        history.push(modelContent);

        // DEBUG LOGGING
        this.logger.debug(
          `Gemini response (iteration ${iterations}): ${JSON.stringify(modelContent)}`,
        );

        const functionCalls =
          modelContent.parts
            ?.map((part) => part.functionCall)
            .filter((call): call is FunctionCall => Boolean(call?.name)) ?? [];
        if (functionCalls.length > 0) {
          this.logger.debug(`Processing ${functionCalls.length} function call(s) from Gemini.`);
          for (const call of functionCalls) {
            ensureNotCancelled();
            this.logger.debug(
              `Handling function call: "${call.name}" with args: ${JSON.stringify(call.args ?? {})}`,
            );
            const outcome = await this.handleFunctionCall({
              call,
              runId,
              task,
              handle,
              findingsFromTool,
              emitEvent,
              lastKnownUrl,
              initialScreenshotPath: options.initialScreenshotPath,
              startedAt: options.startedAt,
            });
            if (outcome.kind === 'report') {
              emitEvent({
                type: 'status',
                message: `Gemini provided qa_report_submit with status ${outcome.report.status}`,
                payload: { report: outcome.report },
              });
              await persistArtifacts();
              return {
                report: outcome.report,
                eventsPath: path.join(handle.artifactDir, 'computer-use-events.json'),
                responsesPath: path.join(handle.artifactDir, 'model-responses.jsonl'),
                usageTotals,
                totalToolCalls,
                model: plan.model,
              };
            }
            history.push(outcome.content);
            if (outcome.event) {
              events.push({
                ...outcome.event,
                step: events.length + 1,
                timestamp: outcome.event.timestamp ?? new Date().toISOString(),
              });
            }
            totalToolCalls += outcome.toolIncrement ?? 1;
            if (outcome.updatedUrl) {
              lastKnownUrl = outcome.updatedUrl;
            }
          }
          continue;
        }
        const maybeReport = this.tryExtractReportFromText(modelContent, findingsFromTool, options);
        if (maybeReport) {
          emitEvent({
            type: 'status',
            message: `Structured QAReport parsed with status ${maybeReport.status}`,
            payload: { report: maybeReport },
          });
          await persistArtifacts();
          return {
            report: maybeReport,
            eventsPath: path.join(handle.artifactDir, 'computer-use-events.json'),
            responsesPath: path.join(handle.artifactDir, 'model-responses.jsonl'),
            usageTotals,
            totalToolCalls,
            model: plan.model,
          };
        }
        if (!promptedForReport) {
          promptedForReport = true;
          const reminderContent: Content = {
            role: 'user',
            parts: [
              {
                text: 'Please respond with ONLY the QAReport JSON object (matching the shared schema) when you are ready to conclude.',
              },
            ],
          };
          history.push(reminderContent);
          emitEvent({ type: 'log', message: 'Prompted Gemini for structured QAReport JSON.' });
          continue;
        }
        throw new Error('Gemini did not return a QAReport after prompting.');
      }
      throw new Error(`Exceeded maximum iteration limit (${maxIterations}) without completion.`);
    } catch (error) {
      this.logger.error(
        `Gemini computer-use session aborted: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    } finally {
      if (!artifactsWritten) {
        await persistArtifacts().catch((artifactError: unknown) => {
          this.logger.error(
            `Failed to persist Gemini artifacts: ${(artifactError as Error).message}`,
          );
        });
      }
    }
  }
  private async handleFunctionCall(params: {
    call: FunctionCall;
    runId: string;
    task: TaskSpec;
    handle: BrowserRunHandle;
    findingsFromTool: Finding[];
    emitEvent: (event: Omit<RunEvent, 'timestamp'> & Partial<Pick<RunEvent, 'timestamp'>>) => void;
    lastKnownUrl: string;
    initialScreenshotPath: string;
    startedAt: Date;
  }): Promise<FunctionCallOutcome> {
    const { call } = params;
    const name = call.name ?? '';
    this.logger.debug(`Handling function call: "${name}" with args: ${JSON.stringify(call.args)}`);

    if (name === 'dom_snapshot') {
      return this.handleDomSnapshotCall(params);
    }
    if (name === 'assert') {
      return this.handleAssertCall(params);
    }
    if (name === 'qa_report_submit') {
      return this.handleQaReportSubmitCall(params);
    }
    return this.handleComputerActionCall(params);
  }

  private async handleDomSnapshotCall(params: {
    call: FunctionCall;
    handle: BrowserRunHandle;
    emitEvent: (event: Omit<RunEvent, 'timestamp'> & Partial<Pick<RunEvent, 'timestamp'>>) => void;
  }): Promise<FunctionCallOutcome> {
    const { call, handle, emitEvent } = params;
    const parsed = DomSnapshotRequestSchema.safeParse(call.args ?? {});
    const currentUrl = await handle.page.url();
    if (!parsed.success) {
      this.logger.warn(`Invalid dom_snapshot payload: ${parsed.error.message}`);
      return {
        kind: 'response',
        content: {
          role: 'user',
          parts: [
            {
              functionResponse: {
                id: call.id,
                name: 'dom_snapshot',
                response: { error: parsed.error.message, url: currentUrl },
              },
            },
          ],
        },
      };
    }
    const snapshot = await this.workerGateway.getDomSnapshot(handle, parsed.data);
    emitEvent({
      type: 'tool_call',
      message: 'dom_snapshot executed',
      payload: {
        selector: parsed.data.selector,
        mode: parsed.data.mode,
        elements: snapshot.elements.length,
      },
    });
    return {
      kind: 'response',
      content: {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: call.id,
              name: 'dom_snapshot',
              response: { ...snapshot, url: currentUrl },
            },
          },
        ],
      },
      event: {
        type: 'function',
        tool: 'dom_snapshot',
        callId: call.id ?? `dom_snapshot-${Date.now()}`,
        input: parsed.data,
        output: snapshot,
      },
    };
  }

  private async handleAssertCall(params: {
    call: FunctionCall;
    handle: BrowserRunHandle;
    findingsFromTool: Finding[];
    emitEvent: (event: Omit<RunEvent, 'timestamp'> & Partial<Pick<RunEvent, 'timestamp'>>) => void;
  }): Promise<FunctionCallOutcome> {
    const { call, handle, findingsFromTool, emitEvent } = params;
    const parsed = AssertToolRequestSchema.safeParse(call.args ?? {});
    const currentUrl = await handle.page.url();
    if (!parsed.success) {
      this.logger.warn(`Invalid assert payload: ${parsed.error.message}`);
      return {
        kind: 'response',
        content: {
          role: 'user',
          parts: [
            {
              functionResponse: {
                id: call.id,
                name: 'assert',
                response: { error: parsed.error.message, url: currentUrl },
              },
            },
          ],
        },
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

    emitEvent({
      type: 'tool_call',
      message: `assert recorded (${parsed.data.severity})`,
      payload: { assertionId, assertion: parsed.data.assertion },
    });

    return {
      kind: 'response',
      content: {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: call.id,
              name: 'assert',
              response: { assertionId, url: currentUrl },
            },
          },
        ],
      },
      event: {
        type: 'function',
        tool: 'assert',
        callId: call.id ?? `assert-${Date.now()}`,
        input: parsed.data,
        output: { assertionId },
      },
    };
  }

  private async handleQaReportSubmitCall(params: {
    call: FunctionCall;
    task: TaskSpec;
    findingsFromTool: Finding[];
    initialScreenshotPath: string;
    startedAt: Date;
    runId: string;
  }): Promise<FunctionCallOutcome> {
    const { call, task, findingsFromTool, initialScreenshotPath, startedAt, runId } = params;
    const payload = (call.args as Record<string, unknown>) ?? {};
    const candidatePayload = payload.report ?? payload.qaReport ?? payload;
    const report = this.buildReportFromPayload(candidatePayload, {
      runId,
      task,
      startedAt,
      initialScreenshotPath,
    });
    if (!report.findings.length && findingsFromTool.length) {
      report.findings = findingsFromTool;
    }
    if (task.requireFindings && report.findings.length === 0) {
      report.findings = [
        this.buildDefaultFinding(
          { initialScreenshotPath, startedAt },
          'The AI session completed without explicit findings.',
        ),
      ];
    }

    return {
      kind: 'report',
      report,
    };
  }

  private async handleComputerActionCall(params: {
    call: FunctionCall;
    handle: BrowserRunHandle;
    emitEvent: (event: Omit<RunEvent, 'timestamp'> & Partial<Pick<RunEvent, 'timestamp'>>) => void;
    lastKnownUrl: string;
  }): Promise<FunctionCallOutcome> {
    const { call, handle, emitEvent, lastKnownUrl } = params;
    const actionName = (call.name ?? '').toLowerCase();
    const waitSecondsMatch = actionName.match(/^wait_(\d+)_seconds$/);
    let updatedUrl = lastKnownUrl;
    let screenshotResult: Awaited<
      ReturnType<WorkerGatewayService['performComputerAction']>
    > | null = null;

    const emitScreenshotEvent = (label: string): void => {
      if (!screenshotResult) {
        return;
      }
      emitEvent({
        type: 'screenshot',
        message: label,
        payload: {
          callId: call.id,
          image: `data:${screenshotResult.mimeType};base64,${screenshotResult.screenshot}`,
          viewport: screenshotResult.viewport,
          screenshotName: path.basename(screenshotResult.screenshotPath),
        },
      });
    };

    try {
      switch (actionName) {
        case 'open_web_browser':
          screenshotResult = await this.workerGateway.performComputerAction(handle, {
            action: 'screenshot',
          });
          updatedUrl = await handle.page.url();
          break;
        case 'navigate': {
          const targetUrl = this.extractStringArg(call.args, ['url', 'target', 'destination']);
          if (!targetUrl) {
            throw new Error('navigate call missing url argument.');
          }
          try {
            const resolvedUrl = new URL(targetUrl, lastKnownUrl).toString();
            await handle.page.goto(resolvedUrl, { waitUntil: 'networkidle' });
            updatedUrl = resolvedUrl;
          } catch (err) {
            // Fallback if URL construction fails (e.g. lastKnownUrl invalid) or navigation fails
            this.logger.warn(`Navigation failed for ${targetUrl}: ${(err as Error).message}`);
            throw err;
          }
          screenshotResult = await this.workerGateway.performComputerAction(handle, {
            action: 'screenshot',
          });
          break;
        }
        case 'click':
        case 'click_at':
        case 'left_click_at':
        case 'double_click':
        case 'double_click_at':
        case 'right_click':
        case 'right_click_at':
        case 'move_cursor': {
          const coords = this.extractNormalizedCoordinates(call.args, handle);
          if (!coords) {
            throw new Error(`${actionName} call missing coordinates.`);
          }
          const actionMap: Record<string, 'click' | 'double_click' | 'right_click' | 'move'> = {
            click: 'click',
            click_at: 'click',
            left_click_at: 'click',
            double_click: 'double_click',
            double_click_at: 'double_click',
            right_click: 'right_click',
            right_click_at: 'right_click',
            move_cursor: 'move',
          };
          screenshotResult = await this.workerGateway.performComputerAction(handle, {
            action: actionMap[actionName],
            coords,
          });
          updatedUrl = await handle.page.url();
          break;
        }
        case 'type_text': {
          const text = this.extractStringArg(call.args, ['text', 'value', 'input']);
          if (!text) {
            throw new Error('type_text call missing text.');
          }
          screenshotResult = await this.workerGateway.performComputerAction(handle, {
            action: 'type',
            text,
          });
          updatedUrl = await handle.page.url();
          break;
        }
        case 'key_press': {
          const keysArg =
            (Array.isArray((call.args as { keys?: unknown }).keys)
              ? ((call.args as { keys?: string[] }).keys ?? [])
              : []) || [];
          const singleKey = this.extractStringArg(call.args, ['key', 'combo']) ?? keysArg.join('+');
          const keys = singleKey ? [singleKey] : keysArg;
          if (!keys.length) {
            throw new Error('key_press call missing key(s).');
          }
          if (keys.length === 1) {
            screenshotResult = await this.workerGateway.performComputerAction(handle, {
              action: 'keypress',
              keys,
            });
          } else {
            screenshotResult = await this.workerGateway.performComputerAction(handle, {
              action: 'hotkey',
              hotkey: keys.join('+'),
            });
          }
          updatedUrl = await handle.page.url();
          break;
        }
        case 'scroll': {
          const direction = this.extractStringArg(call.args, ['direction']) ?? 'down';
          const amount = Number((call.args as { pixels?: unknown }).pixels ?? 400);
          const deltaMap: Record<string, { deltaX: number; deltaY: number }> = {
            up: { deltaX: 0, deltaY: -Math.abs(amount) },
            down: { deltaX: 0, deltaY: Math.abs(amount) },
            left: { deltaX: -Math.abs(amount), deltaY: 0 },
            right: { deltaX: Math.abs(amount), deltaY: 0 },
          };
          const deltas = deltaMap[direction.toLowerCase()] ?? deltaMap.down;
          screenshotResult = await this.workerGateway.performComputerAction(handle, {
            action: 'scroll',
            scroll: {
              deltaX: deltas.deltaX,
              deltaY: deltas.deltaY,
            },
          });
          updatedUrl = await handle.page.url();
          break;
        }
        case 'wait': {
          const ms = Number((call.args as { milliseconds?: unknown }).milliseconds ?? 1000);
          screenshotResult = await this.workerGateway.performComputerAction(handle, {
            action: 'wait',
            wait: {
              type: 'ms',
              value: ms,
            },
          });
          break;
        }
        case 'key_combination': {
          const combo =
            this.extractStringArg(call.args, ['combo', 'keys', 'key']) ??
            this.joinKeysArray(call.args);
          if (!combo) {
            throw new Error('key_combination call missing combo.');
          }
          screenshotResult = await this.workerGateway.performComputerAction(handle, {
            action: 'hotkey',
            hotkey: combo,
          });
          updatedUrl = await handle.page.url();
          break;
        }
        case 'screenshot':
          screenshotResult = await this.workerGateway.performComputerAction(handle, {
            action: 'screenshot',
          });
          updatedUrl = await handle.page.url();
          break;
        default:
          if (waitSecondsMatch) {
            const seconds = Number(waitSecondsMatch[1]);
            screenshotResult = await this.workerGateway.performComputerAction(handle, {
              action: 'wait',
              wait: {
                type: 'ms',
                value: Number.isNaN(seconds) ? 1000 : seconds * 1000,
              },
            });
            break;
          }
          this.logger.warn(`Unhandled Gemini computer action "${actionName}"`);
          {
            const fallbackUrl = lastKnownUrl || (await handle.page.url());
            return {
              kind: 'response',
              updatedUrl: fallbackUrl,
              content: {
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      id: call.id,
                      name: call.name ?? 'computer',
                      response: {
                        error: `Action "${call.name}" is not supported by the orchestrator.`,
                        url: fallbackUrl,
                      },
                    },
                  },
                ],
              },
            };
          }
      }
    } catch (error) {
      this.logger.error(
        `Failed to execute computer action "${call.name}": ${(error as Error).message}`,
      );
      const fallbackUrl = updatedUrl || lastKnownUrl || (await handle.page.url());
      return {
        kind: 'response',
        updatedUrl: fallbackUrl,
        content: {
          role: 'user',
          parts: [
            {
              functionResponse: {
                id: call.id,
                name: call.name ?? 'computer',
                response: {
                  error: (error as Error).message,
                  url: fallbackUrl,
                },
              },
            },
          ],
        },
      };
    }

    if (!screenshotResult) {
      throw new Error(`Action "${call.name}" did not produce a screenshot result.`);
    }

    emitEvent({
      type: 'tool_call',
      message: `Computer action ${call.name}`,
      payload: {
        callId: call.id,
        args: call.args,
        viewport: screenshotResult.viewport,
      },
    });
    emitScreenshotEvent(`Screenshot after ${call.name}`);

    return {
      kind: 'response',
      updatedUrl,
      content: {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: call.id,
              name: call.name ?? 'computer',
              response: {
                url: updatedUrl,
                viewport: screenshotResult.viewport,
                screenshot: path.basename(screenshotResult.screenshotPath),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                safety_decision: (call.args as any)?.safety_decision,
              },
            },
          },
          {
            inlineData: {
              mimeType: screenshotResult.mimeType,
              data: screenshotResult.screenshot,
            },
          },
        ],
      },
      event: {
        type: 'computer',
        tool: call.name ?? 'computer',
        callId: call.id ?? `computer-${Date.now()}`,
        input: call.args ?? {},
        output: {
          viewport: screenshotResult.viewport,
          screenshotPath: screenshotResult.screenshotPath,
          url: updatedUrl,
        },
      },
    };
  }

  private tryExtractReportFromText(
    content: Content,
    findingsFromTool: Finding[],
    options: GeminiComputerUseOptions,
  ): QaReport | null {
    const textParts = content.parts?.map((part) => part.text ?? '').join('\n') ?? '';
    if (!textParts.trim()) {
      return null;
    }
    const parsed = this.extractJsonObject(textParts);
    if (!parsed) {
      this.logger.warn(
        `Failed to parse QAReport JSON from Gemini text: "${textParts.slice(0, 160)}...". Full text available in logs.`,
      );
      this.logger.debug(`Full failed QAReport text: ${textParts}`);
      return null;
    }

    try {
      const reportCandidate = QaReportSchema.parse(parsed);
      if (!reportCandidate.findings.length && findingsFromTool.length) {
        reportCandidate.findings = findingsFromTool;
      }
      if (options.task.requireFindings && reportCandidate.findings.length === 0) {
        reportCandidate.findings = [
          this.buildDefaultFinding(
            {
              initialScreenshotPath: options.initialScreenshotPath,
              startedAt: options.startedAt,
            },
            'The AI session completed without returning explicit findings.',
          ),
        ];
      }
      return reportCandidate;
    } catch (error) {
      this.logger.warn(
        `Failed to validate QAReport JSON from Gemini response: ${(error as Error).message}. Payload was: ${JSON.stringify(parsed)}`,
      );
      return null;
    }
  }

  private recordUsageTotals(
    usageTotals: { tokensInput: number; tokensOutput: number; totalTokens: number },
    response: {
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    },
  ): void {
    const usage = response.usageMetadata;
    if (!usage) {
      return;
    }
    usageTotals.tokensInput += usage.promptTokenCount ?? 0;
    usageTotals.tokensOutput += usage.candidatesTokenCount ?? 0;
    usageTotals.totalTokens += usage.totalTokenCount ?? 0;
  }

  private buildDefaultFinding(
    context: { initialScreenshotPath: string; startedAt: Date },
    message: string,
  ): Finding {
    return {
      id: uuidv4(),
      severity: 'info',
      category: 'functional',
      assertion: 'AI session summary',
      expected: 'At least one concrete finding should be recorded.',
      observed: message,
      tolerance: null,
      evidence: [
        {
          screenshotRef: context.initialScreenshotPath,
          selector: null,
          time: context.startedAt.toISOString(),
          networkRequestId: null,
        },
      ],
      suggestedFix: 'Review the run transcript for more details.',
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

    const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
    let match: RegExpExecArray | null;
    while ((match = fenceRegex.exec(trimmed)) !== null) {
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
      `Gemini computer-use artifacts persisted to ${artifactDir} (events=${events.length}, responses=${responses.length})`,
    );
  }

  private buildReportFromPayload(
    payload: unknown,
    context: { runId: string; task: TaskSpec; startedAt: Date; initialScreenshotPath: string },
  ): QaReport {
    const raw =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const startedAtIso =
      this.coerceIsoString(raw.startedAt) ?? context.startedAt.toISOString();
    const finishedAtIso =
      this.coerceIsoString(raw.finishedAt) ?? new Date().toISOString();

    const normalizedFindings = Array.isArray(raw.findings)
      ? (raw.findings as unknown[])
          .map((item, index) =>
            this.normalizeFinding(item, {
              defaultScreenshot: context.initialScreenshotPath,
              defaultTimestamp: finishedAtIso,
              fallbackLabel: `Finding ${index + 1}`,
            }),
          )
          .filter((finding): finding is Finding => Boolean(finding))
      : [];

    const linksInput =
      raw.links && typeof raw.links === 'object'
        ? (raw.links as Record<string, unknown>)
        : {};
    const costsInput =
      raw.costs && typeof raw.costs === 'object'
        ? (raw.costs as Record<string, unknown>)
        : {};

    const normalizedReport = {
      id: this.coerceString(raw.id) ?? uuidv4(),
      runId: context.runId,
      taskId: context.task.id,
      startedAt: startedAtIso,
      finishedAt: finishedAtIso,
      summary: this.coerceString(raw.summary) ?? 'Gemini QA report summary unavailable.',
      status: this.isValidStatus(this.coerceString(raw.status))
        ? (this.coerceString(raw.status) as QaReport['status'])
        : 'inconclusive',
      findings: normalizedFindings,
      links: {
        traceUrl: this.coerceString(linksInput.traceUrl) ?? null,
        screenshotsGalleryUrl: this.coerceString(linksInput.screenshotsGalleryUrl) ?? null,
        rawTranscriptUrl: this.coerceString(linksInput.rawTranscriptUrl) ?? null,
      },
      costs: {
        tokensInput: this.coerceNumber(costsInput.tokensInput) ?? 0,
        tokensOutput: this.coerceNumber(costsInput.tokensOutput) ?? 0,
        toolCalls: this.coerceNumber(costsInput.toolCalls) ?? 0,
        durationMs: this.coerceNumber(costsInput.durationMs) ?? 0,
        priceUsd: this.coerceNumber(costsInput.priceUsd) ?? 0,
      },
    };

    const parsed = QaReportSchema.safeParse(normalizedReport);
    if (!parsed.success) {
      this.logger.warn(
        `Failed to normalize Gemini qa_report_submit payload: ${parsed.error.message}`,
      );
      throw new Error(`qa_report_submit payload invalid: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  private normalizeFinding(
    input: unknown,
    context: { defaultScreenshot: string; defaultTimestamp: string; fallbackLabel: string },
  ): Finding | null {
    if (!input || typeof input !== 'object') {
      return null;
    }
    const raw = input as Record<string, unknown>;
    const evidenceInput = Array.isArray(raw.evidence) ? raw.evidence : [];
    const normalizedEvidence =
      evidenceInput.length > 0
        ? evidenceInput
            .map((evidence) =>
              this.normalizeEvidence(
                evidence,
                context.defaultScreenshot,
                context.defaultTimestamp,
              ),
            )
            .filter((item): item is Finding['evidence'][number] => Boolean(item))
        : [
            {
              screenshotRef: context.defaultScreenshot,
              selector: null,
              time: context.defaultTimestamp,
              networkRequestId: null,
            },
          ];

    return {
      id: this.coerceString(raw.id) ?? uuidv4(),
      severity: this.isValidSeverity(this.coerceString(raw.severity))
        ? (this.coerceString(raw.severity) as Finding['severity'])
        : 'info',
      category: this.isValidCategory(this.coerceString(raw.category))
        ? (this.coerceString(raw.category) as Finding['category'])
        : 'functional',
      assertion: this.coerceString(raw.assertion) ?? context.fallbackLabel,
      expected: this.coerceString(raw.expected) ?? 'Not specified',
      observed: this.coerceString(raw.observed) ?? 'Not specified',
      tolerance: this.coerceString(raw.tolerance) ?? null,
      evidence: normalizedEvidence,
      suggestedFix: this.coerceString(raw.suggestedFix) ?? 'Review the observation.',
      confidence: this.coerceNumber(raw.confidence) ?? 0.5,
      dismissal:
        raw.dismissal && typeof raw.dismissal === 'object'
          ? this.normalizeDismissal(raw.dismissal as Record<string, unknown>)
          : undefined,
    };
  }

  private normalizeEvidence(
    input: unknown,
    screenshotFallback: string,
    timestampFallback: string,
  ): Finding['evidence'][number] | null {
    if (!input || typeof input !== 'object') {
      return null;
    }
    const raw = input as Record<string, unknown>;
    return {
      screenshotRef: this.coerceString(raw.screenshotRef) ?? screenshotFallback,
      selector:
        typeof raw.selector === 'string' || raw.selector === null ? raw.selector : null,
      time: this.coerceString(raw.time) ?? timestampFallback,
      networkRequestId:
        typeof raw.networkRequestId === 'string' || raw.networkRequestId === null
          ? raw.networkRequestId
          : null,
    };
  }

  private normalizeDismissal(raw: Record<string, unknown>): Finding['dismissal'] | undefined {
    const reasonValue = this.coerceString(raw.reason);
    const dismissedAt = this.coerceString(raw.dismissedAt);
    if (!reasonValue || !dismissedAt) {
      return undefined;
    }
    if (reasonValue !== 'false_positive' && reasonValue !== 'fixed') {
      return undefined;
    }
    return {
      reason: reasonValue,
      dismissedAt,
      dismissedBy: this.coerceString(raw.dismissedBy) ?? undefined,
    };
  }

  private isValidSeverity(value: string | null): value is Finding['severity'] {
    return Boolean(
      value &&
        ['blocker', 'critical', 'major', 'minor', 'info'].includes(value as string),
    );
  }

  private isValidCategory(value: string | null): value is Finding['category'] {
    return Boolean(
      value &&
        ['functional', 'data-consistency', 'performance', 'a11y', 'reliability'].includes(
          value as string,
        ),
    );
  }

  private isValidStatus(value: string | null): value is QaReport['status'] {
    return Boolean(value && ['passed', 'failed', 'inconclusive'].includes(value));
  }

  private coerceString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private coerceNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private coerceIsoString(value: unknown): string | null {
    if (typeof value === 'string' || value instanceof Date) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return null;
  }

  private extractStringArg(args: unknown, keys: string[]): string | null {
    if (!args || typeof args !== 'object') {
      return null;
    }
    for (const key of keys) {
      const value = (args as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  }

  private joinKeysArray(args: unknown): string | null {
    if (!args || typeof args !== 'object') {
      return null;
    }
    const rawKeys = (args as { keys?: unknown }).keys;
    if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
      return null;
    }
    return rawKeys
      .map((key) => (typeof key === 'string' ? key.trim() : ''))
      .filter((key) => key.length > 0)
      .join('+');
  }

  private extractNormalizedCoordinates(
    args: unknown,
    handle: BrowserRunHandle,
  ): { x: number; y: number } | null {
    if (!args || typeof args !== 'object') {
      return null;
    }
    const viewport = handle.page.viewportSize() ?? { width: 1366, height: 768 };
    const coordinate =
      (args as Record<string, unknown>).coordinate ??
      (args as Record<string, unknown>).coordinates ??
      args;
    if (!coordinate || typeof coordinate !== 'object') {
      return null;
    }
    const rawX = Number((coordinate as Record<string, unknown>).x);
    const rawY = Number((coordinate as Record<string, unknown>).y);
    if (Number.isNaN(rawX) || Number.isNaN(rawY)) {
      return null;
    }
    const clamp = (value: number) => Math.max(0, Math.min(999, value));
    return {
      x: Math.round((clamp(rawX) / 999) * viewport.width),
      y: Math.round((clamp(rawY) / 999) * viewport.height),
    };
  }

  private getImageMimeTypeFromPath(filePath: string): 'image/jpeg' | 'image/png' | 'image/webp' {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      return 'image/jpeg';
    }
    if (ext === '.webp') {
      return 'image/webp';
    }
    return 'image/png';
  }
}
