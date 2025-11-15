import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { validateEnvironment } from '../config/environment';
import { WorkerGatewayService } from './worker-gateway.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
  ],
  providers: [WorkerGatewayService],
  exports: [WorkerGatewayService],
})
class WorkerCliModule {}

async function bootstrap(): Promise<void> {
  const logger = new Logger('WorkerCLI');
  const appContext = await NestFactory.createApplicationContext(WorkerCliModule, {
    logger: ['log', 'error', 'debug', 'warn'],
  });

  const worker = appContext.get(WorkerGatewayService);
  const runId = `manual-${Date.now()}`;

  logger.log(`Starting manual worker session with runId ${runId}`);

  let baseUrlOverride: string | undefined;
  try {
    const overridePath = path.resolve(process.cwd(), 'data', 'last-base-url.txt');
    if (existsSync(overridePath)) {
      const candidate = readFileSync(overridePath, 'utf8').trim();
      if (candidate) {
        baseUrlOverride = candidate;
        logger.log(`Using base URL override from ${overridePath}: ${candidate}`);
      }
    }
  } catch (error) {
    logger.warn(`Unable to read base URL override: ${(error as Error).message}`);
  }

  const handle = await worker.startRun(runId, '/dashboard', baseUrlOverride);
  try {
    await worker.captureScreenshot(handle, 'manual');
    logger.log(`Screenshot saved for run ${runId}`);
  } finally {
    await worker.stopRun(handle);
    await appContext.close();
  }
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console -- CLI fallback logging
  console.error('Worker bootstrap failed', error);
  process.exitCode = 1;
});
