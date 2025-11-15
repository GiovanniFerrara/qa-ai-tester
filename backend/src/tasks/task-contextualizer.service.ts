import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ResponseFormatTextJSONSchemaConfig } from 'openai/resources/responses/responses';

import { OpenAiProviderService } from '../providers/openai-provider.service';

const TaskDraftBudgetsSchema = z.object({
  maxToolCalls: z.number().int().positive().default(200),
  maxTimeMs: z.number().int().positive().default(180_000),
  maxScreenshots: z.number().int().positive().default(25),
});

export const TaskDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  goal: z.string().min(1),
  instructions: z.string().default(''),
  route: z.string().min(1),
  role: z.string().default('analyst'),
  provider: z.enum(['openai', 'anthropic']).default('openai'),
  model: z.string().optional(),
  requireFindings: z.boolean().default(true),
  budgets: TaskDraftBudgetsSchema.default({
    maxToolCalls: 200,
    maxTimeMs: 180_000,
    maxScreenshots: 25,
  }),
});

export type TaskDraft = z.infer<typeof TaskDraftSchema>;

@Injectable()
export class TaskContextualizerService {
  private readonly logger = new Logger(TaskContextualizerService.name);
  private readonly schema = (() => {
    const schema = zodToJsonSchema(TaskDraftSchema, {
      $refStrategy: 'none',
    }) as Record<string, any>;

    const properties = schema.properties as Record<string, any> | undefined;
    if (properties?.budgets) {
      const budgetProps = properties.budgets.properties as Record<string, any> | undefined;
      if (budgetProps) {
        properties.budgets.required = Object.keys(budgetProps);
      }
    }

    if (properties) {
      schema.required = Object.keys(properties);
    }

    return schema as Record<string, unknown>;
  })();
  private readonly structuredOutputFormat: ResponseFormatTextJSONSchemaConfig = {
    type: 'json_schema',
    name: 'TaskDraft',
    schema: this.schema,
    strict: true,
  };
  private readonly model = 'gpt-5-mini';
  private readonly systemPrompt = [
    'You translate informal QA automation requests into structured tasks for the QA AI Tester app.',
    'Produce concise titles, solid functional descriptions, and a clear goal that states success criteria.',
    'Always include a starting route or URL relative to the dashboard and highlight the primary persona in the role.',
    'Default provider to "openai" unless the user explicitly asks for another model.',
    'Set requireFindings=true unless the user instructs otherwise.',
    'Budgets must stay within reasonable limits: <=400 tool calls, <=600000 ms, <=50 screenshots.',
    'Return ONLY valid JSON that matches the provided schema. Do not wrap it in markdown.',
  ].join('\n');

  constructor(private readonly openAiProvider: OpenAiProviderService) {}

  async contextualize(prompt: string): Promise<TaskDraft> {
    const client = this.openAiProvider.getClient();
    const response = await client.responses.create({
      model: this.model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: this.systemPrompt,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt,
            },
          ],
        },
      ],
      text: {
        format: this.structuredOutputFormat,
      },
      truncation: 'auto',
    });

    const outputText = (response.output_text ?? '').trim();
    if (!outputText) {
      throw new Error('Task contextualizer returned an empty response.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch (error) {
      this.logger.error('Failed to parse contextualizer response.', error as Error);
      throw new Error('Unable to parse task contextualizer output.');
    }

    const validated = TaskDraftSchema.parse(parsed);
    return {
      ...validated,
      model: validated.model?.trim() ? validated.model : undefined,
      instructions: validated.instructions ?? '',
      description: validated.description ?? '',
    };
  }
}
