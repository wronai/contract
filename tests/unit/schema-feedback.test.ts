import { createFeedbackGenerator } from '../../src/core/contract-ai';
import type { ContractAI, PipelineResult } from '../../src/core/contract-ai/types';

describe('FeedbackGenerator - schema stage', () => {
  it('includes schema errors in filesToFix when schema stage reports file-scoped errors', () => {
    const contract = {
      definition: { app: { name: 'x', version: '1.0.0' }, entities: [] },
      generation: {
        instructions: [],
        patterns: [],
        constraints: [],
        techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3000 } }
      },
      validation: {
        assertions: [],
        tests: [],
        staticRules: [],
        qualityGates: [],
        acceptance: { testsPass: true, minCoverage: 0, maxLintErrors: 0, maxResponseTime: 0, securityChecks: [], custom: [] }
      }
    } satisfies ContractAI;

    const pipelineResult: PipelineResult = {
      passed: false,
      stages: [
        {
          stage: 'schema',
          passed: false,
          errors: [
            {
              message: '[GeneratedCode] files[0].target: Value must be one of: api, frontend, shared, docker',
              file: 'api/src/server.ts',
              code: 'SCHEMA_CODE'
            }
          ],
          warnings: [],
          timeMs: 1
        }
      ],
      summary: {
        totalErrors: 1,
        totalWarnings: 0,
        passedStages: 0,
        failedStages: 1,
        totalTimeMs: 1
      }
    };

    const fg = createFeedbackGenerator();
    const feedback = fg.generateFeedback(contract, pipelineResult);

    expect(feedback.filesToFix).toContain('api/src/server.ts');
    expect(feedback.issues.some(i => i.code === 'SCHEMA_CODE')).toBe(true);
    expect(feedback.issues.some(i => i.suggestion && i.suggestion.includes('LLMCodeOutput'))).toBe(true);
  });
});
