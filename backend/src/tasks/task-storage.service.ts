import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { Prisma } from '@prisma/client';

import type { AppEnvironment } from '../config/environment';
import type { TaskSpec } from '../models/contracts';
import { DatabaseService } from '../storage/database.service';

type TaskRow = {
  id: string;
  name: string;
  description: string;
  goal: string;
  instructions: string;
  route: string;
  role: string;
  provider?: string | null;
  model?: string | null;
  requireFindings: boolean;
  autoAuthEnabled: boolean;
  budgets: Prisma.InputJsonValue;
};

@Injectable()
export class TaskStorageService {
  private readonly logger = new Logger(TaskStorageService.name);
  private readonly storagePath: string;
  private readonly useDatabase: boolean;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly database: DatabaseService,
  ) {
    const configuredPath =
      this.configService.get<string>('TASKS_DB_PATH', { infer: true }) ??
      path.join(process.cwd(), 'data', 'tasks.json');
    this.storagePath = path.resolve(configuredPath);
    this.useDatabase = this.database.isEnabled;
  }

  async loadTasks(): Promise<TaskSpec[]> {
    return this.useDatabase ? this.loadFromDatabase() : this.loadFromFile();
  }

  async saveTask(task: TaskSpec): Promise<void> {
    if (this.useDatabase) {
      await this.saveTaskToDatabase(task);
    } else {
      await this.saveTaskToFile(task);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    if (this.useDatabase) {
      await this.deleteTaskFromDatabase(taskId);
    } else {
      await this.deleteTaskFromFile(taskId);
    }
  }

  private async loadFromDatabase(): Promise<TaskSpec[]> {
    const client = await this.database.getClient();
    const rows = await client.task.findMany();
    return rows.map((row) => this.mapRowToTask(row as TaskRow));
  }

  private async saveTaskToDatabase(task: TaskSpec): Promise<void> {
    const client = await this.database.getClient();
    const payload = this.mapTaskToRow(task);
    await client.task.upsert({
      where: { id: task.id },
      create: payload,
      update: payload,
    });
  }

  private async deleteTaskFromDatabase(taskId: string): Promise<void> {
    const client = await this.database.getClient();
    await client.task
      .delete({
        where: { id: taskId },
      })
      .catch((error: unknown) => {
        if ((error as { code?: string }).code !== 'P2025') {
          throw error;
        }
      });
  }

  private async loadFromFile(): Promise<TaskSpec[]> {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      const raw = await fs.readFile(this.storagePath, 'utf8').catch((error) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return '';
        }
        throw error;
      });
      if (!raw.trim()) {
        return [];
      }
      const parsed = JSON.parse(raw) as TaskSpec[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.warn(`Failed to load tasks from ${this.storagePath}: ${(error as Error).message}`);
      return [];
    }
  }

  private async saveTaskToFile(task: TaskSpec): Promise<void> {
    const tasks = await this.loadFromFile();
    const index = tasks.findIndex((existing) => existing.id === task.id);
    if (index === -1) {
      tasks.push(task);
    } else {
      tasks[index] = task;
    }
    await this.writeFile(tasks);
  }

  private async deleteTaskFromFile(taskId: string): Promise<void> {
    const tasks = await this.loadFromFile();
    const filtered = tasks.filter((task) => task.id !== taskId);
    await this.writeFile(filtered);
  }

  private async writeFile(tasks: TaskSpec[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(tasks, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to persist tasks to ${this.storagePath}: ${(error as Error).message}`,
      );
    }
  }

  private mapRowToTask(row: TaskRow): TaskSpec {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      goal: row.goal,
      instructions: row.instructions ?? '',
      route: row.route,
      role: row.role,
      provider: row.provider ?? undefined,
      model: row.model ?? undefined,
      requireFindings: row.requireFindings,
      autoAuthEnabled: row.autoAuthEnabled,
      budgets: row.budgets as TaskSpec['budgets'],
    };
  }

  private mapTaskToRow(task: TaskSpec): TaskRow {
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      goal: task.goal,
      instructions: task.instructions,
      route: task.route,
      role: task.role,
      provider: task.provider ?? null,
      model: task.model ?? null,
      requireFindings: task.requireFindings,
      autoAuthEnabled: task.autoAuthEnabled,
      budgets: task.budgets as Prisma.InputJsonValue,
    };
  }
}
