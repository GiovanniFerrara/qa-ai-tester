import { TaskSpec, Run, QAReport, CreateRunRequest } from './types';

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
  
  getRuns: () => fetchJSON<Run[]>(`${API_BASE}/runs`),
  
  createRun: (data: CreateRunRequest) =>
    fetchJSON<Run>(`${API_BASE}/runs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getRunReport: (runId: string) =>
    fetchJSON<QAReport>(`${API_BASE}/runs/${runId}`),
};