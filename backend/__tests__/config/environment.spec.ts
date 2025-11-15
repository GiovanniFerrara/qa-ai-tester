import { EnvSchema, validateEnvironment } from 'src/config/environment';

describe('Environment configuration', () => {
  const baseEnv = {
    NODE_ENV: 'test',
    OPENAI_API_KEY: 'openai-key',
    CLAUDE_API_KEY: 'claude-key',
    BASE_URL: 'https://example.com',
    STORAGE_STATE_PATH: 'playwright/.auth/analyst.json',
    ARTIFACT_DIR: 'artifacts',
    DEFAULT_PROVIDER: 'openai',
    OPENAI_MODEL: 'computer-use-preview',
    CLAUDE_MODEL: 'claude-sonnet-4-5',
    KPI_ENDPOINT: '/api/kpi',
    KPI_TOLERANCE_PERCENT: '1',
  };

  it('validates a complete environment', () => {
    const parsed = validateEnvironment(baseEnv);
    expect(parsed).toMatchObject({
      OPENAI_API_KEY: 'openai-key',
      CLAUDE_API_KEY: 'claude-key',
      BASE_URL: 'https://example.com',
    });
    expect(EnvSchema.safeParse(baseEnv).success).toBe(true);
  });

  it('throws when required keys are missing', () => {
    const invalidEnv = { ...baseEnv, OPENAI_API_KEY: '' };
    expect(() => validateEnvironment(invalidEnv)).toThrow(/OPENAI_API_KEY/);
  });
});
