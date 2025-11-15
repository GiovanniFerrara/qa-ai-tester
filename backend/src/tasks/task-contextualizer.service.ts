import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ResponseFormatTextJSONSchemaConfig } from 'openai/resources/responses/responses';

import { OpenAiProviderService } from '../providers/openai-provider.service';

export const TaskDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  goal: z.string().min(1),
  instructions: z.string().default(''),
  route: z.string().min(1),
  role: z.string().default('analyst'),
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
    'Generate only the basic task fields: name, description, goal, instructions, route, and role.',
    '',
    'Testing principles to apply when the feature scope is unclear:',
    '- Error handling: Test with invalid inputs, missing required fields, unexpected formats',
    '- Boundary testing: Test minimum/maximum values, empty inputs, special characters',
    '- Form validation: Test required fields, field length limits, invalid email/phone formats',
    '- Input attacks: Test for SQL injection patterns, XSS attempts, script injection',
    '- Navigation: Test back/forward buttons, deep links, breadcrumb navigation',
    '- UI interactions: Test all clickable elements, hover states, disabled states',
    '- Data persistence: Verify data saves correctly, refreshes maintain state',
    '- Visual checks: Verify layout integrity, text readability, image loading',
    '- Accessibility basics: Check for alt text, keyboard navigation, focus indicators',
    '',
    'Do NOT over-infer or imagine complex features. Stick to observable, testable behaviors.',
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
      instructions: validated.instructions ?? '',
      description: validated.description ?? '',
    };
  }
}
