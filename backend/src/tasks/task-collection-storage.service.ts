import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { TaskCollection } from '../models/collections';
import type { EntityStorage } from '../storage/entity-storage';
import { StorageFactoryService } from '../storage/storage-factory.service';

@Injectable()
export class TaskCollectionStorageService {
  private readonly logger = new Logger(TaskCollectionStorageService.name);
  private readonly storagePath: string;
  private readonly store: EntityStorage<TaskCollection>;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    storageFactory: StorageFactoryService,
  ) {
    const configuredPath = path.join(process.cwd(), 'data', 'task-collections.json');
    const overridePath = this.configService.get<string>('TASK_COLLECTIONS_DB_PATH');
    this.storagePath = path.resolve(overridePath ?? configuredPath);
    this.store = storageFactory.createJsonStore<TaskCollection>(
      'taskCollections',
      this.storagePath,
      this.logger,
    );
  }

  async loadCollections(): Promise<TaskCollection[]> {
    return this.store.load();
  }

  async saveCollections(collections: TaskCollection[]): Promise<void> {
    await this.store.save(collections);
  }
}
