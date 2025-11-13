import { Module } from '@nestjs/common';

import { WorkerGatewayService } from './worker-gateway.service';

@Module({
  providers: [WorkerGatewayService],
  exports: [WorkerGatewayService],
})
export class WorkerModule {}
