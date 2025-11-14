import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface RunEvent {
  type: 'log' | 'tool_call' | 'screenshot' | 'status';
  message?: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class RunEventsService {
  private readonly streams = new Map<string, Subject<RunEvent>>();

  createStream(runId: string): Observable<RunEvent> {
    let subject = this.streams.get(runId);
    if (!subject) {
      subject = new Subject<RunEvent>();
      this.streams.set(runId, subject);
    }
    return subject.asObservable();
  }

  emit(runId: string, event: RunEvent): void {
    let subject = this.streams.get(runId);
    if (!subject) {
      subject = new Subject<RunEvent>();
      this.streams.set(runId, subject);
    }
    subject.next(event);
  }

  complete(runId: string): void {
    const subject = this.streams.get(runId);
    if (subject) {
      subject.complete();
      this.streams.delete(runId);
    }
  }
}
