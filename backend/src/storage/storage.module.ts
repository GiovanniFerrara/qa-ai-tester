import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseService } from './database.service';
import { FsDatabaseService } from './fs-database.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DatabaseService, FsDatabaseService],
  exports: [DatabaseService, FsDatabaseService],
})
export class StorageModule {}
