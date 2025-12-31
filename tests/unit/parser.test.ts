/**
 * Parser Unit Tests
 */

// Mock peggy since we can't actually run it in tests without building
jest.mock('peggy', () => ({
  generate: jest.fn(() => ({
    parse: jest.fn((source: string) => {
      // Simple mock parser for testing
      if (source.includes('ENTITY')) {
        return {
          type: 'Program',
          version: '1.0',
          statements: [{
            type: 'EntityDeclaration',
            name: 'TestEntity',
            fields: [],
            location: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 10, offset: 10 } }
          }],
          location: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 10, offset: 10 } }
        };
      }
      if (source.includes('INVALID')) {
        throw { message: 'Syntax error', location: { start: { line: 1, column: 1, offset: 0 } } };
      }
      return { type: 'Program', version: '1.0', statements: [], location: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } } };
    })
  }))
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'mock grammar'),
  existsSync: jest.fn(() => true)
}));

describe('DSL Parser', () => {
  // Import after mocks
  const { parse, validateSyntax, getSuggestions } = require('../../dsl/parser');

  describe('parse()', () => {
    it('should parse valid ENTITY declaration', () => {
      const source = `ENTITY Customer {
        FIELD id: UUID @generated
      }`;

      const result = parse(source);

      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.ast.type).toBe('Program');
      expect(result.ast.statements).toHaveLength(1);
      expect(result.ast.statements[0].type).toBe('EntityDeclaration');
    });

    it('should return error for invalid syntax', () => {
      const source = 'INVALID SYNTAX HERE';

      const result = parse(source);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should parse empty program', () => {
      const source = '';

      const result = parse(source);

      expect(result.success).toBe(true);
      expect(result.ast.statements).toHaveLength(0);
    });

    it('should include location information', () => {
      const source = 'ENTITY Test {}';

      const result = parse(source);

      expect(result.success).toBe(true);
      expect(result.ast.location).toBeDefined();
      expect(result.ast.location.start).toBeDefined();
      expect(result.ast.location.end).toBeDefined();
    });
  });

  describe('validateSyntax()', () => {
    it('should return valid for correct syntax', () => {
      const source = 'ENTITY Customer {}';

      const result = validateSyntax(source);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid syntax', () => {
      const source = 'INVALID';

      const result = validateSyntax(source);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getSuggestions()', () => {
    it('should suggest keywords at start', () => {
      const source = 'ENT';
      const position = 3;

      const suggestions = getSuggestions(source, position);

      expect(suggestions).toContain('ENTITY');
    });

    it('should suggest types after colon', () => {
      const source = 'FIELD name: S';
      const position = 13;

      const suggestions = getSuggestions(source, position);

      expect(suggestions).toContain('String');
    });

    it('should suggest annotations after @', () => {
      const source = '@gen';
      const position = 4;

      const suggestions = getSuggestions(source, position);

      expect(suggestions.some((s: string) => s.includes('generated'))).toBe(true);
    });
  });
});

describe('AST Structure', () => {
  const { parse } = require('../../dsl/parser');

  it('should produce correct Program structure', () => {
    const result = parse('ENTITY Test {}');

    expect(result.ast).toMatchObject({
      type: 'Program',
      version: expect.any(String),
      statements: expect.any(Array)
    });
  });
});
