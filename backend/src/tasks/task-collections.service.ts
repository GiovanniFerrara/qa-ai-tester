import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
export class TaskCollectionsService {
  private readonly collections = new Map<string, TaskCollection>();

  constructor(
    private readonly storage: TaskCollectionStorageService,
    private readonly taskRegistry: TaskRegistryService,
  ) {
    const persisted = this.storage.loadCollections();
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

  create(input: CreateCollectionInput): TaskCollection {
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
    this.persist();
    return record;
  }

  update(collectionId: string, updates: UpdateCollectionInput): TaskCollection {
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
    this.persist();
    return updated;
  }

  remove(collectionId: string): void {
    if (!this.collections.delete(collectionId)) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    this.persist();
  }

  private persist(): void {
    this.storage.saveCollections(this.list());
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
