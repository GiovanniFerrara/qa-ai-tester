import { Injectable } from '@nestjs/common';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { JsonSchema7Type } from 'zod-to-json-schema';

import {
  AssertToolRequestSchema,
  ComputerActionSchema,
  DomSnapshotRequestSchema,
  KpiOracleRequestSchema,
  QaReportSchema,
} from '../models/contracts';

@Injectable()
export class SchemaService {
  private readonly qaReportSchema: JsonSchema7Type;
  private readonly computerActionSchema: JsonSchema7Type;
  private readonly domSnapshotSchema: JsonSchema7Type;
  private readonly kpiOracleSchema: JsonSchema7Type;
  private readonly assertToolSchema: JsonSchema7Type;

  constructor() {
    this.qaReportSchema = zodToJsonSchema(QaReportSchema, { name: 'QAReport' }) as JsonSchema7Type;
    this.computerActionSchema = zodToJsonSchema(ComputerActionSchema, {
      name: 'ComputerAction',
    }) as JsonSchema7Type;
    this.domSnapshotSchema = zodToJsonSchema(DomSnapshotRequestSchema, {
      name: 'DomSnapshotRequest',
    }) as JsonSchema7Type;
    this.kpiOracleSchema = zodToJsonSchema(KpiOracleRequestSchema, {
      name: 'KpiOracleRequest',
    }) as JsonSchema7Type;
    this.assertToolSchema = zodToJsonSchema(AssertToolRequestSchema, {
      name: 'AssertToolRequest',
    }) as JsonSchema7Type;
  }

  getQaReportSchema(): JsonSchema7Type {
    return this.qaReportSchema;
  }

  getComputerActionSchema(): JsonSchema7Type {
    return this.computerActionSchema;
  }

  getDomSnapshotSchema(): JsonSchema7Type {
    return this.domSnapshotSchema;
  }

  getKpiOracleSchema(): JsonSchema7Type {
    return this.kpiOracleSchema;
  }

  getAssertToolSchema(): JsonSchema7Type {
    return this.assertToolSchema;
  }
}
