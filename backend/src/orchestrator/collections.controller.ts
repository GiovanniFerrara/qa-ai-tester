import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { z, ZodError } from 'zod';

import { ExecutionModeSchema } from '../models/collections';
import { TaskCollectionsService } from '../tasks/task-collections.service';
import { OrchestratorService } from './orchestrator.service';

const CollectionPayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  taskIds: z.array(z.string()).min(1),
  executionMode: ExecutionModeSchema.optional(),
  baseUrl: z.string().url().optional().nullable(),
});

const CollectionRunPayloadSchema = z.object({
  executionMode: ExecutionModeSchema.optional(),
  baseUrl: z.string().url().optional(),
});

@Controller('collections')
export class CollectionsController {
  constructor(
    private readonly taskCollections: TaskCollectionsService,
    private readonly orchestrator: OrchestratorService,
  ) {}

  @Get()
  list() {
    return this.taskCollections.list();
  }

  @Get(':collectionId')
  getCollection(@Param('collectionId') collectionId: string) {
    const collection = this.taskCollections.get(collectionId);
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    return collection;
  }

  @Post()
  create(@Body() body: unknown) {
    try {
      const payload = CollectionPayloadSchema.parse(body);
      return this.taskCollections.create(payload);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.errors.map((err) => err.message).join(', '));
      }
      throw error;
    }
  }

  @Put(':collectionId')
  update(@Param('collectionId') collectionId: string, @Body() body: unknown) {
    try {
      const payload = CollectionPayloadSchema.partial().parse(body);
      return this.taskCollections.update(collectionId, payload);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.errors.map((err) => err.message).join(', '));
      }
      throw error;
    }
  }

  @Delete(':collectionId')
  remove(@Param('collectionId') collectionId: string) {
    this.taskCollections.remove(collectionId);
    return { success: true };
  }

  @Post(':collectionId/runs')
  async startCollectionRun(
    @Param('collectionId') collectionId: string,
    @Body() body: unknown,
  ) {
    try {
      const payload = CollectionRunPayloadSchema.parse(body ?? {});
      const run = await this.orchestrator.startCollectionRun(collectionId, payload);
      return run;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.errors.map((err) => err.message).join(', '));
      }
      throw error;
    }
  }

  @Get(':collectionId/runs')
  listRunsForCollection(@Param('collectionId') collectionId: string) {
    return this.orchestrator.listCollectionRunsForCollection(collectionId);
  }

  @Get(':collectionId/runs/:collectionRunId')
  getRunForCollection(
    @Param('collectionId') collectionId: string,
    @Param('collectionRunId') collectionRunId: string,
  ) {
    return this.orchestrator.getCollectionRunForCollection(collectionId, collectionRunId);
  }
}
