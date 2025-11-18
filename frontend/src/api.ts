import { TaskSpec, RunState, CreateRunRequest, TaskInput, RunEvent, ApiError, ApiException, DismissReason, TaskCollection, TaskCollectionInput, CollectionRunRecord, ExecutionMode } from './types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const init: RequestInit = {
    ...options,
    headers: isFormData
      ? options?.headers
      : {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
  };

  const response = await fetch(url, init);

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      throw new ApiException(
        response.status,
        response.statusText,
        response.statusText
      );
    }

    const message = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message;

    throw new ApiException(
      errorData.statusCode,
      message,
      errorData.error
    );
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

  contextualizeTask: (data: { prompt: string }) =>
    fetchJSON<TaskInput>(`${API_BASE}/tasks/contextualize`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transcribeAudio: (audio: Blob) => {
    const formData = new FormData();
    formData.append('audio', audio, 'quick-task.webm');
    return fetchJSON<{ text: string }>(`${API_BASE}/tasks/transcribe`, {
      method: 'POST',
      body: formData,
    });
  },
  
  getRuns: () => fetchJSON<RunState[]>(`${API_BASE}/runs`),
  getRunSummary: () =>
    fetchJSON<{
      totals: {
        total: number;
        completed: number;
        running: number;
        failed: number;
        passed: number;
        avgDurationMs: number;
        findings: number;
        totalCostUsd: number;
        monthCostUsd: number;
      };
      severity: Record<string, number>;
      urgentFindings: Array<{
        runId: string;
        assertion: string;
        severity: string;
        observed: string;
      }>;
      kpiAlerts: Array<{
        runId: string;
        label: string;
        expected: string;
        observed: string;
      }>;
      providerUsage: Record<string, number>;
    }>(`${API_BASE}/runs/summary`),

  createRun: (data: CreateRunRequest) =>
    fetchJSON<RunState>(`${API_BASE}/runs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRun: (runId: string) =>
    fetchJSON<RunState>(`${API_BASE}/runs/${runId}`),

  cancelRun: (runId: string) =>
    fetchJSON<{ success: boolean; run: RunState }>(`${API_BASE}/runs/${runId}/cancel`, {
      method: 'POST',
    }),

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

  dismissFinding: (runId: string, findingId: string, reason: DismissReason) =>
    fetchJSON<{ success: boolean }>(`${API_BASE}/runs/${runId}/findings/${findingId}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  restoreFinding: (runId: string, findingId: string) =>
    fetchJSON<{ success: boolean }>(`${API_BASE}/runs/${runId}/findings/${findingId}/restore`, {
      method: 'POST',
    }),

  dismissKpi: (runId: string, kpiLabel: string, reason: DismissReason) =>
    fetchJSON<{ success: boolean }>(`${API_BASE}/runs/${runId}/kpi/${encodeURIComponent(kpiLabel)}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  restoreKpi: (runId: string, kpiLabel: string) =>
    fetchJSON<{ success: boolean }>(`${API_BASE}/runs/${runId}/kpi/${encodeURIComponent(kpiLabel)}/restore`, {
      method: 'POST',
    }),

  getCollections: () => fetchJSON<TaskCollection[]>(`${API_BASE}/collections`),
  
  getCollection: (collectionId: string) =>
    fetchJSON<TaskCollection>(`${API_BASE}/collections/${collectionId}`),

  createCollection: (data: TaskCollectionInput) =>
    fetchJSON<TaskCollection>(`${API_BASE}/collections`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCollection: (collectionId: string, data: Partial<TaskCollectionInput>) =>
    fetchJSON<TaskCollection>(`${API_BASE}/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCollection: (collectionId: string) =>
    fetchJSON<{ success: boolean }>(`${API_BASE}/collections/${collectionId}`, {
      method: 'DELETE',
    }),

  startCollectionRun: (
    collectionId: string,
    payload?: { executionMode?: ExecutionMode; baseUrl?: string | null }
  ) =>
    fetchJSON<CollectionRunRecord>(`${API_BASE}/collections/${collectionId}/runs`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),

  getCollectionRuns: (collectionId: string) =>
    fetchJSON<CollectionRunRecord[]>(`${API_BASE}/collections/${collectionId}/runs`),

  getCollectionRun: (collectionId: string, runId: string) =>
    fetchJSON<CollectionRunRecord>(`${API_BASE}/collections/${collectionId}/runs/${runId}`),

  cancelCollectionRun: (collectionRunId: string) =>
    fetchJSON<{ success: boolean; run: CollectionRunRecord }>(
      `${API_BASE}/collection-runs/${collectionRunId}/cancel`,
      { method: 'POST' }
    ),
};
