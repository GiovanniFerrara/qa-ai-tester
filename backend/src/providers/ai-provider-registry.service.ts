import { Injectable } from '@nestjs/common';

import type { AiProvider } from '../models/run';
import { AnthropicProviderService } from './anthropic-provider.service';
import { OpenAiProviderService } from './openai-provider.service';
import { GeminiProviderService } from './gemini-provider.service';

@Injectable()
export class AiProviderRegistryService {
  constructor(
    private readonly openAiProvider: OpenAiProviderService,
    private readonly anthropicProvider: AnthropicProviderService,
    private readonly geminiProvider: GeminiProviderService,
  ) {}

  resolve(
    provider: AiProvider,
  ): OpenAiProviderService | AnthropicProviderService | GeminiProviderService {
    if (provider === 'openai') {
      return this.openAiProvider;
    }

    if (provider === 'anthropic') {
      return this.anthropicProvider;
    }

    return this.geminiProvider;
  }
}
