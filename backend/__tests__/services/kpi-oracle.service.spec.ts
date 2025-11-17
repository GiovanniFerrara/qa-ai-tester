jest.mock('undici', () => ({
  fetch: jest.fn(),
}));

import type { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

import type { AppEnvironment } from 'src/config/environment';
import { KpiOracleService } from 'src/services/kpi-oracle.service';

const mockedFetch = fetch as unknown as jest.Mock;

describe('KpiOracleService', () => {
  const createConfigService = (
    overrides: Partial<Record<keyof AppEnvironment, unknown>> = {},
  ): ConfigService<AppEnvironment, true> => {
    const defaults: Record<keyof AppEnvironment, unknown> = {
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'openai',
      CLAUDE_API_KEY: 'claude',
      BASE_URL: 'https://qa.example',
      TASKS_DB_PATH: '',
      RUNS_DB_PATH: '',
      TASK_COLLECTIONS_DB_PATH: '',
      COLLECTION_RUNS_DB_PATH: '',
      KPI_BASE_URL: 'https://api.example',
      STORAGE_STATE_PATH: 'state.json',
      ARTIFACT_DIR: 'artifacts',
      LOGIN_USERNAME: 'demo@qa.ai',
      LOGIN_PASSWORD: 'password',
      DEFAULT_PROVIDER: 'openai',
      OPENAI_MODEL: 'computer-use-preview',
      CLAUDE_MODEL: 'claude',
      KPI_ENDPOINT: '/api/kpi',
      KPI_TOLERANCE_PERCENT: '1',
    };
    return {
      get: jest.fn((key: keyof AppEnvironment) => (overrides[key] ?? defaults[key]) as never),
    } as unknown as ConfigService<AppEnvironment, true>;
  };

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('returns static values without calling fetch', async () => {
    const service = new KpiOracleService(createConfigService());
    const result = await service.resolve(
      { type: 'staticValues', values: { revenue: 123 } },
      { range: 'today' },
    );

    expect(result).toEqual({ data: { revenue: 123 } });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('performs GET fetch when apiEndpoint spec defined', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      text: async () => JSON.stringify({ revenue: 200 }),
    });
    const service = new KpiOracleService(createConfigService());
    const result = await service.resolve(
      {
        type: 'apiEndpoint',
        url: '/api/kpi',
        method: 'GET',
        params: { range: 'last7days' },
      },
      { role: 'analyst' },
    );

    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.example/api/kpi?range=last7days&role=analyst',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual({ data: { revenue: 200 } });
  });

  it('throws when fetch responds with non-OK status', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
      headers: {
        get: () => 'text/html',
      },
    });

    const service = new KpiOracleService(createConfigService());
    await expect(
      service.resolve(
        {
          type: 'apiEndpoint',
          url: '/api/kpi',
          method: 'POST',
          params: { range: 'today' },
        },
        { role: 'analyst' },
      ),
    ).rejects.toThrow(/KPI oracle request failed/);

    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.example/api/kpi',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
