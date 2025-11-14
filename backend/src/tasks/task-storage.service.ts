import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { TaskSpec } from '../models/contracts';

@Injectable()
export class TaskStorageService {
  private readonly logger = new Logger(TaskStorageService.name);
  private readonly storagePath: string;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    const configuredPath =
      this.configService.get<string>('TASKS_DB_PATH', { infer: true }) ??
      path.join(process.cwd(), 'data', 'tasks.json');

    this.storagePath = path.resolve(configuredPath);
    mkdirSync(path.dirname(this.storagePath), { recursive: true });
  }

  loadTasks(): TaskSpec[] {
    try {
      if (!existsSync(this.storagePath)) {
        return [];
      }
      const raw = readFileSync(this.storagePath, 'utf8');
      if (!raw.trim()) {
        return [];
      }
      const parsed = JSON.parse(raw) as TaskSpec[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.warn(
        `Failed to load tasks from ${this.storagePath}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  saveTasks(tasks: TaskSpec[]): void {
    try {
      writeFileSync(this.storagePath, JSON.stringify(tasks, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to persist tasks to ${this.storagePath}: ${(error as Error).message}`,
      );
    }
  }

  getStoragePath(): string {
    return this.storagePath;
  }
}
