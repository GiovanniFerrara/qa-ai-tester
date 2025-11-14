import type { QaReport, TaskSpec } from './contracts';

export type AiProvider = 'openai' | 'anthropic';

export interface RunBudgets {
  startTime: number;
  maxTimeMs: number;
  maxToolCalls: number;
  maxScreenshots: number;
}

export interface ToolCallMetrics {
  toolCalls: number;
  screenshots: number;
}

export interface RunArtifacts {
  screenshots: string[];
  traceZipPath?: string;
  transcriptPath?: string;
  logsPath?: string;
  reportPath?: string;
  metadataPath?: string;
  eventsPath?: string;
}

export interface RunContext {
  runId: string;
  task: TaskSpec;
  provider: AiProvider;
  workspaceRoot: string;
  artifactDir: string;
  baseUrl: string;
}

export interface RunResult {
  report: QaReport;
  artifacts: RunArtifacts;
}
