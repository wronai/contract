import {
  createDefaultValidationPipeline,
  createEmptyContract
} from '../../src/core/contract-ai';

import type { GeneratedCode } from '../../src/core/contract-ai/types';

describe('Validation Pipeline - schema stage', () => {
  it('includes schema stage and it passes for minimal valid contract + code', async () => {
    const pipeline = createDefaultValidationPipeline({
      failFast: true,
      verbose: false
    });

    const stages = pipeline.getStages().map(s => s.name);
    expect(stages).toContain('schema');

    const contract = createEmptyContract('Test');

    const generatedCode: GeneratedCode = {
      files: [{ path: 'api/src/server.ts', content: 'console.log("ok")', target: 'api' }],
      contract,
      metadata: {
        generatedAt: new Date(),
        targets: ['api']
      }
    };

    const result = await pipeline.validate(contract, generatedCode);

    const schemaStage = result.stages.find(s => s.stage === 'schema');
    expect(schemaStage).toBeDefined();
    expect(schemaStage!.passed).toBe(true);
  });
});
