import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from './config/environment';
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
    ProvidersModule,
    TasksModule,
    OrchestratorModule,
  ],
})
export class AppModule {}
