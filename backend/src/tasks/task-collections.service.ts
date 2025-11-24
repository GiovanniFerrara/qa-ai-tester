import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { TaskCollectionSchema, type TaskCollection, type ExecutionMode } from '../models/collections';
import { TaskRegistryService } from './task-registry.service';
import { TaskCollectionStorageService } from './task-collection-storage.service';

interface CreateCollectionInput {
  name: string;
  description?: string;
  taskIds: string[];
  executionMode?: ExecutionMode;
  baseUrl?: string | null;
}

type UpdateCollectionInput = Partial<CreateCollectionInput>;

@Injectable()
export class TaskCollectionsService implements OnModuleInit {
  private readonly collections = new Map<string, TaskCollection>();

  constructor(
    private readonly storage: TaskCollectionStorageService,
    private readonly taskRegistry: TaskRegistryService,
  ) {}

  async onModuleInit(): Promise<void> {
    const persisted = await this.storage.loadCollections();
    for (const collection of persisted) {
      const parsed = TaskCollectionSchema.safeParse({
        ...collection,
        executionMode: collection.executionMode ?? 'parallel',
      });
      if (parsed.success) {
        this.collections.set(parsed.data.id, parsed.data);
      }
    }
  }

  list(): TaskCollection[] {
    return [...this.collections.values()];
  }

  get(collectionId: string): TaskCollection | undefined {
    return this.collections.get(collectionId);
  }

  async create(input: CreateCollectionInput): Promise<TaskCollection> {
    this.assertTaskIds(input.taskIds);
    const now = new Date().toISOString();
    const baseUrl = this.normalizeBaseUrl(input.baseUrl);
    const record: TaskCollection = {
      id: uuidv4(),
      name: input.name,
      description: input.description ?? '',
      taskIds: input.taskIds,
      executionMode: input.executionMode ?? 'parallel',
      baseUrl,
      createdAt: now,
      updatedAt: now,
    };
    this.collections.set(record.id, record);
    await this.storage.saveCollection(record);
    return record;
  }

  async update(collectionId: string, updates: UpdateCollectionInput): Promise<TaskCollection> {
    const existing = this.collections.get(collectionId);
    if (!existing) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    if (updates.taskIds) {
      this.assertTaskIds(updates.taskIds);
    }
    const updated: TaskCollection = {
      ...existing,
      ...updates,
      taskIds: updates.taskIds ?? existing.taskIds,
      executionMode: updates.executionMode ?? existing.executionMode,
      baseUrl:
        Object.prototype.hasOwnProperty.call(updates, 'baseUrl')
          ? this.normalizeBaseUrl(updates.baseUrl)
          : existing.baseUrl,
      updatedAt: new Date().toISOString(),
    };
    this.collections.set(collectionId, updated);
    await this.storage.saveCollection(updated);
    return updated;
  }

  async remove(collectionId: string): Promise<void> {
    if (!this.collections.delete(collectionId)) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    await this.storage.deleteCollection(collectionId);
  }

  private assertTaskIds(taskIds: string[]): void {
    if (!taskIds.length) {
      throw new BadRequestException('Collections must contain at least one task');
    }
    for (const taskId of taskIds) {
      if (!this.taskRegistry.get(taskId)) {
        throw new NotFoundException(`Task ${taskId} not found`);
      }
    }
  }

  private normalizeBaseUrl(value?: string | null): string | undefined {
    if (value === null) {
      return undefined;
    }
    const trimmed = value?.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed;
  }
}
