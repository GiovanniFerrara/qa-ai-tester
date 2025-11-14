import { TaskSpec, RunState, CreateRunRequest, TaskInput, RunEvent } from './types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

export const api = {
  getTasks: () => fetchJSON<TaskSpec[]>(`${API_BASE}/tasks`),
  createTask: (data: TaskInput) =>
    fetchJSON<TaskSpec>(`${API_BASE}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTask: (taskId: string, data: Partial<TaskInput>) =>
    fetchJSON<TaskSpec>(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTask: (taskId: string) =>
    fetchJSON<{ success: boolean }>(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
    }),
  
  getRuns: () => fetchJSON<RunState[]>(`${API_BASE}/runs`),

  createRun: (data: CreateRunRequest) =>
    fetchJSON<RunState>(`${API_BASE}/runs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRun: (runId: string) =>
    fetchJSON<RunState>(`${API_BASE}/runs/${runId}`),

  subscribeToRunEvents: (runId: string, onEvent: (event: RunEvent) => void) => {
    const source = new EventSource(`${API_BASE}/runs/${runId}/events`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RunEvent;
        onEvent(data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to parse run event', error);
      }
    };
    return source;
  },
};
