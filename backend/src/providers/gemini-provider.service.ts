import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment, GoogleGenAI, type Tool } from '@google/genai';

import type { AppEnvironment } from '../config/environment';
import type { TaskSpec } from '../models/contracts';
import type { AiProvider } from '../models/run';
import { SchemaService } from './schema.service';

export interface GeminiComputerUsePlan {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  tools: Tool[];
  maxOutputTokens: number;
}

@Injectable()
export class GeminiProviderService {
  private readonly logger = new Logger(GeminiProviderService.name);
  private client: GoogleGenAI | null = null;
  readonly provider: AiProvider = 'gemini';

  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
    private readonly schemaService: SchemaService,
  ) {}

  getModel(): string {
    return (
      this.configService.get('GEMINI_MODEL', { infer: true }) ??
      'gemini-2.5-computer-use-preview-10-2025'
    );
  }

  getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = this.configService.get('GEMINI_API_KEY', { infer: true });
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY must be configured to use the Gemini provider.');
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  buildPlan(task: TaskSpec, runId: string): GeminiComputerUsePlan {
    const qaReportSchema = this.schemaService.getQaReportSchema();
    const domSnapshotSchema = this.schemaService.getDomSnapshotSchema();
    const assertSchema = this.schemaService.getAssertToolSchema();

    const baseInstructionLines = [
      'You are a meticulous QA analyst with permission to operate a browser via the Computer Use tool.',
      `Primary goal: ${task.goal}`,
      `Navigate to ${task.route} and validate that the dashboard renders correctly without regressions.`,
      'Rely on screenshots, DOM snapshots, and assert() calls to capture evidence.',
      'When you have enough signal—or become blocked—call qa_report_submit exactly once with the final QAReport JSON.',
      'Do not ask the user follow-up questions; act autonomously.',
    ];

    if (task.instructions && task.instructions.trim().length > 0) {
      baseInstructionLines.push('Additional task-specific instructions:');
      baseInstructionLines.push(task.instructions.trim());
    }

    const systemPrompt = baseInstructionLines.join('\n');

    const tools: Tool[] = [
      {
        computerUse: {
          environment: Environment.ENVIRONMENT_BROWSER,
        },
      },
      {
        functionDeclarations: [
          {
            name: 'dom_snapshot',
            description: 'Capture DOM content/attributes for selectors of interest.',
            parametersJsonSchema: domSnapshotSchema,
          },
          {
            name: 'assert',
            description: 'Persist a structured QA finding with evidence.',
            parametersJsonSchema: assertSchema,
          },
          {
            name: 'qa_report_submit',
            description: 'Submit the final QAReport JSON summary for the run.',
            parametersJsonSchema: qaReportSchema,
          },
        ],
      },
    ];

    const userPrompt = [
      `Begin QA run ${runId}.`,
      'Inspect the dashboard and gather evidence before submitting qa_report_submit.',
    ].join(' ');

    return {
      model: this.getModel(),
      systemPrompt,
      userPrompt,
      tools,
      maxOutputTokens: 4000,
    };
  }
}
