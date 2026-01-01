import { createContractGenerator } from '../../src/core/contract-ai';
import { createPydanticValidator } from '../../src/core/contract-ai/llm/pydantic-validator';

describe('Pydantic JSON Schema validation', () => {
  it('fails contract generation with E_SCHEMA when LLM output does not match ContractAI JSON Schema', async () => {
    const schemaValidator = await createPydanticValidator();
    expect(schemaValidator.getSchema('contracts/contractai')).toBeDefined();

    const generator = createContractGenerator({
      maxAttempts: 1,
      verbose: false
    });

    generator.setLLMClient({
      generate: async () => JSON.stringify({})
    });

    const result = await generator.generate('Create a simple app');

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.errors.some(e => e.code === 'E_SCHEMA')).toBe(true);
  });
});
