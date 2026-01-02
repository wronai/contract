import { FallbackTemplates } from '../../src/core/contract-ai/evolution/fallback-templates';

describe('FallbackTemplates.parseFiles', () => {
  it('parses multiple files from markdown codeblocks and assigns targets by path prefix', () => {
    const input = [
      '```typescript:api/src/server.ts',
      'console.log("api");',
      '```',
      '',
      '```typescript:tests/e2e/api.e2e.ts',
      'console.log("tests");',
      '```',
      '',
      '```typescript:frontend/src/App.tsx',
      'console.log("frontend");',
      '```'
    ].join('\n');

    const files = FallbackTemplates.parseFiles(input);
    expect(files).toHaveLength(3);

    expect(files[0]).toEqual({
      path: 'api/src/server.ts',
      content: 'console.log("api");',
      target: 'api'
    });

    expect(files[1].path).toBe('tests/e2e/api.e2e.ts');
    expect(files[1].target).toBe('tests');

    expect(files[2].path).toBe('frontend/src/App.tsx');
    expect(files[2].target).toBe('frontend');
  });

  it('strips comments from JSON blocks', () => {
    const input = [
      '```json:api/package.json',
      '{',
      '  // comment',
      '  "name": "api" /* inline comment */',
      '}',
      '```'
    ].join('\n');

    const files = FallbackTemplates.parseFiles(input);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('api/package.json');
    expect(files[0].target).toBe('api');
    expect(files[0].content).toBe(['{', '  ', '  "name": "api" ', '}'].join('\n').trim());
  });
});
