import { Injectable } from '@nestjs/common';
import type { JsonSchema7Type } from 'zod-to-json-schema';

import {
  assertToolRequestSchemaJson,
  computerActionSchemaJson,
  qaReportSchemaJson,
} from '../schemas/generated';

@Injectable()
export class SchemaService {
  private readonly qaReportSchema: JsonSchema7Type;
  private readonly computerActionSchema: JsonSchema7Type;
  private readonly domSnapshotSchema: JsonSchema7Type;
  private readonly assertToolSchema: JsonSchema7Type;

  constructor() {
    this.qaReportSchema = this.extractRootSchema(qaReportSchemaJson, 'QAReport');
    this.computerActionSchema = this.extractRootSchema(computerActionSchemaJson, 'ComputerAction');
    this.domSnapshotSchema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        selector: { type: 'string' },
        mode: {
          type: 'string',
          enum: ['single', 'all'],
          default: 'single',
        },
        attributes: {
          type: 'array',
          items: { type: 'string' },
          default: [],
        },
        computed: {
          type: 'array',
          items: { type: 'string' },
          default: [],
        },
      },
      required: ['selector', 'mode', 'attributes', 'computed'],
    } as JsonSchema7Type;
    this.assertToolSchema = this.extractRootSchema(
      assertToolRequestSchemaJson,
      'AssertToolRequest',
    );
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

  getAssertToolSchema(): JsonSchema7Type {
    return this.assertToolSchema;
  }

  private extractRootSchema(schema: unknown, definitionName: string): JsonSchema7Type {
    const jsonSchema = schema as { definitions?: Record<string, JsonSchema7Type>; $ref?: string };
    if (jsonSchema.definitions?.[definitionName]) {
      return jsonSchema.definitions[definitionName];
    }
    return jsonSchema as JsonSchema7Type;
  }
}
