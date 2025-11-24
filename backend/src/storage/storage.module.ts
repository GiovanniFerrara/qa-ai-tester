import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StorageFactoryService } from './storage-factory.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [StorageFactoryService],
  exports: [StorageFactoryService],
})
export class StorageModule {}

