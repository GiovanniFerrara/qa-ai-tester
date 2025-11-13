import { useState, useEffect } from 'react';
import { TaskSpec } from '../types';
import { api } from '../api';

interface TaskListProps {
  onSelectTask: (taskId: string) => void;
}

export function TaskList({ onSelectTask }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    onSelectTask(taskId);
  };

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">Error: {error}</div>
        <button onClick={loadTasks}>Retry</button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>No Tasks Available</h3>
          <p>No QA tasks have been registered yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Available QA Tasks</h2>
      <div className="task-grid">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`task-card ${selectedTaskId === task.id ? 'selected' : ''}`}
            onClick={() => handleSelectTask(task.id)}
          >
            <h3>{task.name}</h3>
            <p>{task.description}</p>
            <div className="task-meta">
              {task.provider && <span className="badge badge-provider">{task.provider}</span>}
              {task.model && <span className="badge badge-model">{task.model}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
