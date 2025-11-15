import { Injectable, Logger } from '@nestjs/common';
import { toFile } from 'openai';

import { OpenAiProviderService } from '../providers/openai-provider.service';

export interface UploadedAudioFile {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

@Injectable()
export class TaskTranscriptionService {
  private readonly logger = new Logger(TaskTranscriptionService.name);
  private readonly transcriptionModel = 'whisper-1';

  constructor(private readonly openAiProvider: OpenAiProviderService) {}

  async transcribe(file: UploadedAudioFile): Promise<string> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new Error('Uploaded audio file is empty.');
    }

    const uploadable = await toFile(file.buffer, file.originalname || 'quick-task.webm', {
      type: file.mimetype || 'audio/webm',
    });

    const client = this.openAiProvider.getClient();
    const transcription = (await client.audio.transcriptions.create({
      file: uploadable,
      model: this.transcriptionModel,
      temperature: 0,
      response_format: 'text',
    })) as unknown;

    const transcriptionText =
      typeof transcription === 'string'
        ? transcription
        : ((transcription as { text?: string } | null | undefined)?.text ?? '');
    const text = transcriptionText.trim();
    if (!text) {
      this.logger.error('Transcription response did not include text. Raw payload:', transcription);
      throw new Error('Transcription service returned an empty result.');
    }

    return text;
  }
}
