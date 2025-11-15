import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { AppEnvironment } from '../config/environment';
import { performAnalystLogin } from './auth-flow.helper';

@Injectable()
export class AuthStateService {
  private readonly logger = new Logger(AuthStateService.name);
  private readonly storageRoot: string;
  private readonly defaultBaseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    this.storageRoot = path.resolve(process.cwd(), 'playwright', '.auth', 'runs');
    this.defaultBaseUrl = this.configService.get('BASE_URL', { infer: true });
    this.username = this.configService.get('LOGIN_USERNAME', { infer: true });
    this.password = this.configService.get('LOGIN_PASSWORD', { infer: true });
  }

  async createStorageState(runId: string, baseUrlOverride?: string): Promise<string> {
    const targetBaseUrl = (baseUrlOverride ?? this.defaultBaseUrl).replace(/\/$/, '');
    await mkdir(this.storageRoot, { recursive: true });
    const storagePath = path.join(this.storageRoot, `${runId}.json`);

    this.logger.log(`Bootstrapping auth state for run ${runId} at ${targetBaseUrl}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await performAnalystLogin(
        page,
        targetBaseUrl,
        {
          username: this.username,
          password: this.password,
        },
        (message) => this.logger.debug(`[${runId}] ${message}`),
      );
      await context.storageState({ path: storagePath });
      this.logger.log(`Stored auth state for run ${runId} in ${storagePath}`);
      return storagePath;
    } finally {
      await browser.close();
    }
  }
}
