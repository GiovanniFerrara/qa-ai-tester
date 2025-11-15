import { Module } from '@nestjs/common';

import { ProvidersModule } from '../providers/providers.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkerModule } from '../worker/worker.module';
import { ArtifactsController } from './artifacts.controller';
import { RunEventsModule } from './run-events.module';
import { RunStorageService } from './run-storage.service';
import { RunEventsController } from './run-events.controller';
import { OrchestratorService } from './orchestrator.service';
import { RunExecutionService } from './run-execution.service';
import { RunsController } from './runs.controller';

@Module({
  imports: [ProvidersModule, TasksModule, WorkerModule, RunEventsModule],
  controllers: [RunsController, ArtifactsController, RunEventsController],
  providers: [RunStorageService, OrchestratorService, RunExecutionService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
