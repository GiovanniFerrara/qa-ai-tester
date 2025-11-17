import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import type { ConfigService } from '@nestjs/config';

import type { AppEnvironment } from 'src/config/environment';

import { TaskRegistryService } from 'src/tasks/task-registry.service';
import { TaskStorageService } from 'src/tasks/task-storage.service';

class MockConfigService implements Pick<ConfigService<AppEnvironment, true>, 'get'> {
  constructor(private readonly values: Record<string, unknown>) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get<T = any>(key: string, _options?: { infer: boolean }): T {
    return this.values[key] as T;
  }
}

describe('TaskRegistryService', () => {
  let service: TaskRegistryService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'tasks-test-'));
    const storagePath = path.join(tempDir, 'tasks.json');
    const config = new MockConfigService({ TASKS_DB_PATH: storagePath }) as unknown as ConfigService<AppEnvironment, true>;
    const storage = new TaskStorageService(config);
    service = new TaskRegistryService(storage);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('registers default dashboard task on init', () => {
    const tasks = service.list();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'dashboard-sanity',
      name: 'Dashboard Sanity',
      route: '/dashboard',
      role: 'analyst',
    });
  });

  it('registers and retrieves custom tasks', () => {
    const spec = service.registerTask({
      name: 'Settings Flow',
      description: 'Validate settings flow for admin user',
      goal: 'Validate settings flow',
      instructions: 'Navigate through settings and confirm tabs render.',
      route: '/settings',
      role: 'admin',
      provider: 'openai',
      requireFindings: true,
      autoAuthEnabled: false,
      kpiSpec: {
        type: 'staticValues',
        values: { noop: 'ok' },
      },
      budgets: {
        maxToolCalls: 50,
        maxTimeMs: 60_000,
        maxScreenshots: 10,
      },
    });

    expect(service.get(spec.id)).toEqual(spec);
    expect(service.list()).toHaveLength(2);
  });
});
