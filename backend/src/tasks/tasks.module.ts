import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ProvidersModule } from '../providers/providers.module';
import { TaskContextualizerService } from './task-contextualizer.service';
import { TaskRegistryService } from './task-registry.service';
import { TaskStorageService } from './task-storage.service';
import { TaskTranscriptionService } from './task-transcription.service';
import { TasksController } from './tasks.controller';
import { QuickTasksController } from './quick-tasks.controller';

@Module({
  imports: [ConfigModule, ProvidersModule],
  providers: [
    TaskStorageService,
    TaskRegistryService,
    TaskContextualizerService,
    TaskTranscriptionService,
  ],
  controllers: [TasksController, QuickTasksController],
  exports: [TaskRegistryService],
})
export class TasksModule {}
