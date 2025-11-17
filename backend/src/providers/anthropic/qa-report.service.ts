import { Injectable, Logger } from '@nestjs/common';
import type { ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import type { ZodIssue } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import {
  QaReportSchema,
  type QaReport,
  type Finding,
  type TaskSpec,
} from '../../models/contracts';
import type { RunEvent } from '../../orchestrator/run-events.service';
import { safeStringify } from './utils';

export interface QaReportContext {
  task: TaskSpec;
  initialScreenshotPath: string;
  startedAt: Date;
}

@Injectable()
export class AnthropicQaReportService {
  private readonly logger = new Logger(AnthropicQaReportService.name);

  parseToolSubmit(params: {
    toolUse: ToolUseBlock;
    findingsFromTool: Finding[];
    context: QaReportContext;
    emitEvent?: (event: RunEvent) => void;
  }): QaReport | null {
    const { toolUse, findingsFromTool, context, emitEvent } = params;
    const parsed = QaReportSchema.safeParse(toolUse.input ?? {});

    if (!parsed.success) {
      const issueSummary = this.formatZodIssues(parsed.error.issues);
      this.logger.warn(
        `Invalid QA report payload received for tool_use ${toolUse.id}: ${issueSummary}`,
      );
      emitEvent?.({
        type: 'log',
        message: `qa_report_submit validation failed: ${issueSummary}`,
        payload: {
          toolUseId: toolUse.id,
          rawInput: safeStringify(toolUse.input),
          issues: parsed.error.issues,
        },
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    const report = parsed.data;
    if (!report.findings.length && findingsFromTool.length) {
      report.findings = findingsFromTool;
    }
    if (context.task.requireFindings && report.findings.length === 0) {
      report.findings = [
        this.buildDefaultFinding(
          context,
          'No explicit findings reported by the AI session.',
        ),
      ];
    }
    return report;
  }

  tryParseFromText(
    text: string,
    findings: Finding[],
    context: QaReportContext,
  ): QaReport | null {
    if (!text?.includes('{')) {
      return null;
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }
    try {
      const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
      const reportCandidate = QaReportSchema.parse(parsed);
      if (!reportCandidate.findings.length && findings.length) {
        reportCandidate.findings = findings;
      }
      if (context.task.requireFindings && reportCandidate.findings.length === 0) {
        reportCandidate.findings = [
          this.buildDefaultFinding(
            context,
            'No explicit findings recorded before session completion.',
          ),
        ];
      }
      return reportCandidate;
    } catch (error) {
      this.logger.warn(
        `Failed to parse QA report from assistant text: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private buildDefaultFinding(context: QaReportContext, message: string): Finding {
    return {
      id: uuidv4(),
      severity: 'info',
      category: 'functional',
      assertion: 'AI session summary',
      expected: 'At least one finding should summarize the session outcome.',
      observed: message,
      tolerance: null,
      evidence: [
        {
          screenshotRef: context.initialScreenshotPath,
          selector: null,
          time: context.startedAt.toISOString(),
          networkRequestId: null,
        },
      ],
      suggestedFix: 'Review the run transcript for context.',
      confidence: 0.5,
    };
  }

  private formatZodIssues(issues: ZodIssue[]): string {
    if (!issues.length) {
      return 'Unknown validation error';
    }
    return issues
      .map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : '(root)';
        return `${path}: ${issue.message}`;
      })
      .join('; ');
  }
}
