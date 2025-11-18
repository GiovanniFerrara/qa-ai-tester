import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  AssertToolRequestSchema,
  ComputerActionSchema,
  DomSnapshotRequestSchema,
  QaReportSchema,
} from '../src/models/contracts';

const OUTPUT_DIR = path.resolve('schemas');

const schemaDefinitions = {
  qaReport: QaReportSchema,
  computerAction: ComputerActionSchema,
  domSnapshotRequest: DomSnapshotRequestSchema,
  assertToolRequest: AssertToolRequestSchema,
} as const;

async function generateSchemas(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  await Promise.all(
    Object.entries(schemaDefinitions).map(async ([name, schema]) => {
      const jsonSchema = zodToJsonSchema(schema, { name });
      const outputPath = path.join(OUTPUT_DIR, `${name}.schema.json`);
      await writeFile(outputPath, JSON.stringify(jsonSchema, null, 2), 'utf8');
    }),
  );
}

generateSchemas().catch((error) => {
  // eslint-disable-next-line no-console -- script logging
  console.error('Schema generation failed', error);
  process.exitCode = 1;
});
