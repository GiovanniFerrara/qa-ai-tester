import { Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';

import type { EntityStorage } from './entity-storage';
import type { StorageBucketKey } from './storage.types';

type PrismaClientFactory = () => Promise<PrismaClient>;

export class PrismaEntityStorage<T> implements EntityStorage<T> {
  constructor(
    private readonly clientFactory: PrismaClientFactory,
    private readonly bucket: StorageBucketKey,
    private readonly logger: Logger,
  ) {}

  async load(): Promise<T[]> {
    try {
      const client = await this.clientFactory();
      const bucket = await client.storageBucket.findUnique({
        where: { key: this.bucket },
      });
      if (!bucket) {
        return [];
      }
      const payload = bucket.payload as T[];
      return Array.isArray(payload) ? payload : [];
    } catch (error) {
      this.logger.error(
        `Failed to load data for ${this.bucket} bucket: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async save(records: T[]): Promise<void> {
    try {
      const client = await this.clientFactory();
      await client.storageBucket.upsert({
        where: { key: this.bucket },
        create: {
          key: this.bucket,
          payload: records as Prisma.JsonArray,
        },
        update: {
          payload: records as Prisma.JsonArray,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist data for ${this.bucket} bucket: ${(error as Error).message}`,
      );
    }
  }
}
