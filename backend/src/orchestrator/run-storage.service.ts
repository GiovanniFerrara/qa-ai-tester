import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { StoredRunRecord } from '../models/run';
import { DatabaseService } from '../storage/database.service';

type RunRow = {
  runId: string;
  taskId: string;
  provider: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  report: Prisma.JsonValue | null;
  artifacts: Prisma.JsonValue | null;
  baseUrlOverride: string | null;
  summary: Prisma.JsonValue | null;
};

@Injectable()
export class RunStorageService {
  private readonly logger = new Logger(RunStorageService.name);
  private readonly storagePath: string;
  private readonly useDatabase: boolean;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly database: DatabaseService,
  ) {
    const configuredPath =
      this.configService.get<string>('RUNS_DB_PATH', { infer: true }) ??
      path.join(process.cwd(), 'data', 'runs.json');
    this.storagePath = path.resolve(configuredPath);
    this.useDatabase = this.database.isEnabled;
  }

  async loadRuns(): Promise<StoredRunRecord[]> {
    return this.useDatabase ? this.loadFromDatabase() : this.loadFromFile();
  }

  async saveRun(run: StoredRunRecord): Promise<void> {
    if (this.useDatabase) {
      await this.saveRunToDatabase(run);
    } else {
      await this.saveRunToFile(run);
    }
  }

  private async loadFromDatabase(): Promise<StoredRunRecord[]> {
    const client = await this.database.getClient();
    const rows = await client.run.findMany({ orderBy: { startedAt: 'asc' } });
    return rows.map((row) => this.mapRowToRun(row as RunRow));
  }

  private async saveRunToDatabase(run: StoredRunRecord): Promise<void> {
    const client = await this.database.getClient();
    const payload = this.mapRunToRow(run);
    await client.run.upsert({
      where: { runId: run.runId },
      create: payload,
      update: payload,
    });
  }

  private async loadFromFile(): Promise<StoredRunRecord[]> {
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
      const parsed = JSON.parse(raw) as StoredRunRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.warn(`Failed to load runs from ${this.storagePath}: ${(error as Error).message}`);
      return [];
    }
  }

  private async saveRunToFile(run: StoredRunRecord): Promise<void> {
    const runs = await this.loadFromFile();
    const index = runs.findIndex((existing) => existing.runId === run.runId);
    if (index === -1) {
      runs.push(run);
    } else {
      runs[index] = run;
    }
    await this.writeFile(runs);
  }

  private async writeFile(runs: StoredRunRecord[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(runs, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to persist runs to ${this.storagePath}: ${(error as Error).message}`,
      );
    }
  }

  private mapRowToRun(row: RunRow): StoredRunRecord {
    return {
      runId: row.runId,
      taskId: row.taskId,
      provider: row.provider as StoredRunRecord['provider'],
      status: row.status as StoredRunRecord['status'],
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt ? row.finishedAt.toISOString() : undefined,
      error: row.error ?? undefined,
      report: (row.report ?? undefined) as StoredRunRecord['report'],
      artifacts: (row.artifacts ?? undefined) as StoredRunRecord['artifacts'],
      baseUrlOverride: row.baseUrlOverride ?? undefined,
      summary: (row.summary ?? undefined) as StoredRunRecord['summary'],
    };
  }

  private mapRunToRow(run: StoredRunRecord): Prisma.RunUpsertArgs['create'] {
    return {
      runId: run.runId,
      taskId: run.taskId,
      provider: run.provider,
      status: run.status,
      startedAt: new Date(run.startedAt),
      finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
      error: run.error ?? null,
      report: this.toJsonColumn(run.report),
      artifacts: this.toJsonColumn(run.artifacts),
      baseUrlOverride: run.baseUrlOverride ?? null,
      summary: this.toJsonColumn(run.summary),
    };
  }

  private toJsonColumn(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    return value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }
}
