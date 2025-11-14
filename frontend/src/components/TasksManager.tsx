import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { TaskInput, TaskSpec } from '../types';

const defaultBudgets = {
  maxToolCalls: 200,
  maxTimeMs: 180_000,
  maxScreenshots: 25,
};

const emptyTask: TaskInput = {
  name: '',
  description: '',
  goal: '',
  instructions: '',
  route: '',
  role: 'analyst',
  provider: 'openai',
  model: '',
  requireFindings: true,
  budgets: { ...defaultBudgets },
};

export function TasksManager() {
  const [tasks, setTasks] = useState<TaskSpec[]>([]);
  const [form, setForm] = useState<TaskInput>(emptyTask);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.name.localeCompare(b.name)),
    [tasks],
  );

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    }
  };

  const resetForm = () => {
    setForm({
      ...emptyTask,
      budgets: { ...defaultBudgets },
    });
    setEditingTaskId(null);
  };

  const handleEdit = (task: TaskSpec) => {
    setEditingTaskId(task.id);
    setForm({
      name: task.name,
      description: task.description ?? '',
      goal: task.goal,
      instructions: task.instructions ?? '',
      route: task.route,
      role: task.role,
      provider: task.provider ?? 'openai',
      model: task.model ?? '',
      requireFindings: task.requireFindings ?? true,
      budgets: {
        maxToolCalls: task.budgets?.maxToolCalls ?? defaultBudgets.maxToolCalls,
        maxTimeMs: task.budgets?.maxTimeMs ?? defaultBudgets.maxTimeMs,
        maxScreenshots: task.budgets?.maxScreenshots ?? defaultBudgets.maxScreenshots,
      },
    });
    setSuccess(null);
    setError(null);
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Delete this task? This action cannot be undone.')) return;
    try {
      await api.deleteTask(taskId);
      setSuccess('Task deleted.');
      setError(null);
      resetForm();
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload: TaskInput = {
      ...form,
      budgets: {
        maxToolCalls: Number(form.budgets?.maxToolCalls ?? defaultBudgets.maxToolCalls),
        maxTimeMs: Number(form.budgets?.maxTimeMs ?? defaultBudgets.maxTimeMs),
        maxScreenshots: Number(form.budgets?.maxScreenshots ?? defaultBudgets.maxScreenshots),
      },
    };

    try {
      if (editingTaskId) {
        await api.updateTask(editingTaskId, payload);
        setSuccess('Task updated successfully.');
      } else {
        await api.createTask(payload);
        setSuccess('Task created successfully.');
      }
      await loadTasks();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof TaskInput,
    value: string | boolean | TaskInput['budgets'],
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBudgetChange = (field: keyof NonNullable<TaskInput['budgets']>, value: number) => {
    setForm((prev) => ({
      ...prev,
      budgets: {
        ...prev.budgets,
        [field]: value,
      },
    }));
  };

  const selectedTask = editingTaskId
    ? tasks.find((task) => task.id === editingTaskId)
    : undefined;

  return (
    <div className="tasks-layout">
      <div className="tasks-sidebar card">
        <div className="tasks-header">
          <h2>Tasks</h2>
          <button className="secondary" onClick={resetForm}>
            + New Task
          </button>
        </div>
        {sortedTasks.length === 0 ? (
          <p>No tasks registered yet.</p>
        ) : (
          <ul className="tasks-list">
            {sortedTasks.map((task) => (
              <li key={task.id} className={task.id === editingTaskId ? 'active' : ''}>
                <button type="button" onClick={() => handleEdit(task)}>
                  <span className="task-name">{task.name}</span>
                  <span className="task-route">{task.route}</span>
                </button>
                <button
                  type="button"
                  className="danger small"
                  onClick={() => handleDelete(task.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card tasks-form">
        <h2>{editingTaskId ? 'Edit Task' : 'Create Task'}</h2>

        {error && <div className="error">{error}</div>}
        {success && (
          <div className="success-banner">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="task-form-grid">
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
            />
          </label>

          <label>
            Goal / Prompt
            <textarea
              value={form.goal}
              onChange={(e) => handleInputChange('goal', e.target.value)}
              rows={3}
              required
            />
          </label>

  <label>
            Additional Instructions
            <textarea
              value={form.instructions}
              onChange={(e) => handleInputChange('instructions', e.target.value)}
              rows={3}
            />
          </label>

          <div className="form-grid">
            <label>
              Start Route or URL
              <input
                type="text"
                value={form.route}
                onChange={(e) => handleInputChange('route', e.target.value)}
                required
              />
            </label>

            <label>
              Role
              <input
                type="text"
                value={form.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Provider
              <select
                value={form.provider ?? ''}
                onChange={(e) => handleInputChange('provider', e.target.value)}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>

            <label>
              Model (optional)
              <input
                type="text"
                value={form.model ?? ''}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="e.g., computer-use-preview"
              />
            </label>
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.requireFindings}
              onChange={(e) => handleInputChange('requireFindings', e.target.checked)}
            />
            Require at least one finding in reports
          </label>

          <fieldset className="budgets-fieldset">
            <legend>Budgets</legend>
            <div className="form-grid">
              <label>
                Max Tool Calls
                <input
                  type="number"
                  min={1}
                  value={form.budgets?.maxToolCalls ?? defaultBudgets.maxToolCalls}
                  onChange={(e) =>
                    handleBudgetChange('maxToolCalls', Number(e.target.value))
                  }
                />
              </label>
              <label>
                Max Time (ms)
                <input
                  type="number"
                  min={1000}
                  value={form.budgets?.maxTimeMs ?? defaultBudgets.maxTimeMs}
                  onChange={(e) =>
                    handleBudgetChange('maxTimeMs', Number(e.target.value))
                  }
                />
              </label>
              <label>
                Max Screenshots
                <input
                  type="number"
                  min={1}
                  value={form.budgets?.maxScreenshots ?? defaultBudgets.maxScreenshots}
                  onChange={(e) =>
                    handleBudgetChange('maxScreenshots', Number(e.target.value))
                  }
                />
              </label>
            </div>
          </fieldset>

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : editingTaskId ? 'Update Task' : 'Create Task'}
            </button>
            {editingTaskId && (
              <button
                type="button"
                className="secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {selectedTask && (
          <div className="task-preview">
            <h3>Current Task Preview</h3>
            <p>
              <strong>Name:</strong> {selectedTask.name}
            </p>
            <p>
              <strong>Route:</strong> {selectedTask.route}
            </p>
            <p>
              <strong>Goal:</strong> {selectedTask.goal}
            </p>
            {selectedTask.instructions && (
              <p>
                <strong>Instructions:</strong> {selectedTask.instructions}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
