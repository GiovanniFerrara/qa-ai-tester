import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TaskRegistryService } from './task-registry.service';
import { TaskStorageService } from './task-storage.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [ConfigModule],
  providers: [TaskStorageService, TaskRegistryService],
  controllers: [TasksController],
  exports: [TaskRegistryService],
})
export class TasksModule {}
