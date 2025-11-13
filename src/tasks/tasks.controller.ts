import { Controller, Get } from '@nestjs/common';

import { TaskRegistryService } from './task-registry.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly taskRegistry: TaskRegistryService) {}

  @Get()
  listTasks() {
    return this.taskRegistry.list();
  }
}
