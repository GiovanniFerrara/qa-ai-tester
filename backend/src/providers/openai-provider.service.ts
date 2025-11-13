import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type { AppEnvironment } from '../config/environment';
import type { TaskSpec } from '../models/contracts';
import type { AiProvider } from '../models/run';
import { SchemaService } from './schema.service';

export interface ComputerUseToolDefinition {
  name: string;
  description: string;
  input_schema: unknown;
}

export interface OpenAiComputerUsePlan {
  model: string;
  input: unknown;
  tools: ComputerUseToolDefinition[];
  max_output_tokens: number;
  parallel_tool_calls: boolean;
  response_format: {
    type: 'json_schema';
    json_schema: unknown;
  };
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
      'Use dom_snapshot to understand text, and kpi_oracle to fetch expected KPI values.',
      'Compare on-screen KPIs with oracle data and register assertions via the assert tool.',
      'Return a QAReport JSON adhering strictly to the provided schema.',
    ].join('\n');

    const toolDefinitions: ComputerUseToolDefinition[] = [
      {
        name: 'computer_action',
        description:
          'Execute low-level mouse and keyboard actions on the active Playwright page and receive a screenshot plus telemetry.',
        input_schema: this.schemaService.getComputerActionSchema(),
      },
      {
        name: 'dom_snapshot',
        description: 'Capture DOM content and attributes for targeted selectors.',
        input_schema: this.schemaService.getDomSnapshotSchema(),
      },
      {
        name: 'kpi_oracle',
        description: 'Fetch expected KPI values for validation against what is displayed in the UI.',
        input_schema: this.schemaService.getKpiOracleSchema(),
      },
      {
        name: 'assert',
        description:
          'Record an assertion or finding with evidence that will be surfaced in the final QAReport.',
        input_schema: this.schemaService.getAssertToolSchema(),
      },
    ];

    return {
      model: this.getModel(),
      input: [
        {
          role: 'system',
          content: baseInstruction,
        },
        {
          role: 'user',
          content: `Begin QA run ${runId}`,
        },
      ],
      tools: toolDefinitions,
      max_output_tokens: 4000,
      parallel_tool_calls: false,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'QAReport',
          schema: qaReportSchema,
          strict: true,
        },
      },
    };
  }
}
