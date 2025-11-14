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
        name: 'Dashboard Check',
        description: 'Ensure dashboard widgets render correctly.',
        goal: 'Check KPIs',
        instructions: 'Confirm charts render and note any missing data.',
        route: '/dashboard',
        role: 'analyst',
        provider: 'openai',
        requireFindings: true,
        kpiSpec: { type: 'staticValues', values: { revenue: 100 } },
        budgets: { maxToolCalls: 10, maxTimeMs: 1000, maxScreenshots: 5 },
      },
      'run-123',
    );

    expect(plan.model).toBe('o4-mini');
    expect(plan.tools).toBeDefined();
    const tools = plan.tools ?? [];
    const computerTool = tools.find((tool) => tool.type === 'computer-preview');
    expect(computerTool).toBeDefined();

    const functionTools = tools.filter(
      (tool): tool is Extract<typeof tools[number], { type: 'function'; name: string }> =>
        tool.type === 'function',
    );
    const functionNames = functionTools.map((tool) => tool.name);

    expect(functionNames).toEqual(expect.arrayContaining(['dom_snapshot', 'assert']));
  });
});
