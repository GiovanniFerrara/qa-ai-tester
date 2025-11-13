import type { ConfigService } from '@nestjs/config';

import type { AppEnvironment } from 'src/config/environment';
import { OpenAiProviderService } from 'src/providers/openai-provider.service';
import { SchemaService } from 'src/providers/schema.service';

describe('OpenAiProviderService', () => {
  const configValues = {
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_MODEL: 'o4-mini',
  };

  const createConfigService = (): ConfigService<AppEnvironment, true> =>
    ({
      get: jest.fn((key: keyof typeof configValues) => configValues[key]),
    } as unknown as ConfigService<AppEnvironment, true>);

  it('builds computer use plan with expected tools and schema', () => {
    const service = new OpenAiProviderService(createConfigService(), new SchemaService());
    const plan = service.buildComputerUsePlan(
      {
        id: 'task-1',
        goal: 'Check KPIs',
        route: '/dashboard',
        role: 'analyst',
        kpiSpec: { type: 'staticValues', values: { revenue: 100 } },
        budgets: { maxToolCalls: 10, maxTimeMs: 1000, maxScreenshots: 5 },
      },
      'run-123',
    );

    expect(plan.model).toBe('o4-mini');
    expect(plan.tools).toHaveLength(4);
    expect(plan.response_format.json_schema).toHaveProperty('schema');
    const toolNames = plan.tools.map((tool: { name: string }) => tool.name);
    expect(toolNames).toEqual(
      expect.arrayContaining(['computer_action', 'dom_snapshot', 'kpi_oracle', 'assert']),
    );
  });
});
