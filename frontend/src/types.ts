export interface TaskSpec {
  id: string;
  name: string;
  description: string;
  goal: string;
  instructions: string;
  route: string;
  role: string;
  provider?: string;
  model?: string;
  requireFindings: boolean;
  budgets: {
    maxToolCalls: number;
    maxTimeMs: number;
    maxScreenshots: number;
  };
  kpiSpec?: {
    type: 'staticValues' | 'apiEndpoint';
    values?: Record<string, string | number>;
    url?: string;
    params?: Record<string, unknown>;
    method?: 'GET' | 'POST';
  };
}

export interface TaskInput {
  name: string;
  description?: string;
  goal: string;
  instructions?: string;
  route: string;
  role: string;
  provider?: string;
  model?: string;
  requireFindings: boolean;
  budgets?: {
    maxToolCalls?: number;
    maxTimeMs?: number;
    maxScreenshots?: number;
  };
}

export interface Finding {
  id: string;
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'info';
  category: string;
  assertion: string;
  expected: string;
  observed: string;
  tolerance: string | null;
  evidence: Array<{
    screenshotRef: string;
    selector: string | null;
    time: string;
    networkRequestId: string | null;
  }>;
  suggestedFix: string;
  confidence: number;
}

export interface QAReport {
  id: string;
  runId: string;
  taskId: string;
  startedAt: string;
  finishedAt: string;
  summary: string;
  status: 'passed' | 'failed' | 'inconclusive';
  findings: Finding[];
  kpiTable: Array<{
    label: string;
    expected: string;
    observed: string;
    status: 'ok' | 'mismatch' | 'missing';
  }>;
  links: {
    traceUrl: string;
    screenshotsGalleryUrl: string;
    rawTranscriptUrl: string | null;
  };
  costs: {
    tokensInput: number;
    tokensOutput: number;
    toolCalls: number;
    durationMs: number;
  };
}

export interface Run {
  runId: string;
  provider: string;
  report: QAReport;
  artifacts: {
    screenshots: string[];
    traceZipPath: string;
    reportPath: string;
    metadataPath: string;
    logsPath: string;
    transcriptPath?: string;
    eventsPath?: string;
  };
}

export interface CreateRunRequest {
  taskId: string;
  provider?: string;
  model?: string;
}
