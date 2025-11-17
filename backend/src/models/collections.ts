import { z } from 'zod';

import type { RunStatus } from './run';

export const ExecutionModeSchema = z.enum(['parallel', 'sequential']);
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;

export const TaskCollectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(''),
  taskIds: z.array(z.string()).min(1),
  executionMode: ExecutionModeSchema.default('parallel'),
  baseUrl: z.string().url().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaskCollection = z.infer<typeof TaskCollectionSchema>;

export interface CollectionRunItem {
  taskId: string;
  taskName: string;
  runId?: string;
  status: RunStatus;
  error?: string;
}

export interface CollectionRunRecord {
  id: string;
  collectionId: string;
  executionMode: ExecutionMode;
  status: 'running' | 'completed';
  startedAt: string;
  finishedAt?: string;
  baseUrl?: string;
  items: CollectionRunItem[];
}
