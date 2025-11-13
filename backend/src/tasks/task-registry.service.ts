import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import type { TaskSpec } from '../models/contracts';

interface CreateTaskOptions
  extends Omit<TaskSpec, 'id'> {
  id?: string;
}

@Injectable()
export class TaskRegistryService {
  private readonly tasks = new Map<string, TaskSpec>();

  constructor() {
    this.registerTask({
      id: 'dashboard-sanity',
      goal:
        'Verify dashboard KPI cards and charts match the KPI oracle for today and last 7 days ranges.',
      route: '/dashboard',
      role: 'analyst',
      kpiSpec: {
        type: 'apiEndpoint',
        url: '/api/kpi',
        method: 'GET',
        params: { ranges: ['today', 'last7days'] },
      },
      budgets: {
        maxToolCalls: 200,
        maxTimeMs: 180_000,
        maxScreenshots: 25,
      },
    });
  }

  list(): TaskSpec[] {
    return [...this.tasks.values()];
  }

  get(taskId: string): TaskSpec | undefined {
    return this.tasks.get(taskId);
  }

  registerTask(taskDefinition: CreateTaskOptions): TaskSpec {
    const persistedTask: TaskSpec = {
      ...taskDefinition,
      id: taskDefinition.id ?? uuidv4(),
    };

    this.tasks.set(persistedTask.id, persistedTask);
    return persistedTask;
  }
}
