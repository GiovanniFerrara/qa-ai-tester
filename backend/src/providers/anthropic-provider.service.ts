import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

import type { AppEnvironment } from '../config/environment';
import type { TaskSpec } from '../models/contracts';
import type { AiProvider } from '../models/run';
import { SchemaService } from './schema.service';

export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: unknown;
}

export interface ClaudePlan {
  model: string;
  max_output_tokens: number;
  system: string;
  tools: ClaudeToolDefinition[];
  messages: Array<{
    role: 'user';
    content: string;
  }>;
}

@Injectable()
export class AnthropicProviderService {
  private readonly logger = new Logger(AnthropicProviderService.name);
  private readonly client: Anthropic;
  readonly provider: AiProvider = 'anthropic';

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly schemaService: SchemaService,
  ) {
    const apiKey = this.configService.get('CLAUDE_API_KEY', { infer: true });
    this.client = new Anthropic({ apiKey });
  }

  getModel(): string {
    return (
      this.configService.get('CLAUDE_MODEL', {
        infer: true,
      }) ?? 'claude-3-7-sonnet-20250219'
    );
  }

  getClient(): Anthropic {
    return this.client;
  }

  buildPlan(task: TaskSpec, runId: string): ClaudePlan {
    const toolDefinitions: ClaudeToolDefinition[] = [
      {
        name: 'computer_action',
        description:
          'Execute mouse and keyboard actions through the Playwright adapter and receive screenshots and telemetry.',
        input_schema: this.schemaService.getComputerActionSchema(),
      },
      {
        name: 'dom_snapshot',
        description: 'Query DOM text and attributes for selectors of interest.',
        input_schema: this.schemaService.getDomSnapshotSchema(),
      },
      {
        name: 'kpi_oracle',
        description: 'Retrieve expected KPI values to compare with visible dashboard metrics.',
        input_schema: this.schemaService.getKpiOracleSchema(),
      },
      {
        name: 'assert',
        description: 'Persist a structured assertion / finding with supporting evidence.',
        input_schema: this.schemaService.getAssertToolSchema(),
      },
    ];

    const systemPrompt = [
      'You are an AI QA analyst equipped with computer-use capabilities.',
      `Task: ${task.goal}`,
      `The authenticated browser is already at base url; navigate to ${task.route}.`,
      'Use tool calls to inspect the dashboard, compare values with kpi_oracle, and log findings.',
      'When finished, produce a final QAReport JSON strictly matching the schema provided separately in the orchestrator.',
    ].join('\n');

    return {
      model: this.getModel(),
      max_output_tokens: 4000,
      system: systemPrompt,
      tools: toolDefinitions,
      messages: [
        {
          role: 'user',
          content: `Begin QA run ${runId}`,
        },
      ],
    };
  }
}
