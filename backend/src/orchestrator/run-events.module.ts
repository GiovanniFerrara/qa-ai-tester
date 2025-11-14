import { Module } from '@nestjs/common';

import { RunEventsService } from './run-events.service';

@Module({
  providers: [RunEventsService],
  exports: [RunEventsService],
})
export class RunEventsModule {}
