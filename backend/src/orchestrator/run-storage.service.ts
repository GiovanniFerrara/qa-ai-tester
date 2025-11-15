import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { StoredRunRecord } from '../models/run';

@Injectable()
export class RunStorageService {
  private readonly logger = new Logger(RunStorageService.name);
  private readonly storagePath: string;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    const configuredPath =
      this.configService.get<string>('RUNS_DB_PATH', { infer: true }) ??
      path.join(process.cwd(), 'data', 'runs.json');
    this.storagePath = path.resolve(configuredPath);
    mkdirSync(path.dirname(this.storagePath), { recursive: true });
  }

  loadRuns(): StoredRunRecord[] {
    try {
      if (!existsSync(this.storagePath)) {
        return [];
      }
      const raw = readFileSync(this.storagePath, 'utf8');
      if (!raw.trim()) {
        return [];
      }
      const parsed = JSON.parse(raw) as StoredRunRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.warn(
        `Failed to load runs from ${this.storagePath}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  saveRuns(runs: StoredRunRecord[]): void {
    try {
      writeFileSync(this.storagePath, JSON.stringify(runs, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to persist runs to ${this.storagePath}: ${(error as Error).message}`,
      );
    }
  }
}
