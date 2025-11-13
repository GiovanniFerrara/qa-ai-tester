import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

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

  const handle = await worker.startRun(runId, '/dashboard');
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
