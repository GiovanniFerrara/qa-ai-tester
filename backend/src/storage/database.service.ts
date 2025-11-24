import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

import type { AppEnvironment } from '../config/environment';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly isEnabled: boolean;
  private prisma?: PrismaClient;
  private prismaPromise?: Promise<PrismaClient>;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    this.isEnabled = Boolean(this.configService.get<string>('DATABASE_URL'));
  }

  async getClient(): Promise<PrismaClient> {
    if (!this.isEnabled) {
      throw new Error('DATABASE_URL must be configured to use the database storage driver');
    }
    if (!this.prismaPromise) {
      this.prismaPromise = (async () => {
        this.prisma = new PrismaClient();
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

