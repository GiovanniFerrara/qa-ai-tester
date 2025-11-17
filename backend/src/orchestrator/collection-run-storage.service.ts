import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { CollectionRunRecord } from '../models/collections';

@Injectable()
export class CollectionRunStorageService {
  private readonly logger = new Logger(CollectionRunStorageService.name);
  private readonly storagePath: string;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    const configuredPath = path.join(process.cwd(), 'data', 'collection-runs.json');
    const overridePath = this.configService.get<string>('COLLECTION_RUNS_DB_PATH');
    this.storagePath = path.resolve(overridePath ?? configuredPath);
    mkdirSync(path.dirname(this.storagePath), { recursive: true });
  }

  loadRuns(): CollectionRunRecord[] {
    try {
      if (!existsSync(this.storagePath)) {
        return [];
      }
      const raw = readFileSync(this.storagePath, 'utf8');
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

  saveRuns(runs: CollectionRunRecord[]): void {
    try {
      writeFileSync(this.storagePath, JSON.stringify(runs, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to persist collection runs to ${this.storagePath}: ${(error as Error).message}`,
      );
    }
  }
}
