import { Injectable, Logger } from '@nestjs/common';

import type { QaReport } from '../models/contracts';
import type { TaskSpec } from '../models/contracts';
import type { BrowserRunHandle } from '../worker/worker-gateway.service';

export interface AnthropicComputerUseOptions {
  runId: string;
  task: TaskSpec;
  handle: BrowserRunHandle;
  initialScreenshotPath: string;
  startedAt: Date;
}

export interface AnthropicComputerUseResult {
  report: QaReport;
}

@Injectable()
export class AnthropicComputerUseService {
  private readonly logger = new Logger(AnthropicComputerUseService.name);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(_options: AnthropicComputerUseOptions): Promise<AnthropicComputerUseResult> {
    this.logger.error('Anthropic computer use is not implemented yet.');
    throw new Error('Anthropic computer use is not implemented yet.');
  }
}
