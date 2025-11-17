import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ProvidersModule } from '../providers/providers.module';
import { TaskContextualizerService } from './task-contextualizer.service';
import { TaskRegistryService } from './task-registry.service';
import { TaskStorageService } from './task-storage.service';
import { TaskTranscriptionService } from './task-transcription.service';
import { TasksController } from './tasks.controller';
import { QuickTasksController } from './quick-tasks.controller';
import { TaskCollectionStorageService } from './task-collection-storage.service';
import { TaskCollectionsService } from './task-collections.service';

@Module({
  imports: [ConfigModule, ProvidersModule],
  providers: [
    TaskStorageService,
    TaskRegistryService,
    TaskContextualizerService,
    TaskTranscriptionService,
    TaskCollectionStorageService,
    TaskCollectionsService,
  ],
  controllers: [TasksController, QuickTasksController],
  exports: [TaskRegistryService, TaskCollectionsService],
})
export class TasksModule {}
