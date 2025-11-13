import { Injectable } from '@nestjs/common';

import type { AiProvider } from '../models/run';
import { AnthropicProviderService } from './anthropic-provider.service';
import { OpenAiProviderService } from './openai-provider.service';

@Injectable()
export class AiProviderRegistryService {
  constructor(
    private readonly openAiProvider: OpenAiProviderService,
    private readonly anthropicProvider: AnthropicProviderService,
  ) {}

  resolve(provider: AiProvider): OpenAiProviderService | AnthropicProviderService {
    if (provider === 'openai') {
      return this.openAiProvider;
    }

    return this.anthropicProvider;
  }
}
