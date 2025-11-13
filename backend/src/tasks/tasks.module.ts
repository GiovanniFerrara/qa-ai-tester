import { Module } from '@nestjs/common';

import { TaskRegistryService } from './task-registry.service';
import { TasksController } from './tasks.controller';

@Module({
  providers: [TaskRegistryService],
  controllers: [TasksController],
  exports: [TaskRegistryService],
})
export class TasksModule {}
