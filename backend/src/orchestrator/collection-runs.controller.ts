import { Controller, Get, Param } from '@nestjs/common';

import { OrchestratorService } from './orchestrator.service';

@Controller('collection-runs')
export class CollectionRunsController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Get()
  list() {
    return this.orchestrator.listCollectionRuns();
  }

  @Get(':collectionRunId')
  get(@Param('collectionRunId') collectionRunId: string) {
    return this.orchestrator.getCollectionRun(collectionRunId);
  }
}
