import { Module } from '@nestjs/common';

import { ProvidersModule } from '../providers/providers.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkerModule } from '../worker/worker.module';
import { ArtifactsController } from './artifacts.controller';
import { OrchestratorService } from './orchestrator.service';
import { RunExecutionService } from './run-execution.service';
import { RunsController } from './runs.controller';

@Module({
  imports: [ProvidersModule, TasksModule, WorkerModule],
  controllers: [RunsController, ArtifactsController],
  providers: [OrchestratorService, RunExecutionService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
