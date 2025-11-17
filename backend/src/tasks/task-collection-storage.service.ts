import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { TaskCollection } from '../models/collections';

@Injectable()
export class TaskCollectionStorageService {
  private readonly logger = new Logger(TaskCollectionStorageService.name);
  private readonly storagePath: string;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    const configuredPath = path.join(process.cwd(), 'data', 'task-collections.json');
    const overridePath = this.configService.get<string>('TASK_COLLECTIONS_DB_PATH');
    this.storagePath = path.resolve(overridePath ?? configuredPath);
    mkdirSync(path.dirname(this.storagePath), { recursive: true });
  }

  loadCollections(): TaskCollection[] {
    try {
      if (!existsSync(this.storagePath)) {
        return [];
      }
      const raw = readFileSync(this.storagePath, 'utf8');
      if (!raw.trim()) {
        return [];
      }
      const parsed = JSON.parse(raw) as TaskCollection[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.warn(
        `Failed to load task collections from ${this.storagePath}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  saveCollections(collections: TaskCollection[]): void {
    try {
      writeFileSync(this.storagePath, JSON.stringify(collections, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to persist task collections to ${this.storagePath}: ${(error as Error).message}`,
      );
    }
  }
}
