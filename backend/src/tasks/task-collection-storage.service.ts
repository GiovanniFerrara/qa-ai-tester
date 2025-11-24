import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { TaskCollection } from '../models/collections';
import { DatabaseService } from '../storage/database.service';

type TaskCollectionRow = {
  id: string;
  name: string;
  description: string;
  taskIds: Prisma.JsonValue;
  executionMode: string;
  baseUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class TaskCollectionStorageService {
  private readonly logger = new Logger(TaskCollectionStorageService.name);
  private readonly storagePath: string;
  private readonly useDatabase: boolean;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly database: DatabaseService,
  ) {
    const configuredPath = path.join(process.cwd(), 'data', 'task-collections.json');
    const overridePath = this.configService.get<string>('TASK_COLLECTIONS_DB_PATH');
    this.storagePath = path.resolve(overridePath ?? configuredPath);
    this.useDatabase = this.database.isEnabled;
  }

  async loadCollections(): Promise<TaskCollection[]> {
    return this.useDatabase ? this.loadFromDatabase() : this.loadFromFile();
  }

  async saveCollection(collection: TaskCollection): Promise<void> {
    if (this.useDatabase) {
      await this.saveCollectionToDatabase(collection);
    } else {
      await this.saveCollectionToFile(collection);
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    if (this.useDatabase) {
      await this.deleteFromDatabase(collectionId);
    } else {
      await this.deleteFromFile(collectionId);
    }
  }

  private async loadFromDatabase(): Promise<TaskCollection[]> {
    const client = await this.database.getClient();
    const rows = await client.taskCollection.findMany();
    return rows.map((row) => this.mapRowToCollection(row as TaskCollectionRow));
  }

  private async saveCollectionToDatabase(collection: TaskCollection): Promise<void> {
    const client = await this.database.getClient();
    const payload = this.mapCollectionToRow(collection);
    await client.taskCollection.upsert({
      where: { id: collection.id },
      create: payload,
      update: payload,
    });
  }

  private async deleteFromDatabase(collectionId: string): Promise<void> {
    const client = await this.database.getClient();
    await client.taskCollection
      .delete({
        where: { id: collectionId },
      })
      .catch((error: unknown) => {
        if ((error as { code?: string }).code !== 'P2025') {
          throw error;
        }
      });
  }

  private async loadFromFile(): Promise<TaskCollection[]> {
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
      const parsed = JSON.parse(raw) as TaskCollection[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.warn(
        `Failed to load task collections from ${this.storagePath}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  private async saveCollectionToFile(collection: TaskCollection): Promise<void> {
    const collections = await this.loadFromFile();
    const index = collections.findIndex((existing) => existing.id === collection.id);
    if (index === -1) {
      collections.push(collection);
    } else {
      collections[index] = collection;
    }
    await this.writeFile(collections);
  }

  private async deleteFromFile(collectionId: string): Promise<void> {
    const collections = await this.loadFromFile();
    const filtered = collections.filter((collection) => collection.id !== collectionId);
    await this.writeFile(filtered);
  }

  private async writeFile(collections: TaskCollection[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(collections, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to persist task collections to ${this.storagePath}: ${(error as Error).message}`,
      );
    }
  }

  private mapRowToCollection(row: TaskCollectionRow): TaskCollection {
    const taskIds = Array.isArray(row.taskIds)
      ? (row.taskIds as unknown[]).map((taskId) => taskId as string)
      : [];
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      taskIds,
      executionMode: (row.executionMode as TaskCollection['executionMode']) ?? 'parallel',
      baseUrl: row.baseUrl ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapCollectionToRow(
    collection: TaskCollection,
  ): Prisma.TaskCollectionUpsertArgs['create'] {
    return {
      id: collection.id,
      name: collection.name,
      description: collection.description ?? '',
      taskIds: collection.taskIds as Prisma.InputJsonValue,
      executionMode: collection.executionMode ?? 'parallel',
      baseUrl: collection.baseUrl ?? null,
    };
  }
}
