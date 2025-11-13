import { SchemaService } from 'src/providers/schema.service';

describe('SchemaService', () => {
  let service: SchemaService;

  beforeEach(() => {
    service = new SchemaService();
  });

  it('provides QA report schema with expected structure', () => {
    const schema = service.getQaReportSchema();
    const schemaObj = schema as Record<string, any>;
    const qaReportSchema = schemaObj.definitions?.QAReport ?? schemaObj;
    expect(qaReportSchema).toHaveProperty('type', 'object');
    expect(qaReportSchema).toHaveProperty('properties');
    expect(qaReportSchema.properties).toHaveProperty('summary');
  });

  it('exposes computer action schema with enum actions', () => {
    const schema = service.getComputerActionSchema();
    const schemaObj = schema as Record<string, any>;
    const computerActionSchema = schemaObj.definitions?.ComputerAction ?? schemaObj;
    const actionEnum = computerActionSchema.properties?.action?.enum;
    expect(actionEnum).toEqual(
      expect.arrayContaining(['click', 'type', 'scroll']),
    );
  });
});
