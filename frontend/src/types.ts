export type Provider = 'openai' | 'anthropic' | 'gemini';

export interface TaskSpec {
  id: string;
  name: string;
  description: string;
  goal: string;
  instructions: string;
  route: string;
  role: string;
  provider?: Provider;
  model?: string;
  requireFindings: boolean;
  autoAuthEnabled: boolean;
  budgets: {
    maxToolCalls: number;
    maxTimeMs: number;
    maxScreenshots: number;
  };
}

export interface TaskInput {
  name: string;
  description?: string;
  goal: string;
  instructions?: string;
  route: string;
  role: string;
  provider?: Provider;
  model?: string;
  requireFindings: boolean;
  autoAuthEnabled?: boolean;
  budgets?: {
    maxToolCalls?: number;
    maxTimeMs?: number;
    maxScreenshots?: number;
  };
}

export type DismissReason = 'false_positive' | 'fixed';

export interface FindingDismissal {
  reason: DismissReason;
  dismissedAt: string;
  dismissedBy?: string;
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
  dismissal?: FindingDismissal;
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
    priceUsd: number;
  };
}

export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface RunArtifacts {
  screenshots: string[];
  traceZipPath?: string;
  reportPath?: string;
  metadataPath?: string;
  logsPath?: string;
  transcriptPath?: string;
  eventsPath?: string;
}

export interface RunState {
  runId: string;
  taskId: string;
  provider: Provider;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  report?: QAReport;
  artifacts?: RunArtifacts;
  baseUrlOverride?: string | null;
}

export interface CreateRunRequest {
  taskId: string;
  provider?: Provider;
  model?: string;
  baseUrl?: string;
}

export type RunEventType = 'log' | 'tool_call' | 'screenshot' | 'status';

export interface RunEventPayload {
  [key: string]: unknown;
  image?: string;
  callId?: string;
  viewport?: {
    width: number;
    height: number;
  };
  report?: QAReport;
}

export interface RunEvent {
  type: RunEventType;
  message?: string;
  payload?: RunEventPayload;
  timestamp: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export class ApiException extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public error?: string
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export type ExecutionMode = 'parallel' | 'sequential';

export interface TaskCollection {
  id: string;
  name: string;
  description: string;
  taskIds: string[];
  executionMode: ExecutionMode;
  baseUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCollectionInput {
  name: string;
  description?: string;
  taskIds: string[];
  executionMode?: ExecutionMode;
  baseUrl?: string | null;
}

export interface CollectionRunItem {
  taskId: string;
  taskName?: string;
  runId?: string;
  status: RunStatus;
  error?: string;
}

export interface CollectionRunRecord {
  id: string;
  collectionId: string;
  executionMode: ExecutionMode;
  status: 'running' | 'completed' | 'cancelled';
  startedAt: string;
  finishedAt?: string;
  baseUrl?: string | null;
  items: CollectionRunItem[];
}
