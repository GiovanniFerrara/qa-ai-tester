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
    loadCollections: jest.fn().mockResolvedValue([] as TaskCollection[]),
    saveCollections: jest.fn().mockResolvedValue(undefined),
  };
  const taskRegistry = {
    get: jest.fn().mockReturnValue(mockTask),
  };

  let service: TaskCollectionsService;

  beforeEach(async () => {
    storage.loadCollections.mockResolvedValue([]);
    storage.saveCollections.mockClear();
    taskRegistry.get.mockClear();
    taskRegistry.get.mockReturnValue(mockTask);
    service = new TaskCollectionsService(storage as never, taskRegistry as never);
    await service.onModuleInit();
  });

  it('creates and updates collections while validating task ids', async () => {
    const created = await service.create({
      name: 'Smoke Suite',
      taskIds: ['task-1'],
      executionMode: 'parallel',
      baseUrl: ' https://env.example.com ',
    });
    expect(created.id).toBeDefined();
    expect(created.baseUrl).toBe('https://env.example.com');
    expect(storage.saveCollections).toHaveBeenCalled();

    const updated = await service.update(created.id, {
      executionMode: 'sequential',
      baseUrl: null,
    });
    expect(updated.executionMode).toBe('sequential');
    expect(updated.baseUrl).toBeUndefined();
  });

  it('throws when referencing unknown tasks', async () => {
    taskRegistry.get.mockReturnValueOnce(undefined);
    await expect(
      service.create({
        name: 'Invalid',
        taskIds: ['missing-task'],
      }),
    ).rejects.toThrow(/Task missing-task not found/);
  });
});
