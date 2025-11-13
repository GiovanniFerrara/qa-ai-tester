import { Module } from '@nestjs/common';

import { ProvidersModule } from '../providers/providers.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkerModule } from '../worker/worker.module';
import { KpiOracleService } from '../services/kpi-oracle.service';
import { OrchestratorService } from './orchestrator.service';
import { RunExecutionService } from './run-execution.service';
import { RunsController } from './runs.controller';

@Module({
  imports: [ProvidersModule, TasksModule, WorkerModule],
  controllers: [RunsController],
  providers: [OrchestratorService, RunExecutionService, KpiOracleService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
