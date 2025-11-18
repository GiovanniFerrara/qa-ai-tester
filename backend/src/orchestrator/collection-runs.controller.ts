import { Controller, Get, Param, Post } from '@nestjs/common';

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

  @Post(':collectionRunId/cancel')
  async cancel(@Param('collectionRunId') collectionRunId: string) {
    const run = await this.orchestrator.cancelCollectionRun(collectionRunId);
    return { success: true, run };
  }
}
