import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';

import { TaskContextualizerService, type TaskDraft } from './task-contextualizer.service';
import { TaskTranscriptionService, type UploadedAudioFile } from './task-transcription.service';

const QuickTaskContextSchema = z.object({
  prompt: z.string().min(1, 'Please describe the task to contextualize.'),
});

@Controller('tasks')
export class QuickTasksController {
  constructor(
    private readonly contextualizer: TaskContextualizerService,
    private readonly transcription: TaskTranscriptionService,
  ) {}

  @Post('contextualize')
  async contextualize(@Body() body: unknown): Promise<TaskDraft> {
    const { prompt } = QuickTaskContextSchema.parse(body);
    return this.contextualizer.contextualize(prompt);
  }

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(@UploadedFile() file?: UploadedAudioFile): Promise<{ text: string }> {
    if (!file) {
      throw new BadRequestException('Audio file is required.');
    }

    const text = await this.transcription.transcribe(file);
    return { text };
  }
}
