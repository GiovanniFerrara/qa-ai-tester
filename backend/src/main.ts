import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import type { AppEnvironment } from './config/environment';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService<AppEnvironment>);

  const port = Number(process.env.PORT ?? 3000);
  const globalPrefix = 'api';

  app.setGlobalPrefix(globalPrefix);
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`QA AI Orchestrator listening on http://localhost:${port}/${globalPrefix}`);
  logger.log(`Default provider: ${configService.get('DEFAULT_PROVIDER')}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console -- fallback logger before nest bootstrap
  console.error('Failed to bootstrap Nest application', error);
  process.exitCode = 1;
});
