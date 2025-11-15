import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import type { TaskSpec } from '../models/contracts';
import { TaskStorageService } from './task-storage.service';

interface CreateTaskOptions
  extends Omit<TaskSpec, 'id'> {
  id?: string;
}

type UpdateTaskOptions = Partial<Omit<TaskSpec, 'id'>>;

@Injectable()
export class TaskRegistryService {
  private readonly tasks = new Map<string, TaskSpec>();

  constructor(private readonly storage: TaskStorageService) {
    const persisted = this.storage.loadTasks();
    if (persisted.length === 0) {
      this.seedDefaultTask();
    } else {
      for (const task of persisted) {
        this.tasks.set(task.id, {
          ...task,
          autoAuthEnabled: task.autoAuthEnabled ?? false,
        });
      }
    }
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
      kpiSpec: taskDefinition.kpiSpec ?? {
        type: 'staticValues',
        values: {},
      },
      budgets: taskDefinition.budgets ?? {
        maxToolCalls: 200,
        maxTimeMs: 180_000,
        maxScreenshots: 25,
      },
      autoAuthEnabled: taskDefinition.autoAuthEnabled ?? false,
    };

    this.tasks.set(persistedTask.id, persistedTask);
    this.persist();
    return persistedTask;
  }

  updateTask(taskId: string, updates: UpdateTaskOptions): TaskSpec {
    const existing = this.tasks.get(taskId);
    if (!existing) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const updated: TaskSpec = {
      ...existing,
      ...updates,
      id: taskId,
      kpiSpec: updates.kpiSpec ?? existing.kpiSpec,
      autoAuthEnabled:
        updates.autoAuthEnabled ?? existing.autoAuthEnabled ?? false,
      budgets: {
        maxToolCalls: updates.budgets?.maxToolCalls ?? existing.budgets.maxToolCalls,
        maxTimeMs: updates.budgets?.maxTimeMs ?? existing.budgets.maxTimeMs,
        maxScreenshots: updates.budgets?.maxScreenshots ?? existing.budgets.maxScreenshots,
      },
    };

    this.tasks.set(taskId, updated);
    this.persist();
    return updated;
  }

  removeTask(taskId: string): void {
    if (!this.tasks.delete(taskId)) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    this.persist();
  }

  private persist(): void {
    this.storage.saveTasks(this.list());
  }

  private seedDefaultTask(): void {
    this.registerTask({
      id: 'dashboard-sanity',
      name: 'Dashboard Sanity',
      description: 'Ensure the main dashboard renders successfully for an analyst user.',
      goal: 'Load the dashboard and confirm core widgets render without authentication prompts or errors.',
      instructions:
        'Take an initial screenshot and confirm presence of the welcome banner and inbox module. Record at least one finding summarizing the state.',
      route: '/dashboard',
      role: 'analyst',
      provider: 'openai',
      autoAuthEnabled: false,
      requireFindings: true,
      kpiSpec: {
        type: 'staticValues',
        values: {},
      },
      budgets: {
        maxToolCalls: 200,
        maxTimeMs: 180_000,
        maxScreenshots: 25,
      },
    });
  }
}
