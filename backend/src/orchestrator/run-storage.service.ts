import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { StoredRunRecord } from '../models/run';
import type { EntityStorage } from '../storage/entity-storage';
import { StorageFactoryService } from '../storage/storage-factory.service';

@Injectable()
export class RunStorageService {
  private readonly logger = new Logger(RunStorageService.name);
  private readonly storagePath: string;
  private readonly store: EntityStorage<StoredRunRecord>;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    storageFactory: StorageFactoryService,
  ) {
    const configuredPath =
      this.configService.get<string>('RUNS_DB_PATH', { infer: true }) ??
      path.join(process.cwd(), 'data', 'runs.json');
    this.storagePath = path.resolve(configuredPath);
    this.store = storageFactory.createJsonStore<StoredRunRecord>(
      'runs',
      this.storagePath,
      this.logger,
    );
  }

  async loadRuns(): Promise<StoredRunRecord[]> {
    return this.store.load();
  }

  async saveRuns(runs: StoredRunRecord[]): Promise<void> {
    await this.store.save(runs);
  }
}
