import { Module } from '@nestjs/common';

import { WorkerModule } from '../worker/worker.module';
import { RunEventsModule } from '../orchestrator/run-events.module';
import { AnthropicProviderService } from './anthropic-provider.service';
import { AnthropicComputerUseService } from './anthropic-computer-use.service';
import { AiProviderRegistryService } from './ai-provider-registry.service';
import { OpenAiProviderService } from './openai-provider.service';
import { OpenAiComputerUseService } from './openai-computer-use.service';
import { SchemaService } from './schema.service';
import { ComputerUseOrchestratorService } from './computer-use-orchestrator.service';

@Module({
  imports: [WorkerModule, RunEventsModule],
  providers: [
    SchemaService,
    OpenAiProviderService,
    OpenAiComputerUseService,
    AnthropicProviderService,
    AnthropicComputerUseService,
    ComputerUseOrchestratorService,
    AiProviderRegistryService,
  ],
  exports: [
    SchemaService,
    OpenAiProviderService,
    OpenAiComputerUseService,
    AnthropicProviderService,
    AnthropicComputerUseService,
    ComputerUseOrchestratorService,
    AiProviderRegistryService,
  ],
})
export class ProvidersModule {}
