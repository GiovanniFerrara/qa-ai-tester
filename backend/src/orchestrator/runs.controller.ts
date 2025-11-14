import { BadRequestException, Controller, Get, Param, Post, Body } from '@nestjs/common';
import { z, ZodError } from 'zod';

import type { AiProvider } from '../models/run';
import { OrchestratorService } from './orchestrator.service';

const StartRunSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  provider: z.enum(['openai', 'anthropic']).optional(),
});

@Controller('runs')
export class RunsController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Get()
  listRuns() {
    return this.orchestratorService.listRuns();
  }

  @Get(':runId')
  getRun(@Param('runId') runId: string) {
    return this.orchestratorService.getRun(runId);
  }

  @Post()
  async createRun(@Body() body: unknown) {
    try {
      const payload = StartRunSchema.parse(body);
      return await this.orchestratorService.startRun(payload.taskId, payload.provider as AiProvider);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.errors.map((err) => err.message).join(', '));
      }
      throw error;
    }
  }
}
