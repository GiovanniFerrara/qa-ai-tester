import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { CollectionRunRecord } from '../models/collections';
import { DatabaseService } from '../storage/database.service';

type CollectionRunRow = {
  id: string;
  collectionId: string;
  executionMode: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  baseUrl?: string | null;
  items: Prisma.JsonValue;
};

@Injectable()
export class CollectionRunStorageService {
  private readonly logger = new Logger(CollectionRunStorageService.name);
  private readonly storagePath: string;
  private readonly useDatabase: boolean;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly database: DatabaseService,
  ) {
    const configuredPath = path.join(process.cwd(), 'data', 'collection-runs.json');
    const overridePath = this.configService.get<string>('COLLECTION_RUNS_DB_PATH');
    this.storagePath = path.resolve(overridePath ?? configuredPath);
    this.useDatabase = this.database.isEnabled;
  }

  async loadRuns(): Promise<CollectionRunRecord[]> {
    return this.useDatabase ? this.loadFromDatabase() : this.loadFromFile();
  }

  async saveRun(record: CollectionRunRecord): Promise<void> {
    if (this.useDatabase) {
      await this.saveRunToDatabase(record);
    } else {
      await this.saveRunToFile(record);
    }
  }

  private async loadFromDatabase(): Promise<CollectionRunRecord[]> {
    const client = await this.database.getClient();
    const rows = await client.collectionRun.findMany({ orderBy: { startedAt: 'desc' } });
    return rows.map((row) => this.mapRowToRecord(row as CollectionRunRow));
  }

  private async saveRunToDatabase(record: CollectionRunRecord): Promise<void> {
    const client = await this.database.getClient();
    const payload = this.mapRecordToRow(record);
    await client.collectionRun.upsert({
      where: { id: record.id },
      create: payload,
      update: payload,
    });
  }

  private async loadFromFile(): Promise<CollectionRunRecord[]> {
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
      const parsed = JSON.parse(raw) as CollectionRunRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.warn(
        `Failed to load collection runs from ${this.storagePath}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  private async saveRunToFile(record: CollectionRunRecord): Promise<void> {
    const runs = await this.loadFromFile();
    const index = runs.findIndex((existing) => existing.id === record.id);
    if (index === -1) {
      runs.push(record);
    } else {
      runs[index] = record;
    }
    await this.writeFile(runs);
  }

  private async writeFile(runs: CollectionRunRecord[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(runs, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to persist collection runs to ${this.storagePath}: ${(error as Error).message}`,
      );
    }
  }

  private mapRowToRecord(row: CollectionRunRow): CollectionRunRecord {
    const items = Array.isArray(row.items)
      ? ((row.items as unknown) as CollectionRunRecord['items'])
      : [];
    return {
      id: row.id,
      collectionId: row.collectionId,
      executionMode: row.executionMode as CollectionRunRecord['executionMode'],
      status: row.status as CollectionRunRecord['status'],
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt ? row.finishedAt.toISOString() : undefined,
      baseUrl: row.baseUrl ?? undefined,
      items,
    };
  }

  private mapRecordToRow(
    record: CollectionRunRecord,
  ): Prisma.CollectionRunUpsertArgs['create'] {
    return {
      id: record.id,
      collectionId: record.collectionId,
      executionMode: record.executionMode,
      status: record.status,
      startedAt: new Date(record.startedAt),
      finishedAt: record.finishedAt ? new Date(record.finishedAt) : null,
      baseUrl: record.baseUrl ?? null,
      items: (record.items as unknown) as Prisma.InputJsonValue,
    };
  }
}
