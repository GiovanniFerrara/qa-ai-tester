import { z } from 'zod';

export const EvidenceRefSchema = z.object({
  screenshotRef: z.string(),
  selector: z.string().nullable(),
  time: z.string(),
  networkRequestId: z.string().nullable(),
});

export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const FindingSeverity = z.enum(['blocker', 'critical', 'major', 'minor', 'info']);

export const FindingCategory = z.enum([
  'functional',
  'data-consistency',
  'performance',
  'a11y',
  'reliability',
]);

export const FindingSchema = z.object({
  id: z.string(),
  severity: FindingSeverity,
  category: FindingCategory,
  assertion: z.string(),
  expected: z.string(),
  observed: z.string(),
  tolerance: z.string().nullable(),
  evidence: z.array(EvidenceRefSchema),
  suggestedFix: z.string(),
  confidence: z.number().min(0).max(1),
});

export type Finding = z.infer<typeof FindingSchema>;

export const KpiSpecSchema = z.union([
  z.object({
    type: z.literal('staticValues'),
    values: z.record(z.union([z.string(), z.number()])),
  }),
  z.object({
    type: z.literal('apiEndpoint'),
    url: z.string(),
    params: z.record(z.any()).optional(),
    method: z.enum(['GET', 'POST']).default('GET'),
  }),
]);

export type KpiSpec = z.infer<typeof KpiSpecSchema>;

export const BudgetSchema = z.object({
  maxToolCalls: z.number().int().positive(),
  maxTimeMs: z.number().int().positive(),
  maxScreenshots: z.number().int().positive(),
});

export type Budgets = z.infer<typeof BudgetSchema>;

export const TaskSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  goal: z.string(),
  instructions: z.string().default(''),
  route: z.string(),
  role: z.string(),
  provider: z.string().optional(),
  model: z.string().optional(),
  requireFindings: z.boolean().default(true),
  autoAuthEnabled: z.boolean().default(false),
  kpiSpec: KpiSpecSchema,
  budgets: BudgetSchema,
});

export type TaskSpec = z.infer<typeof TaskSpecSchema>;

export const KpiTableRowSchema = z.object({
  label: z.string(),
  expected: z.string(),
  observed: z.string(),
  status: z.enum(['ok', 'mismatch', 'missing']),
});

export type KpiTableRow = z.infer<typeof KpiTableRowSchema>;

export const QaReportSchema = z.object({
  id: z.string(),
  runId: z.string(),
  taskId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  summary: z.string(),
  status: z.enum(['passed', 'failed', 'inconclusive']),
  findings: z.array(FindingSchema),
  kpiTable: z.array(KpiTableRowSchema),
  links: z.object({
    traceUrl: z.string().nullable(),
    screenshotsGalleryUrl: z.string().nullable(),
    rawTranscriptUrl: z.string().nullable(),
  }),
  costs: z.object({
    tokensInput: z.number().int().nonnegative(),
    tokensOutput: z.number().int().nonnegative(),
    toolCalls: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    priceUsd: z.number().nonnegative(),
  }),
});

export type QaReport = z.infer<typeof QaReportSchema>;

export const ComputerActionSchema = z.object({
  action: z.enum([
    'move',
    'click',
    'double_click',
    'right_click',
    'type',
    'hotkey',
    'scroll',
    'hover',
    'drag',
    'wait',
    'screenshot',
    'keypress',
  ]),
  coords: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .nullable()
    .optional(),
  selector: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  hotkey: z.string().nullable().optional(),
  scroll: z
    .object({
      deltaX: z.number().default(0),
      deltaY: z.number().default(0),
    })
    .nullable()
    .optional(),
  wait: z
    .object({
      type: z.enum(['ms', 'networkidle', 'selectorVisible']),
      value: z.number().optional(),
      selector: z.string().optional(),
    })
    .nullable()
    .optional(),
  path: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
      }),
    )
    .optional(),
  keys: z.array(z.string()).optional(),
});

export type ComputerAction = z.infer<typeof ComputerActionSchema>;

export const ComputerActionResultSchema = z.object({
  screenshot: z.string(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
  consoleEvents: z
    .array(
      z.object({
        level: z.enum(['log', 'info', 'warn', 'error']),
        text: z.string(),
        timestamp: z.string(),
      }),
    )
    .default([]),
  networkEvents: z
    .array(
      z.object({
        requestId: z.string(),
        url: z.string(),
        status: z.number().nullable(),
        timestamp: z.string(),
      }),
    )
    .default([]),
});

export type ComputerActionResult = z.infer<typeof ComputerActionResultSchema>;

export const DomSnapshotRequestSchema = z.object({
  selector: z.string(),
  mode: z.enum(['single', 'all']).default('single'),
  attributes: z.array(z.string()).default([]),
});

export type DomSnapshotRequest = z.infer<typeof DomSnapshotRequestSchema>;

export const DomSnapshotResponseSchema = z.object({
  elements: z.array(
    z.object({
      selector: z.string(),
      innerText: z.string(),
      attributes: z.record(z.string().nullable()),
      boundingBox: z
        .object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        })
        .nullable(),
    }),
  ),
});

export type DomSnapshotResponse = z.infer<typeof DomSnapshotResponseSchema>;

export const KpiOracleRequestSchema = z.object({
  spec: KpiSpecSchema,
  context: z.record(z.any()).default({}),
});

export type KpiOracleRequest = z.infer<typeof KpiOracleRequestSchema>;

export const KpiOracleResponseSchema = z.object({
  data: z.record(z.union([z.string(), z.number()])),
});

export type KpiOracleResponse = z.infer<typeof KpiOracleResponseSchema>;

export const AssertToolRequestSchema = z.object({
  severity: FindingSeverity,
  category: FindingCategory,
  assertion: z.string(),
  expected: z.string(),
  observed: z.string(),
  tolerance: z.string().nullable(),
  evidence: z.array(EvidenceRefSchema),
  suggestedFix: z.string(),
  confidence: z.number().min(0).max(1),
});

export type AssertToolRequest = z.infer<typeof AssertToolRequestSchema>;

export const AssertToolResponseSchema = z.object({
  assertionId: z.string(),
});

export type AssertToolResponse = z.infer<typeof AssertToolResponseSchema>;
