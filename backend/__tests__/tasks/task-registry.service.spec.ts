import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import type { ConfigService } from '@nestjs/config';

import type { AppEnvironment } from 'src/config/environment';

import { TaskRegistryService } from 'src/tasks/task-registry.service';
import { TaskStorageService } from 'src/tasks/task-storage.service';
import { StorageFactoryService } from 'src/storage/storage-factory.service';

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

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'tasks-test-'));
    const storagePath = path.join(tempDir, 'tasks.json');
    const config = new MockConfigService({ TASKS_DB_PATH: storagePath }) as unknown as ConfigService<AppEnvironment, true>;
    const storageFactory = new StorageFactoryService(config);
    const storage = new TaskStorageService(config, storageFactory);
    service = new TaskRegistryService(storage);
    await service.onModuleInit();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('starts empty when no tasks are persisted', () => {
    expect(service.list()).toHaveLength(0);
  });

  it('registers and retrieves custom tasks', async () => {
    const spec = await service.registerTask({
      name: 'Settings Flow',
      description: 'Validate settings flow for admin user',
      goal: 'Validate settings flow',
      instructions: 'Navigate through settings and confirm tabs render.',
      route: '/settings',
      role: 'admin',
      provider: 'openai',
      requireFindings: true,
      autoAuthEnabled: false,
      budgets: {
        maxToolCalls: 50,
        maxTimeMs: 60_000,
        maxScreenshots: 10,
      },
    });

    expect(service.get(spec.id)).toEqual(spec);
    expect(service.list()).toHaveLength(1);
  });
});
