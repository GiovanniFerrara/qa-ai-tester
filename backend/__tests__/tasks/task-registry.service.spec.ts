import { TaskRegistryService } from 'src/tasks/task-registry.service';

describe('TaskRegistryService', () => {
  let service: TaskRegistryService;

  beforeEach(() => {
    service = new TaskRegistryService();
  });

  it('registers default dashboard task on init', () => {
    const tasks = service.list();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'dashboard-sanity',
      route: '/dashboard',
      role: 'analyst',
    });
  });

  it('registers and retrieves custom tasks', () => {
    const spec = service.registerTask({
      goal: 'Validate settings flow',
      route: '/settings',
      role: 'admin',
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
