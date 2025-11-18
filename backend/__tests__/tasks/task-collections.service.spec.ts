import { TaskCollectionsService } from 'src/tasks/task-collections.service';
import type { TaskCollection } from 'src/models/collections';
import type { TaskSpec } from 'src/models/contracts';

const mockTask: TaskSpec = {
  id: 'task-1',
  name: 'Task 1',
  description: '',
  goal: '',
  instructions: '',
  route: '/',
  role: 'analyst',
  provider: 'openai',
  requireFindings: true,
  autoAuthEnabled: false,
  budgets: { maxToolCalls: 10, maxTimeMs: 1000, maxScreenshots: 5 },
};

describe('TaskCollectionsService', () => {
  const storage = {
    loadCollections: jest.fn().mockReturnValue([] as TaskCollection[]),
    saveCollections: jest.fn(),
  };
  const taskRegistry = {
    get: jest.fn().mockReturnValue(mockTask),
  };

  let service: TaskCollectionsService;

  beforeEach(() => {
    storage.loadCollections.mockReturnValue([]);
    storage.saveCollections.mockClear();
    taskRegistry.get.mockClear();
    taskRegistry.get.mockReturnValue(mockTask);
    service = new TaskCollectionsService(storage as never, taskRegistry as never);
  });

  it('creates and updates collections while validating task ids', () => {
    const created = service.create({
      name: 'Smoke Suite',
      taskIds: ['task-1'],
      executionMode: 'parallel',
      baseUrl: ' https://env.example.com ',
    });
    expect(created.id).toBeDefined();
    expect(created.baseUrl).toBe('https://env.example.com');
    expect(storage.saveCollections).toHaveBeenCalled();

    const updated = service.update(created.id, { executionMode: 'sequential', baseUrl: null });
    expect(updated.executionMode).toBe('sequential');
    expect(updated.baseUrl).toBeUndefined();
  });

  it('throws when referencing unknown tasks', () => {
    taskRegistry.get.mockReturnValueOnce(undefined);
    expect(() =>
      service.create({
        name: 'Invalid',
        taskIds: ['missing-task'],
      }),
    ).toThrow(/Task missing-task not found/);
  });
});
