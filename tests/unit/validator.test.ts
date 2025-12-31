/**
 * Validator Unit Tests
 */

import { Validator, validate } from '../../dsl/validator';
import type { Program, EntityDeclaration, FieldDeclaration } from '../../dsl/ast/types';

// Helper to create minimal AST structures
function createProgram(statements: any[]): Program {
  return {
    type: 'Program',
    version: '1.0',
    statements,
    location: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
  };
}

function createEntity(name: string, fields: any[] = []): EntityDeclaration {
  return {
    type: 'EntityDeclaration',
    name,
    fields,
    location: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
  };
}

function createField(name: string, type: string, annotations: any[] = []): FieldDeclaration {
  return {
    type: 'FieldDeclaration',
    name,
    fieldType: {
      type: 'TypeExpression',
      baseType: type,
      nullable: false,
      isArray: false,
      location: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
    },
    annotations,
    location: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } }
  };
}

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('Entity Validation', () => {
    it('should validate entity with valid fields', () => {
      const ast = createProgram([
        createEntity('Customer', [
          createField('id', 'UUID', [{ type: 'Annotation', name: 'generated', params: [], location: {} as any }]),
          createField('name', 'String'),
          createField('email', 'Email')
        ])
      ]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate entity names', () => {
      const ast = createProgram([
        createEntity('Customer'),
        createEntity('Customer')
      ]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E001')).toBe(true);
    });

    it('should detect duplicate field names', () => {
      const ast = createProgram([
        createEntity('Customer', [
          createField('name', 'String'),
          createField('name', 'String')
        ])
      ]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E102')).toBe(true);
    });

    it('should warn about missing ID field', () => {
      const ast = createProgram([
        createEntity('Customer', [
          createField('name', 'String')
        ])
      ]);

      const result = validator.validate(ast);

      expect(result.warnings.some(w => w.code === 'W101')).toBe(true);
    });

    it('should detect unknown types', () => {
      const ast = createProgram([
        createEntity('Customer', [
          createField('data', 'UnknownType')
        ])
      ]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E100')).toBe(true);
    });

    it('should accept all built-in types', () => {
      const builtInTypes = ['UUID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Date', 'Email', 'URL', 'JSON', 'Money'];
      
      for (const type of builtInTypes) {
        const ast = createProgram([
          createEntity('Test', [
            createField('field', type)
          ])
        ]);

        const result = validator.validate(ast);
        
        expect(result.errors.filter(e => e.code === 'E100')).toHaveLength(0);
      }
    });
  });

  describe('Event Validation', () => {
    it('should validate event with valid fields', () => {
      const ast = createProgram([{
        type: 'EventDeclaration',
        name: 'CustomerCreated',
        fields: [
          { type: 'EventField', name: 'customerId', fieldType: { type: 'TypeExpression', baseType: 'UUID', nullable: false, isArray: false, location: {} as any }, location: {} as any },
          { type: 'EventField', name: 'timestamp', fieldType: { type: 'TypeExpression', baseType: 'DateTime', nullable: false, isArray: false, location: {} as any }, location: {} as any }
        ],
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(true);
    });

    it('should warn about non-PascalCase event names', () => {
      const ast = createProgram([{
        type: 'EventDeclaration',
        name: 'customer_created',
        fields: [],
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.warnings.some(w => w.code === 'W201')).toBe(true);
    });

    it('should warn about missing timestamp field', () => {
      const ast = createProgram([{
        type: 'EventDeclaration',
        name: 'CustomerCreated',
        fields: [
          { type: 'EventField', name: 'customerId', fieldType: { type: 'TypeExpression', baseType: 'UUID', nullable: false, isArray: false, location: {} as any }, location: {} as any }
        ],
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.warnings.some(w => w.code === 'W202')).toBe(true);
    });
  });

  describe('Pipeline Validation', () => {
    it('should require INPUT in pipeline', () => {
      const ast = createProgram([{
        type: 'PipelineDeclaration',
        name: 'TestPipeline',
        outputs: ['dashboard'],
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E301')).toBe(true);
    });

    it('should require OUTPUT in pipeline', () => {
      const ast = createProgram([{
        type: 'PipelineDeclaration',
        name: 'TestPipeline',
        input: { type: 'DotPath', path: ['customers'], raw: 'customers', location: {} as any },
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E302')).toBe(true);
    });
  });

  describe('Alert Validation', () => {
    it('should require CONDITION in alert', () => {
      const ast = createProgram([{
        type: 'AlertDeclaration',
        name: { type: 'StringLiteral', value: 'Test Alert', location: {} as any },
        targets: [{ type: 'Target', protocol: 'email', path: 'test', location: {} as any }],
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E401')).toBe(true);
    });

    it('should require TARGET in alert', () => {
      const ast = createProgram([{
        type: 'AlertDeclaration',
        name: { type: 'StringLiteral', value: 'Test Alert', location: {} as any },
        condition: { type: 'BinaryExpression', operator: '>', left: { type: 'DotPath', path: ['risk'], raw: 'risk', location: {} as any }, right: { type: 'NumberLiteral', value: 80, location: {} as any }, location: {} as any },
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E402')).toBe(true);
    });

    it('should validate severity levels', () => {
      const ast = createProgram([{
        type: 'AlertDeclaration',
        name: { type: 'StringLiteral', value: 'Test', location: {} as any },
        condition: { type: 'DotPath', path: ['x'], raw: 'x', location: {} as any },
        targets: [{ type: 'Target', protocol: 'email', path: 'test', location: {} as any }],
        severity: 'invalid_severity',
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E403')).toBe(true);
    });
  });

  describe('Device Validation', () => {
    it('should require PROTOCOL in device', () => {
      const ast = createProgram([{
        type: 'DeviceDeclaration',
        name: { type: 'StringLiteral', value: 'test-device', location: {} as any },
        deviceType: 'led_matrix',
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E701')).toBe(true);
    });

    it('should validate protocol types', () => {
      const ast = createProgram([{
        type: 'DeviceDeclaration',
        name: { type: 'StringLiteral', value: 'test-device', location: {} as any },
        protocol: 'invalid_protocol',
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E702')).toBe(true);
    });

    it('should require TOPIC for MQTT devices', () => {
      const ast = createProgram([{
        type: 'DeviceDeclaration',
        name: { type: 'StringLiteral', value: 'test-device', location: {} as any },
        protocol: 'mqtt',
        location: {} as any
      }]);

      const result = validator.validate(ast);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'E703')).toBe(true);
    });
  });
});

describe('validate() function', () => {
  it('should work as standalone function', () => {
    const ast = createProgram([
      createEntity('Test', [createField('id', 'UUID')])
    ]);

    const result = validate(ast);

    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
  });
});
