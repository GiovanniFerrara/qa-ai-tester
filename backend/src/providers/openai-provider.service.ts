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
  textFormat: ResponseFormatTextJSONSchemaConfig;
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

    const baseInstruction = [
      'You are an AI QA analyst using computer-use tools to inspect a dashboard.',
      `Task goal: ${task.goal}`,
      `Navigate to route ${task.route} on the authenticated page.`,
      'Use the provided tools to read the DOM, fetch KPI reference data when available, and record assertions.',
      'Return a QAReport JSON adhering strictly to the provided schema at the end of the session.',
    ].join('\n');

    const domSnapshotSchema = this.schemaService.getDomSnapshotSchema();
    const kpiOracleSchema = this.schemaService.getKpiOracleSchema();
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
        name: 'kpi_oracle',
        description:
          'Fetch expected KPI values for validation against what is displayed in the UI.',
        parameters: kpiOracleSchema as Record<string, unknown>,
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
      textFormat: {
        name: 'QAReport',
        type: 'json_schema',
        schema: qaReportSchema as Record<string, unknown>,
        strict: true,
      },
    };
  }
}
