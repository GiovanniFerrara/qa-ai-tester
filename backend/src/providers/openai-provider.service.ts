import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type { AppEnvironment } from '../config/environment';
import type { ResponseCreateParams, ResponseFormatTextJSONSchemaConfig } from 'openai/resources/responses/responses';

import type { TaskSpec } from '../models/contracts';
import type { AiProvider } from '../models/run';
import { SchemaService } from './schema.service';

export interface OpenAiComputerUsePlan {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  tools: ResponseCreateParams['tools'];
  maxOutputTokens: number;
}

@Injectable()
export class OpenAiProviderService {
  private readonly logger = new Logger(OpenAiProviderService.name);
  private readonly client: OpenAI;
  readonly provider: AiProvider = 'openai';

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly schemaService: SchemaService,
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY', { infer: true });
    this.client = new OpenAI({ apiKey });
  }

  getModel(): string {
    return this.configService.get('OPENAI_MODEL', { infer: true }) ?? 'o4-mini';
  }

  getClient(): OpenAI {
    return this.client;
  }

  buildComputerUsePlan(task: TaskSpec, runId: string): OpenAiComputerUsePlan {
    const qaReportSchema = this.schemaService.getQaReportSchema();
    const serializedSchema = JSON.stringify(qaReportSchema, null, 2);

    const baseInstruction = [
      'You are an AI QA analyst using computer-use tools to inspect a dashboard.',
      `Task goal: ${task.goal}`,
      `Navigate to route ${task.route} on the authenticated page.`,
      'Use the provided tools to read the DOM and record assertions.',
      'Assume the user should already be authenticated. If you encounter a login block, multi-factor challenge, or cannot reach the dashboard, stop and produce an inconclusive QAReport describing the issue.',
      'At the end of the run, output ONLY a JSON object that matches the QAReport schema below. Do not include commentary or markdown.',
      'Schema:',
      serializedSchema,
    ].join('\n');

    const domSnapshotSchema = this.schemaService.getDomSnapshotSchema();
    const assertSchema = this.schemaService.getAssertToolSchema();

    const tools: ResponseCreateParams['tools'] = [
      {
        type: 'computer-preview',
        display_width: 1366,
        display_height: 768,
        environment: 'browser',
      },
      {
        type: 'function',
        name: 'dom_snapshot',
        description: 'Capture DOM content and attributes for targeted selectors.',
        parameters: domSnapshotSchema as Record<string, unknown>,
        strict: true,
      },
      {
        type: 'function',
        name: 'assert',
        description:
          'Record an assertion or finding with evidence that will be surfaced in the final QAReport.',
        parameters: assertSchema as Record<string, unknown>,
        strict: true,
      },
    ];

    return {
      model: this.getModel(),
      systemPrompt: baseInstruction,
      userPrompt: `Begin QA run ${runId}. Describe what you observe and ensure the dashboard loads correctly.`,
      tools,
      maxOutputTokens: 4000,
    };
  }
}
