import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { TaskSpec } from '../models/contracts';
import type { EntityStorage } from '../storage/entity-storage';
import { StorageFactoryService } from '../storage/storage-factory.service';

@Injectable()
export class TaskStorageService {
  private readonly logger = new Logger(TaskStorageService.name);
  private readonly storagePath: string;
  private readonly store: EntityStorage<TaskSpec>;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    storageFactory: StorageFactoryService,
  ) {
    const configuredPath =
      this.configService.get<string>('TASKS_DB_PATH', { infer: true }) ??
      path.join(process.cwd(), 'data', 'tasks.json');

    this.storagePath = path.resolve(configuredPath);
    this.store = storageFactory.createJsonStore<TaskSpec>(
      'tasks',
      this.storagePath,
      this.logger,
    );
  }

  async loadTasks(): Promise<TaskSpec[]> {
    return this.store.load();
  }

  async saveTasks(tasks: TaskSpec[]): Promise<void> {
    await this.store.save(tasks);
  }

  getStoragePath(): string {
    return this.storagePath;
  }
}
