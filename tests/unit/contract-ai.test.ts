/**
 * Contract AI Unit Tests
 * 
 * @version 2.4.1
 */

import {
  ContractAI,
  createEmptyContract,
  isValidContractAI,
  hasDefinitionLayer,
  hasGenerationLayer,
  hasValidationLayer,
  createContractValidator,
  createContractGenerator,
  createLLMCodeGenerator,
  createDefaultValidationPipeline,
  createFeedbackGenerator
} from '../../src/core/contract-ai';

describe('Contract AI Types', () => {
  describe('createEmptyContract', () => {
    it('should create a valid empty contract', () => {
      const contract = createEmptyContract('Test App', '1.0.0');
      
      expect(contract.definition.app.name).toBe('Test App');
      expect(contract.definition.app.version).toBe('1.0.0');
      expect(contract.definition.entities).toEqual([]);
      expect(contract.generation.instructions).toEqual([]);
      expect(contract.validation.assertions).toEqual([]);
    });

    it('should have valid metadata', () => {
      const contract = createEmptyContract('Test App');
      
      expect(contract.metadata).toBeDefined();
      expect(contract.metadata?.version).toBe('1.0.0');
      expect(contract.metadata?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Type Guards', () => {
    it('isValidContractAI should validate complete contract', () => {
      const contract = createEmptyContract('Test');
      expect(isValidContractAI(contract)).toBe(true);
    });

    it('isValidContractAI should reject invalid objects', () => {
      expect(isValidContractAI(null)).toBe(false);
      expect(isValidContractAI({})).toBe(false);
      expect(isValidContractAI({ definition: {} })).toBe(false);
    });

    it('hasDefinitionLayer should check definition layer', () => {
      const contract = createEmptyContract('Test');
      expect(hasDefinitionLayer(contract)).toBe(true);
      expect(hasDefinitionLayer({})).toBe(false);
    });

    it('hasGenerationLayer should check generation layer', () => {
      const contract = createEmptyContract('Test');
      expect(hasGenerationLayer(contract)).toBe(true);
      expect(hasGenerationLayer({})).toBe(false);
    });

    it('hasValidationLayer should check validation layer', () => {
      const contract = createEmptyContract('Test');
      expect(hasValidationLayer(contract)).toBe(true);
      expect(hasValidationLayer({})).toBe(false);
    });
  });
});

describe('Contract Validator', () => {
  const validator = createContractValidator();

  it('should validate a complete contract', () => {
    const contract = createEmptyContract('Test App');
    const result = validator.validate(contract);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing definition layer', () => {
    const result = validator.validate({});
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'E001')).toBe(true);
  });

  it('should detect invalid entity field type', () => {
    const contract = createEmptyContract('Test');
    contract.definition.entities = [{
      name: 'TestEntity',
      fields: [
        { name: 'id', type: 'InvalidType' }
      ]
    }];

    const result = validator.validate(contract);
    
    // Should have warning for invalid type
    expect(result.warnings.some(w => w.code === 'E002')).toBe(true);
  });
});

describe('Contract Generator', () => {
  it('should create generator with default options', () => {
    const generator = createContractGenerator();
    expect(generator).toBeDefined();
  });

  it('should create generator with custom options', () => {
    const generator = createContractGenerator({
      maxAttempts: 3,
      verbose: true
    });
    expect(generator).toBeDefined();
  });

  it('should generate contract from prompt (mock)', async () => {
    const generator = createContractGenerator({ verbose: false });
    
    // Without LLM client, uses mock response
    const result = await generator.generate('Create a simple app');
    
    expect(result.success).toBe(true);
    expect(result.contract).toBeDefined();
    expect(result.attempts).toBeGreaterThanOrEqual(1);
  });
});

describe('LLM Code Generator', () => {
  it('should create code generator', () => {
    const generator = createLLMCodeGenerator();
    expect(generator).toBeDefined();
  });

  it('should determine targets from contract', () => {
    const contract = createEmptyContract('Test');
    const generator = createLLMCodeGenerator();
    
    const targets = generator.determineTargets(contract);
    
    expect(targets).toContain('api');
  });

  it('should parse files from response', () => {
    const generator = createLLMCodeGenerator();
    
    const response = `
\`\`\`typescript:api/src/server.ts
console.log('hello');
\`\`\`

\`\`\`typescript:api/src/types.ts
export interface Test {}
\`\`\`
`;

    const files = generator.parseFilesFromResponse(response, 'api');
    
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe('api/src/server.ts');
    expect(files[1].path).toBe('api/src/types.ts');
  });
});

describe('Validation Pipeline', () => {
  it('should create default pipeline with stages', () => {
    const pipeline = createDefaultValidationPipeline();
    const stages = pipeline.getStages();
    
    expect(stages.length).toBeGreaterThanOrEqual(5);
    expect(stages.map(s => s.name)).toContain('syntax');
    expect(stages.map(s => s.name)).toContain('assertions');
    expect(stages.map(s => s.name)).toContain('security');
  });

  it('should validate generated code', async () => {
    const pipeline = createDefaultValidationPipeline();
    const contract = createEmptyContract('Test');
    
    const generatedCode = {
      files: [
        { path: 'api/src/server.ts', content: 'console.log("test");' }
      ],
      contract,
      metadata: {
        generatedAt: new Date(),
        targets: ['api']
      }
    };

    const result = await pipeline.validate(contract, generatedCode);
    
    expect(result).toBeDefined();
    expect(result.stages).toBeDefined();
    expect(result.summary).toBeDefined();
  });
});

describe('Feedback Generator', () => {
  it('should create feedback generator', () => {
    const generator = createFeedbackGenerator();
    expect(generator).toBeDefined();
  });

  it('should generate feedback from pipeline result', () => {
    const generator = createFeedbackGenerator();
    const contract = createEmptyContract('Test');
    
    const pipelineResult = {
      passed: false,
      stages: [
        {
          stage: 'syntax',
          passed: false,
          errors: [{ message: 'Syntax error', code: 'SYNTAX_ERROR' }],
          warnings: [],
          timeMs: 100
        }
      ],
      summary: {
        totalErrors: 1,
        totalWarnings: 0,
        passedStages: 0,
        failedStages: 1,
        totalTimeMs: 100
      }
    };

    const feedback = generator.generateFeedback(contract, pipelineResult);
    
    expect(feedback.issues).toHaveLength(1);
    expect(feedback.issues[0].severity).toBe('error');
    expect(feedback.summary).toContain('1 error');
  });
});

describe('SDK Generator', () => {
  const { createSDKGenerator, createEmptyContract } = require('../../src/core/contract-ai');

  it('should create SDK generator', () => {
    const generator = createSDKGenerator();
    expect(generator).toBeDefined();
  });

  it('should generate SDK from contract', () => {
    const contract = createEmptyContract('Test App');
    contract.definition.entities = [
      {
        name: 'User',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'email', type: 'Email', annotations: { required: true } },
          { name: 'name', type: 'String', annotations: { required: true } }
        ]
      }
    ];

    const generator = createSDKGenerator();
    const sdk = generator.generate(contract);

    expect(sdk.types).toBeDefined();
    expect(sdk.types).toContain('interface User');
    expect(sdk.types).toContain('CreateUserInput');
    expect(sdk.files.size).toBeGreaterThan(0);
  });

  it('should generate Zod schemas', () => {
    const contract = createEmptyContract('Test');
    contract.definition.entities = [
      {
        name: 'Product',
        fields: [
          { name: 'id', type: 'UUID' },
          { name: 'price', type: 'Decimal' }
        ]
      }
    ];

    const generator = createSDKGenerator({ generateZodSchemas: true });
    const sdk = generator.generate(contract);

    expect(sdk.zodSchemas).toBeDefined();
    expect(sdk.zodSchemas).toContain('productSchema');
    expect(sdk.zodSchemas).toContain('z.number()');
  });

  it('should generate API client', () => {
    const contract = createEmptyContract('Test');
    contract.definition.entities = [
      { name: 'Order', fields: [{ name: 'id', type: 'UUID' }] }
    ];

    const generator = createSDKGenerator({ generateClient: true });
    const sdk = generator.generate(contract);

    expect(sdk.client).toBeDefined();
    expect(sdk.client).toContain('class ApiClient');
    expect(sdk.client).toContain('listOrders');
    expect(sdk.client).toContain('createOrder');
  });

  it('should generate React hooks', () => {
    const contract = createEmptyContract('Test');
    contract.definition.entities = [
      { name: 'Task', fields: [{ name: 'id', type: 'UUID' }] }
    ];

    const generator = createSDKGenerator({ generateHooks: true });
    const sdk = generator.generate(contract);

    expect(sdk.hooks).toBeDefined();
    expect(sdk.hooks).toContain('useTaskList');
    expect(sdk.hooks).toContain('useTask');
    expect(sdk.hooks).toContain('useTaskMutations');
  });
});
