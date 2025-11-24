import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import type { CollectionRunRecord } from '../models/collections';
import type { EntityStorage } from '../storage/entity-storage';
import { StorageFactoryService } from '../storage/storage-factory.service';

@Injectable()
export class CollectionRunStorageService {
  private readonly logger = new Logger(CollectionRunStorageService.name);
  private readonly storagePath: string;
  private readonly store: EntityStorage<CollectionRunRecord>;

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    storageFactory: StorageFactoryService,
  ) {
    const configuredPath = path.join(process.cwd(), 'data', 'collection-runs.json');
    const overridePath = this.configService.get<string>('COLLECTION_RUNS_DB_PATH');
    this.storagePath = path.resolve(overridePath ?? configuredPath);
    this.store = storageFactory.createJsonStore<CollectionRunRecord>(
      'collectionRuns',
      this.storagePath,
      this.logger,
    );
  }

  async loadRuns(): Promise<CollectionRunRecord[]> {
    return this.store.load();
  }

  async saveRuns(runs: CollectionRunRecord[]): Promise<void> {
    await this.store.save(runs);
  }
}
