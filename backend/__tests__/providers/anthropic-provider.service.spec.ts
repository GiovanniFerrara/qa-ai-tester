import type { ConfigService } from '@nestjs/config';

import type { AppEnvironment } from 'src/config/environment';
import { AnthropicProviderService } from 'src/providers/anthropic-provider.service';
import { SchemaService } from 'src/providers/schema.service';

describe('AnthropicProviderService', () => {
  const configValues = {
    CLAUDE_API_KEY: 'test-claude-key',
    CLAUDE_MODEL: 'claude-sonnet-4-5',
  };

  const createConfigService = (): ConfigService<AppEnvironment, true> =>
    ({
      get: jest.fn((key: keyof typeof configValues) => configValues[key]),
    } as unknown as ConfigService<AppEnvironment, true>);

  it('builds claude plan with tool definitions', () => {
    const service = new AnthropicProviderService(createConfigService(), new SchemaService());
    const plan = service.buildPlan(
      {
        id: 'task-1',
        name: 'Dashboard Check',
        description: 'Ensure dashboard widgets render correctly.',
        goal: 'Check dashboard widgets',
        instructions: 'Confirm charts render and note any missing data.',
        route: '/dashboard',
        role: 'analyst',
        provider: 'anthropic',
        requireFindings: true,
        autoAuthEnabled: false,
        budgets: { maxToolCalls: 10, maxTimeMs: 1000, maxScreenshots: 5 },
      },
      'run-abc',
    );

    expect(plan.model).toBe('claude-sonnet-4-5');
    expect(plan.tools).toHaveLength(4);
    expect(plan.system).toContain('Use tool calls to inspect the dashboard');
    expect(plan.messages[0].content).toContain('run-abc');
  });
});
