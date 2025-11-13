export interface TaskSpec {
  id: string;
  name: string;
  description: string;
  provider?: string;
  model?: string;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  impact?: string;
  recommendation?: string;
  evidence?: {
    screenshot?: string;
    domSnapshot?: string;
    kpiData?: unknown;
  };
}

export interface QAReport {
  runId: string;
  taskId: string;
  status: 'completed' | 'failed' | 'in_progress';
  startedAt: string;
  completedAt?: string;
  findings: Finding[];
  summary: {
    totalFindings: number;
    bySeverity: Record<string, number>;
    passedChecks: number;
    failedChecks: number;
  };
  metadata?: {
    provider?: string;
    model?: string;
    duration?: number;
  };
}

export interface Run {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  report?: QAReport;
}

export interface CreateRunRequest {
  taskId: string;
  provider?: string;
  model?: string;
}