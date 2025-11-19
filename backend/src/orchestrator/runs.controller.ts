import { BadRequestException, Controller, Get, Param, Post, Body } from '@nestjs/common';
import { z, ZodError } from 'zod';

import type { AiProvider } from '../models/run';
import { OrchestratorService } from './orchestrator.service';
import { DismissReasonSchema } from '../models/contracts';

const StartRunSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  provider: z.enum(['openai', 'anthropic', 'gemini']).optional(),
  baseUrl: z.string().url().optional(),
});

const DismissPayloadSchema = z.object({
  reason: DismissReasonSchema,
  dismissedBy: z.string().optional(),
});

@Controller('runs')
export class RunsController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Get()
  listRuns() {
    return this.orchestratorService.listRuns();
  }

  @Get('summary')
  getSummary() {
    return this.orchestratorService.getRunSummary();
  }

  @Get(':runId')
  getRun(@Param('runId') runId: string) {
    return this.orchestratorService.getRun(runId);
  }

  @Post()
  async createRun(@Body() body: unknown) {
    try {
      const payload = StartRunSchema.parse(body);
      return await this.orchestratorService.startRun(
        payload.taskId,
        payload.provider as AiProvider,
        payload.baseUrl,
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.errors.map((err) => err.message).join(', '));
      }
      throw error;
    }
  }

  @Post(':runId/findings/:findingId/dismiss')
  async dismissFinding(
    @Param('runId') runId: string,
    @Param('findingId') findingId: string,
    @Body() body: unknown,
  ) {
    try {
      const payload = DismissPayloadSchema.parse(body);
      const updated = await this.orchestratorService.dismissFinding(
        runId,
        findingId,
        payload.reason,
        payload.dismissedBy,
      );
      return { success: true, run: updated };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.errors.map((err) => err.message).join(', '));
      }
      throw error;
    }
  }

  @Post(':runId/findings/:findingId/restore')
  async restoreFinding(@Param('runId') runId: string, @Param('findingId') findingId: string) {
    const updated = await this.orchestratorService.restoreFinding(runId, findingId);
    return { success: true, run: updated };
  }

  @Post(':runId/cancel')
  async cancelRun(@Param('runId') runId: string) {
    const run = await this.orchestratorService.cancelRun(runId);
    return { success: true, run };
  }
}
