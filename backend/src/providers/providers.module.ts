import { Module } from '@nestjs/common';

import { AnthropicProviderService } from './anthropic-provider.service';
import { AiProviderRegistryService } from './ai-provider-registry.service';
import { OpenAiProviderService } from './openai-provider.service';
import { SchemaService } from './schema.service';

@Module({
  providers: [SchemaService, OpenAiProviderService, AnthropicProviderService, AiProviderRegistryService],
  exports: [SchemaService, OpenAiProviderService, AnthropicProviderService, AiProviderRegistryService],
})
export class ProvidersModule {}
