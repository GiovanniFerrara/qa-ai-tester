import { Controller, Param, Sse } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { RunEventsService, type RunEvent } from './run-events.service';

@Controller('runs')
export class RunEventsController {
  constructor(private readonly runEventsService: RunEventsService) {}

  @Sse(':runId/events')
  stream(@Param('runId') runId: string): Observable<MessageEvent> {
    return this.runEventsService.createStream(runId).pipe(
      map((event: RunEvent): MessageEvent => ({
        data: event,
      })),
    );
  }
}
