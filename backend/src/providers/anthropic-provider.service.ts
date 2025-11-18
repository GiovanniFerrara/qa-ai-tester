import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

import type { AppEnvironment } from '../config/environment';
import type { TaskSpec } from '../models/contracts';
import type { AiProvider } from '../models/run';
import { SchemaService } from './schema.service';

export type ClaudeToolDefinition =
  | {
      type: 'computer_20250124';
      name: 'computer';
      display_width_px: number;
      display_height_px: number;
      display_number: number;
    }
  | {
      name: string;
      description: string;
      input_schema: unknown;
    };

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
      }) ?? 'claude-sonnet-4-5-sonnet-20250219'
    );
  }

  getClient(): Anthropic {
    return this.client;
  }

  buildPlan(task: TaskSpec, runId: string): ClaudePlan {
    const toolDefinitions: ClaudeToolDefinition[] = [
      {
        type: 'computer_20250124',
        name: 'computer',
        display_width_px: 1366,
        display_height_px: 768,
        display_number: 0,
      },
      {
        name: 'dom_snapshot',
        description: 'Query DOM text and attributes for selectors of interest.',
        input_schema: this.schemaService.getDomSnapshotSchema(),
      },
      {
        name: 'assert',
        description: 'Persist a structured assertion / finding with supporting evidence.',
        input_schema: this.schemaService.getAssertToolSchema(),
      },
      {
        name: 'qa_report_submit',
        description: 'Submit the final QAReport JSON that summarizes the run.',
        input_schema: this.schemaService.getQaReportSchema(),
      },
    ];

    const systemPrompt = [
      'You are an AI QA analyst equipped with computer-use capabilities.',
      `Task: ${task.goal}`,
      `Navigate to ${task.route}.`,
      'Use tool calls to inspect the dashboard and log findings via assert.',
      'Once you have verified the key widgets (or determine you are blocked), stop exploring and call qa_report_submit exactly once.',
      'Never loop forever: after roughly 8-10 meaningful actions you should summarize and submit the QAReport.',
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
