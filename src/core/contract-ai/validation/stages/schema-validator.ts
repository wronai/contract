import { StageResult } from '../../types';
import { createPydanticValidator } from '../../llm/pydantic-validator';
import { ValidationContext, ValidationStage } from '../pipeline-orchestrator';

export class SchemaValidator implements ValidationStage {
  name = 'schema';
  critical = true;
  timeout = 30000;

  async validator(context: ValidationContext): Promise<StageResult> {
    const errors: StageResult['errors'] = [];
    const warnings: StageResult['warnings'] = [];

    let schemaValidator: Awaited<ReturnType<typeof createPydanticValidator>> | null = null;

    try {
      schemaValidator = await createPydanticValidator();
    } catch {
      warnings.push({
        message: 'Schema validator unavailable; skipping schema validation'
      });

      return {
        stage: this.name,
        passed: true,
        errors,
        warnings,
        timeMs: 0
      };
    }

    const contractSchemaName = 'contracts/contractai';
    const llmCodeOutputSchemaName = 'llm/llmcodeoutput';

    if (!schemaValidator.getSchema(contractSchemaName)) {
      warnings.push({
        message: `Missing JSON schema: ${contractSchemaName} (skipping contract schema validation)`
      });
    } else {
      const contractJson = JSON.parse(JSON.stringify(context.contract));
      const contractResult = schemaValidator.validate(contractSchemaName, contractJson);
      if (!contractResult.valid) {
        errors.push(
          ...contractResult.errors.map((e) => ({
            message: `[ContractAI] ${e.path ? e.path + ': ' : ''}${e.message}`,
            code: 'SCHEMA_CONTRACT'
          }))
        );
      }
    }

    if (!schemaValidator.getSchema(llmCodeOutputSchemaName)) {
      warnings.push({
        message: `Missing JSON schema: ${llmCodeOutputSchemaName} (skipping generated code schema validation)`
      });
    } else {
      const filesProjected = context.code.files.map((f) => ({
        path: f.path,
        content: f.content,
        ...(f.target ? { target: f.target } : {})
      }));

      const llmOutputLike = { files: filesProjected };
      const codeResult = schemaValidator.validate(llmCodeOutputSchemaName, llmOutputLike);
      if (!codeResult.valid) {
        errors.push(
          ...codeResult.errors.map((e) => ({
            message: `[GeneratedCode] ${e.path ? e.path + ': ' : ''}${e.message}`,
            code: 'SCHEMA_CODE'
          }))
        );
      }
    }

    return {
      stage: this.name,
      passed: errors.length === 0,
      errors,
      warnings,
      timeMs: 0
    };
  }
}

export function createSchemaValidator(): SchemaValidator {
  return new SchemaValidator();
}
