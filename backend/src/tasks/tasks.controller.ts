import { Body, Controller, Delete, Get, Param, Post, Put, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { TaskRegistryService } from './task-registry.service';

const BudgetsInputSchema = z
  .object({
    maxToolCalls: z.number().int().positive().optional(),
    maxTimeMs: z.number().int().positive().optional(),
    maxScreenshots: z.number().int().positive().optional(),
  })
  .partial();

const BaseTaskInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  goal: z.string().min(1),
  instructions: z.string().default(''),
  route: z.string().min(1),
  role: z.string().default('analyst'),
  provider: z.string().optional(),
  model: z.string().optional(),
  requireFindings: z.boolean().default(true),
  autoAuthEnabled: z.boolean().default(false),
  budgets: BudgetsInputSchema.optional(),
});

const CreateTaskSchema = BaseTaskInputSchema.extend({
  id: z.string().optional(),
});

const UpdateTaskSchema = BaseTaskInputSchema.partial();

type TaskInputBudgets = {
  maxToolCalls?: number;
  maxTimeMs?: number;
  maxScreenshots?: number;
};

@Controller('tasks')
export class TasksController {
  constructor(private readonly taskRegistry: TaskRegistryService) {}

  @Get()
  listTasks() {
    return this.taskRegistry.list();
  }

  @Get(':taskId')
  getTask(@Param('taskId') taskId: string) {
    const task = this.taskRegistry.get(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    return task;
  }

  @Post()
  createTask(@Body() body: unknown) {
    const parsed = CreateTaskSchema.parse(body);
    const task = this.taskRegistry.registerTask({
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      goal: parsed.goal,
      instructions: parsed.instructions,
      route: parsed.route,
      role: parsed.role,
      provider: parsed.provider,
      model: parsed.model,
      requireFindings: parsed.requireFindings,
      autoAuthEnabled: parsed.autoAuthEnabled,
      kpiSpec: {
        type: 'staticValues',
        values: {},
      },
      budgets: this.mergeBudgets(parsed.budgets),
    });
    return task;
  }

  @Put(':taskId')
  updateTask(@Param('taskId') taskId: string, @Body() body: unknown) {
    const parsed = UpdateTaskSchema.parse(body);
    const updated = this.taskRegistry.updateTask(taskId, {
      ...parsed,
      budgets: parsed.budgets ? this.mergeBudgets(parsed.budgets) : undefined,
    });
    return updated;
  }

  @Delete(':taskId')
  deleteTask(@Param('taskId') taskId: string) {
    this.taskRegistry.removeTask(taskId);
    return { success: true };
  }

  private mergeBudgets(partial?: TaskInputBudgets): { maxToolCalls: number; maxTimeMs: number; maxScreenshots: number } {
    return {
      maxToolCalls: partial?.maxToolCalls ?? 200,
      maxTimeMs: partial?.maxTimeMs ?? 180_000,
      maxScreenshots: partial?.maxScreenshots ?? 25,
    };
  }
}
