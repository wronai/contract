/**
 * Reclapp DSL Parser
 * 
 * Parses DSL source code and generates JSON AST.
 * Uses Peggy for parsing with custom error handling.
 */

import * as peggy from 'peggy';
import * as fs from 'fs';
import * as path from 'path';
import type { Program, ParseResult, ParseError } from '../ast/types';

// Grammar cache
let cachedParser: peggy.Parser | null = null;

/**
 * Load and compile the Peggy grammar
 */
export function getParser(): peggy.Parser {
  if (cachedParser) {
    return cachedParser;
  }

  const grammarPath = path.join(__dirname, '../grammar/reclapp.pegjs');
  const grammar = fs.readFileSync(grammarPath, 'utf-8');

  cachedParser = peggy.generate(grammar, {
    output: 'parser',
    trace: false,
    cache: true,
    allowedStartRules: ['Program']
  });

  return cachedParser;
}

/**
 * Parse DSL source code into AST
 */
export function parse(source: string): ParseResult {
  const parser = getParser();

  try {
    const ast = parser.parse(source) as Program;
    return {
      success: true,
      ast
    };
  } catch (error: any) {
    const parseError = formatPeggyError(error);
    return {
      success: false,
      errors: [parseError]
    };
  }
}

/**
 * Parse DSL from file
 */
export function parseFile(filePath: string): ParseResult {
  try {
    const source = fs.readFileSync(filePath, 'utf-8');
    return parse(source);
  } catch (error: any) {
    return {
      success: false,
      errors: [{
        message: `Failed to read file: ${error.message}`,
        location: {
          start: { offset: 0, line: 1, column: 1 },
          end: { offset: 0, line: 1, column: 1 }
        }
      }]
    };
  }
}

/**
 * Format Peggy error into ParseError
 */
function formatPeggyError(error: any): ParseError {
  const location = error.location || {
    start: { offset: 0, line: 1, column: 1 },
    end: { offset: 0, line: 1, column: 1 }
  };

  let message = error.message || 'Unknown parse error';

  // Extract expected tokens
  let expected: string[] | undefined;
  if (error.expected) {
    expected = error.expected.map((exp: any) => {
      if (exp.type === 'literal') return `"${exp.text}"`;
      if (exp.type === 'class') return exp.description;
      if (exp.type === 'other') return exp.description;
      return exp.toString();
    });
  }

  return {
    message,
    location,
    expected,
    found: error.found
  };
}

/**
 * Get syntax suggestions for autocomplete
 */
export function getSuggestions(source: string, position: number): string[] {
  const keywords = [
    'ENTITY', 'EVENT', 'PIPELINE', 'ALERT', 'DASHBOARD',
    'SOURCE', 'DEVICE', 'WORKFLOW', 'CONFIG',
    'FIELD', 'INPUT', 'OUTPUT', 'TRANSFORM', 'FILTER',
    'CONDITION', 'TARGET', 'METRICS', 'STREAM',
    'TYPE', 'PROTOCOL', 'TOPIC', 'SUBSCRIBE', 'PUBLISH',
    'TRIGGER', 'STEP', 'ACTION', 'ON_SUCCESS', 'ON_FAILURE'
  ];

  const types = [
    'UUID', 'String', 'Int', 'Float', 'Boolean',
    'DateTime', 'Date', 'Email', 'URL', 'JSON', 'Money'
  ];

  const annotations = [
    '@generated', '@required', '@unique', '@index',
    '@pattern', '@min', '@max', '@enum', '@default'
  ];

  // Simple prefix matching
  const beforeCursor = source.slice(Math.max(0, position - 20), position);
  const lastWord = beforeCursor.match(/\w+$/)?.[0]?.toUpperCase() || '';

  const suggestions: string[] = [];

  if (beforeCursor.includes(':')) {
    // After colon, suggest types
    suggestions.push(...types.filter(t => t.toUpperCase().startsWith(lastWord)));
  } else if (beforeCursor.includes('@') || lastWord.startsWith('@')) {
    // Suggest annotations
    suggestions.push(...annotations.filter(a => a.toUpperCase().startsWith(lastWord)));
  } else {
    // Suggest keywords
    suggestions.push(...keywords.filter(k => k.startsWith(lastWord)));
  }

  return suggestions;
}

/**
 * Format AST as pretty JSON
 */
export function formatAST(ast: Program): string {
  return JSON.stringify(ast, null, 2);
}

/**
 * Validate basic syntax without full semantic validation
 */
export function validateSyntax(source: string): { valid: boolean; errors: string[] } {
  const result = parse(source);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.errors?.map(e => {
    const loc = e.location;
    return `Line ${loc.start.line}, Column ${loc.start.column}: ${e.message}`;
  }) || ['Unknown error'];

  return { valid: false, errors };
}
