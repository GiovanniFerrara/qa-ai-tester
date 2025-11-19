import { Injectable } from '@nestjs/common';

import type { TaskSpec } from '../models/contracts';
import type { BrowserRunHandle } from '../worker/worker-gateway.service';
import { AnthropicComputerUseService } from './anthropic-computer-use.service';
import { OpenAiComputerUseService, type ComputerUseSessionResult } from './openai-computer-use.service';
import { RunEventsService } from '../orchestrator/run-events.service';
import { GeminiComputerUseService } from './gemini-computer-use.service';

export interface ComputerUseOptions {
  provider: 'openai' | 'anthropic' | 'gemini';
  runId: string;
  task: TaskSpec;
  handle: BrowserRunHandle;
  initialScreenshotPath: string;
  startedAt: Date;
  abortSignal?: AbortSignal;
}

@Injectable()
export class ComputerUseOrchestratorService {
  constructor(
    private readonly openAiComputerUseService: OpenAiComputerUseService,
    private readonly anthropicComputerUseService: AnthropicComputerUseService,
    private readonly geminiComputerUseService: GeminiComputerUseService,
    private readonly runEventsService: RunEventsService,
  ) {}

  async run(options: ComputerUseOptions): Promise<ComputerUseSessionResult> {
    if (options.provider === 'openai') {
      return this.openAiComputerUseService.run({
        runId: options.runId,
        task: options.task,
        handle: options.handle,
        initialScreenshotPath: options.initialScreenshotPath,
        startedAt: options.startedAt,
        events: this.runEventsService,
        abortSignal: options.abortSignal,
      });
    }

    if (options.provider === 'anthropic') {
      return this.anthropicComputerUseService.run({
        runId: options.runId,
        task: options.task,
        handle: options.handle,
        initialScreenshotPath: options.initialScreenshotPath,
        startedAt: options.startedAt,
        events: this.runEventsService,
        abortSignal: options.abortSignal,
      });
    }

    if (options.provider === 'gemini') {
      return this.geminiComputerUseService.run({
        runId: options.runId,
        task: options.task,
        handle: options.handle,
        initialScreenshotPath: options.initialScreenshotPath,
        startedAt: options.startedAt,
        events: this.runEventsService,
        abortSignal: options.abortSignal,
      });
    }

    throw new Error(`Provider ${options.provider} is not supported at the moment.`);
  }
}
