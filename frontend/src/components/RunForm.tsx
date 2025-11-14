import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskSpec } from '../types';
import { api } from '../api';

export function RunForm() {
  const [tasks, setTasks] = useState<TaskSpec[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
      if (data.length > 0) {
        setSelectedTaskId(data[0].id);
        setProvider(data[0].provider ?? '');
        setModel(data[0].model ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    }
  };

  const handleTaskChange = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setProvider(task.provider ?? '');
      setModel(task.model ?? '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const run = await api.createRun({
        taskId: selectedTaskId,
        provider: provider || undefined,
        model: model || undefined,
      });
      setSuccess(`Run ${run.runId} started.`);
      navigate(`/runs/${run.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run');
    } finally {
      setLoading(false);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>No Tasks Available</h3>
          <p>Please register tasks before creating runs.</p>
        </div>
      </div>
    );
  }

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  return (
    <div className="card">
      <h2>Start New QA Run</h2>

      {error && <div className="error">{error}</div>}
      {success && (
        <div
          style={{
            background: '#d1e7dd',
            color: '#0f5132',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="task">Select Task</label>
          <select
            id="task"
            value={selectedTaskId}
            onChange={(e) => handleTaskChange(e.target.value)}
            required
          >
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="provider">Provider (optional)</label>
          <select id="provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="">Default</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="model">Model (optional)</label>
          <input
            id="model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g., gpt-4, claude-3-opus"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Starting Run...' : 'Start Run'}
        </button>
      </form>

      {selectedTask && (
        <div className="task-preview">
          <h3>{selectedTask.name}</h3>
          {selectedTask.description && <p>{selectedTask.description}</p>}
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
  );
}
