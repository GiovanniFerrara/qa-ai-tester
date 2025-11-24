import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { validateEnvironment } from './config/environment';
import { StorageModule } from './storage/storage.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { ProvidersModule } from './providers/providers.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ['/api*'],
    }),
    StorageModule,
    ProvidersModule,
    TasksModule,
    OrchestratorModule,
  ],
})
export class AppModule {}
