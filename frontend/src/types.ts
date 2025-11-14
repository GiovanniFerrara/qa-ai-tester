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
  status: 'pass' | 'fail' | 'inconclusive';
  findings: Finding[];
  kpiTable: Array<{
    label: string;
    expected: string;
    observed: string;
    status: 'pass' | 'fail' | 'missing';
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
  };
}

export interface CreateRunRequest {
  taskId: string;
  provider?: string;
  model?: string;
}