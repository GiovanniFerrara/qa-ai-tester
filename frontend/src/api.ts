import { TaskSpec, Run, QAReport, CreateRunRequest, TaskInput } from './types';

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
  
  getRuns: () => fetchJSON<Run[]>(`${API_BASE}/runs`),
  
  createRun: (data: CreateRunRequest) =>
    fetchJSON<Run>(`${API_BASE}/runs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getRunReport: (runId: string) =>
    fetchJSON<QAReport>(`${API_BASE}/runs/${runId}`),
};
