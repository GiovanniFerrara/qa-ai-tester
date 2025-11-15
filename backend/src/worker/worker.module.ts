import { Module } from '@nestjs/common';

import { AuthStateService } from './auth-state.service';
import { WorkerGatewayService } from './worker-gateway.service';

@Module({
  providers: [WorkerGatewayService, AuthStateService],
  exports: [WorkerGatewayService, AuthStateService],
})
export class WorkerModule {}
