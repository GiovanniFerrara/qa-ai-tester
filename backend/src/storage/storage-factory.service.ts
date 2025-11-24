import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import type { Logger } from '@nestjs/common';

import type { AppEnvironment } from '../config/environment';
import type { EntityStorage } from './entity-storage';
import { FileEntityStorage } from './file-entity-storage';
import { PrismaEntityStorage } from './prisma-entity-storage';
import type { StorageBucketKey } from './storage.types';

@Injectable()
export class StorageFactoryService implements OnModuleDestroy {
  private prisma?: PrismaClient;
  private prismaPromise?: Promise<PrismaClient>;
  private readonly useDatabase: boolean;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    this.useDatabase = Boolean(this.configService.get('DATABASE_URL'));
  }

  createJsonStore<T>(
    bucket: StorageBucketKey,
    filePath: string,
    logger: Logger,
  ): EntityStorage<T> {
    if (this.useDatabase) {
      this.ensureDatabaseUrlAvailable(bucket);
      return new PrismaEntityStorage<T>(() => this.getPrismaClient(), bucket, logger);
    }
    return new FileEntityStorage<T>(filePath, logger);
  }

  private ensureDatabaseUrlAvailable(bucket: StorageBucketKey): void {
    const url = this.configService.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error(
        `DATABASE_URL must be configured to use database storage (requested bucket: ${bucket})`,
      );
    }
  }

  private async getPrismaClient(): Promise<PrismaClient> {
    if (!this.prismaPromise) {
      this.prismaPromise = (async () => {
        if (!this.prisma) {
          this.prisma = new PrismaClient();
        }
        await this.prisma.$connect();
        return this.prisma;
      })();
    }
    return this.prismaPromise;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}
