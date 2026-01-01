/**
 * Contract AI - Contract Validator
 * 
 * Waliduje wygenerowane Contract AI pod kątem poprawności struktury.
 * 
 * @version 2.2.0
 * @see todo/16-reclapp-implementation-todo-prompts.md
 */

import {
  ContractAI,
  ContractValidationError,
  ContractValidationResult,
  DefinitionLayer,
  GenerationLayer,
  ValidationLayer,
  FieldType,
  BasicFieldType,
  ExtendedFieldType
} from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_BASIC_TYPES: BasicFieldType[] = ['String', 'Int', 'Float', 'Boolean', 'UUID', 'DateTime'];
const VALID_EXTENDED_TYPES: ExtendedFieldType[] = ['Email', 'URL', 'Phone', 'Money', 'JSON', 'Text'];
const VALID_FIELD_TYPES = [...VALID_BASIC_TYPES, ...VALID_EXTENDED_TYPES];

const ERROR_CODES = {
  MISSING_REQUIRED_FIELD: 'E001',
  INVALID_FIELD_TYPE: 'E002',
  UNKNOWN_ENTITY_REFERENCE: 'E003',
  CIRCULAR_REFERENCE: 'E004',
  INVALID_PATTERN_TEMPLATE: 'E005',
  INVALID_ASSERTION_CHECK: 'E006',
  CROSS_LAYER_INCONSISTENCY: 'E007',
  INVALID_TECH_STACK: 'E008',
  INVALID_QUALITY_GATE: 'E009',
  DUPLICATE_ENTITY_NAME: 'E010'
} as const;

// ============================================================================
// CONTRACT VALIDATOR CLASS
// ============================================================================

/**
 * Walidator Contract AI
 */
export class ContractValidator {
  
  /**
   * Główna metoda walidacji
   */
  validate(contract: unknown): ContractValidationResult {
    const errors: ContractValidationError[] = [];
    const warnings: ContractValidationError[] = [];

    if (typeof contract !== 'object' || contract === null) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Contract must be an object',
        path: '',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    const c = contract as Partial<ContractAI>;

    // Validate each layer
    errors.push(...this.validateDefinitionLayer(c.definition));
    errors.push(...this.validateGenerationLayer(c.generation));
    errors.push(...this.validateValidationLayer(c.validation));

    // Cross-layer validation
    if (c.definition && c.generation && c.validation) {
      errors.push(...this.validateCrossLayerConsistency(c as ContractAI));
    }

    // Separate warnings from errors
    const actualErrors = errors.filter(e => e.severity === 'error');
    const actualWarnings = errors.filter(e => e.severity === 'warning');

    return {
      valid: actualErrors.length === 0,
      errors: actualErrors,
      warnings: actualWarnings
    };
  }

  /**
   * Waliduje warstwę Definition
   */
  validateDefinitionLayer(layer: unknown): ContractValidationError[] {
    const errors: ContractValidationError[] = [];
    const basePath = 'definition';

    if (!layer) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Definition layer is required',
        path: basePath,
        severity: 'error',
        suggestion: 'Add a definition object with app and entities'
      });
      return errors;
    }

    const def = layer as Partial<DefinitionLayer>;

    // Validate app
    if (!def.app) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'App definition is required',
        path: `${basePath}.app`,
        severity: 'error'
      });
    } else {
      if (!def.app.name) {
        errors.push({
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'App name is required',
          path: `${basePath}.app.name`,
          severity: 'error'
        });
      }
      if (!def.app.version) {
        errors.push({
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'App version is required',
          path: `${basePath}.app.version`,
          severity: 'error'
        });
      }
    }

    // Validate entities
    if (!def.entities || !Array.isArray(def.entities)) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Entities array is required',
        path: `${basePath}.entities`,
        severity: 'error'
      });
    } else {
      const entityNames = new Set<string>();

      def.entities.forEach((entity, index) => {
        const entityPath = `${basePath}.entities[${index}]`;

        if (!entity.name) {
          errors.push({
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Entity name is required',
            path: `${entityPath}.name`,
            severity: 'error'
          });
        } else {
          // Check for duplicates
          if (entityNames.has(entity.name)) {
            errors.push({
              code: ERROR_CODES.DUPLICATE_ENTITY_NAME,
              message: `Duplicate entity name: ${entity.name}`,
              path: `${entityPath}.name`,
              severity: 'error'
            });
          }
          entityNames.add(entity.name);
        }

        if (!entity.fields || !Array.isArray(entity.fields)) {
          errors.push({
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Entity fields array is required',
            path: `${entityPath}.fields`,
            severity: 'error'
          });
        } else {
          entity.fields.forEach((field, fieldIndex) => {
            const fieldPath = `${entityPath}.fields[${fieldIndex}]`;

            if (!field.name) {
              errors.push({
                code: ERROR_CODES.MISSING_REQUIRED_FIELD,
                message: 'Field name is required',
                path: `${fieldPath}.name`,
                severity: 'error'
              });
            }

            if (!field.type) {
              errors.push({
                code: ERROR_CODES.MISSING_REQUIRED_FIELD,
                message: 'Field type is required',
                path: `${fieldPath}.type`,
                severity: 'error'
              });
            } else if (!this.isValidFieldType(field.type)) {
              errors.push({
                code: ERROR_CODES.INVALID_FIELD_TYPE,
                message: `Invalid field type: ${field.type}`,
                path: `${fieldPath}.type`,
                severity: 'warning',
                suggestion: `Use one of: ${VALID_FIELD_TYPES.join(', ')}`
              });
            }
          });
        }

        // Validate relations
        if (entity.relations) {
          entity.relations.forEach((relation, relIndex) => {
            const relPath = `${entityPath}.relations[${relIndex}]`;

            if (relation.target && def.entities) {
              const targetExists = def.entities.some(e => e.name === relation.target);
              if (!targetExists) {
                errors.push({
                  code: ERROR_CODES.UNKNOWN_ENTITY_REFERENCE,
                  message: `Unknown entity reference: ${relation.target}`,
                  path: `${relPath}.target`,
                  severity: 'error',
                  suggestion: `Make sure entity "${relation.target}" is defined`
                });
              }
            }
          });
        }
      });
    }

    return errors;
  }

  /**
   * Waliduje warstwę Generation
   */
  validateGenerationLayer(layer: unknown): ContractValidationError[] {
    const errors: ContractValidationError[] = [];
    const basePath = 'generation';

    if (!layer) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Generation layer is required',
        path: basePath,
        severity: 'error'
      });
      return errors;
    }

    const gen = layer as Partial<GenerationLayer>;

    // Validate instructions
    if (!gen.instructions || !Array.isArray(gen.instructions)) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Instructions array is required',
        path: `${basePath}.instructions`,
        severity: 'error'
      });
    } else {
      const validTargets = ['api', 'frontend', 'database', 'tests', 'docker', 'all'];
      const validPriorities = ['must', 'should', 'may'];

      gen.instructions.forEach((inst, index) => {
        const instPath = `${basePath}.instructions[${index}]`;

        if (!validTargets.includes(inst.target)) {
          errors.push({
            code: ERROR_CODES.INVALID_FIELD_TYPE,
            message: `Invalid instruction target: ${inst.target}`,
            path: `${instPath}.target`,
            severity: 'warning',
            suggestion: `Use one of: ${validTargets.join(', ')}`
          });
        }

        if (!validPriorities.includes(inst.priority)) {
          errors.push({
            code: ERROR_CODES.INVALID_FIELD_TYPE,
            message: `Invalid instruction priority: ${inst.priority}`,
            path: `${instPath}.priority`,
            severity: 'warning'
          });
        }

        if (!inst.instruction || typeof inst.instruction !== 'string') {
          errors.push({
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Instruction text is required',
            path: `${instPath}.instruction`,
            severity: 'error'
          });
        }
      });
    }

    // Validate patterns
    if (!gen.patterns || !Array.isArray(gen.patterns)) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Patterns array is required (can be empty)',
        path: `${basePath}.patterns`,
        severity: 'error'
      });
    }

    // Validate constraints
    if (!gen.constraints || !Array.isArray(gen.constraints)) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Constraints array is required (can be empty)',
        path: `${basePath}.constraints`,
        severity: 'error'
      });
    }

    // Validate techStack
    if (!gen.techStack) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'TechStack is required',
        path: `${basePath}.techStack`,
        severity: 'error'
      });
    } else {
      if (!gen.techStack.backend) {
        errors.push({
          code: ERROR_CODES.INVALID_TECH_STACK,
          message: 'Backend configuration is required',
          path: `${basePath}.techStack.backend`,
          severity: 'error'
        });
      } else {
        const backend = gen.techStack.backend;
        if (!backend.runtime) {
          errors.push({
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Backend runtime is required',
            path: `${basePath}.techStack.backend.runtime`,
            severity: 'error'
          });
        }
        if (!backend.language) {
          errors.push({
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Backend language is required',
            path: `${basePath}.techStack.backend.language`,
            severity: 'error'
          });
        }
        if (!backend.framework) {
          errors.push({
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Backend framework is required',
            path: `${basePath}.techStack.backend.framework`,
            severity: 'error'
          });
        }
        if (typeof backend.port !== 'number') {
          errors.push({
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Backend port is required and must be a number',
            path: `${basePath}.techStack.backend.port`,
            severity: 'error'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Waliduje warstwę Validation
   */
  validateValidationLayer(layer: unknown): ContractValidationError[] {
    const errors: ContractValidationError[] = [];
    const basePath = 'validation';

    if (!layer) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Validation layer is required',
        path: basePath,
        severity: 'error'
      });
      return errors;
    }

    const val = layer as Partial<ValidationLayer>;

    // Validate assertions
    if (!val.assertions || !Array.isArray(val.assertions)) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Assertions array is required',
        path: `${basePath}.assertions`,
        severity: 'error'
      });
    } else {
      const assertionIds = new Set<string>();

      val.assertions.forEach((assertion, index) => {
        const assertPath = `${basePath}.assertions[${index}]`;

        if (!assertion.id) {
          errors.push({
            code: ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Assertion id is required',
            path: `${assertPath}.id`,
            severity: 'error'
          });
        } else if (assertionIds.has(assertion.id)) {
          errors.push({
            code: ERROR_CODES.INVALID_ASSERTION_CHECK,
            message: `Duplicate assertion id: ${assertion.id}`,
            path: `${assertPath}.id`,
            severity: 'error'
          });
        } else {
          assertionIds.add(assertion.id);
        }

        if (!assertion.check || typeof assertion.check !== 'object') {
          errors.push({
            code: ERROR_CODES.INVALID_ASSERTION_CHECK,
            message: 'Assertion check is required',
            path: `${assertPath}.check`,
            severity: 'error'
          });
        } else if (!assertion.check.type) {
          errors.push({
            code: ERROR_CODES.INVALID_ASSERTION_CHECK,
            message: 'Assertion check type is required',
            path: `${assertPath}.check.type`,
            severity: 'error'
          });
        }
      });
    }

    // Validate tests
    if (!val.tests || !Array.isArray(val.tests)) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Tests array is required',
        path: `${basePath}.tests`,
        severity: 'error'
      });
    }

    // Validate staticRules
    if (!val.staticRules || !Array.isArray(val.staticRules)) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'StaticRules array is required',
        path: `${basePath}.staticRules`,
        severity: 'error'
      });
    }

    // Validate qualityGates
    if (!val.qualityGates || !Array.isArray(val.qualityGates)) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'QualityGates array is required',
        path: `${basePath}.qualityGates`,
        severity: 'error'
      });
    } else {
      const validMetrics = ['test-coverage', 'cyclomatic-complexity', 'lines-of-code', 'duplication-ratio', 'type-coverage', 'documentation-coverage'];
      const validOperators = ['>', '>=', '<', '<=', '=='];

      val.qualityGates.forEach((gate, index) => {
        const gatePath = `${basePath}.qualityGates[${index}]`;

        if (!validMetrics.includes(gate.metric)) {
          errors.push({
            code: ERROR_CODES.INVALID_QUALITY_GATE,
            message: `Invalid quality metric: ${gate.metric}`,
            path: `${gatePath}.metric`,
            severity: 'warning',
            suggestion: `Use one of: ${validMetrics.join(', ')}`
          });
        }

        if (!validOperators.includes(gate.operator)) {
          errors.push({
            code: ERROR_CODES.INVALID_QUALITY_GATE,
            message: `Invalid quality operator: ${gate.operator}`,
            path: `${gatePath}.operator`,
            severity: 'error'
          });
        }
      });
    }

    // Validate acceptance
    if (!val.acceptance) {
      errors.push({
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Acceptance criteria is required',
        path: `${basePath}.acceptance`,
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Waliduje spójność między warstwami
   */
  validateCrossLayerConsistency(contract: ContractAI): ContractValidationError[] {
    const errors: ContractValidationError[] = [];
    const entityNames = contract.definition.entities.map(e => e.name);

    // Check if tests reference existing entities
    contract.validation.tests.forEach((test, index) => {
      if (!entityNames.includes(test.target) && !test.target.startsWith('/')) {
        errors.push({
          code: ERROR_CODES.CROSS_LAYER_INCONSISTENCY,
          message: `Test target "${test.target}" is not a defined entity`,
          path: `validation.tests[${index}].target`,
          severity: 'warning',
          suggestion: `Use one of: ${entityNames.join(', ')}`
        });
      }
    });

    // Check if API resources reference existing entities
    if (contract.definition.api) {
      contract.definition.api.resources.forEach((resource, index) => {
        if (!entityNames.includes(resource.entity)) {
          errors.push({
            code: ERROR_CODES.CROSS_LAYER_INCONSISTENCY,
            message: `API resource "${resource.name}" references unknown entity "${resource.entity}"`,
            path: `definition.api.resources[${index}].entity`,
            severity: 'error'
          });
        }
      });
    }

    return errors;
  }

  /**
   * Sprawdza czy typ pola jest prawidłowy
   */
  private isValidFieldType(type: FieldType): boolean {
    // Allow array types (e.g., "Contact[]")
    const baseType = type.replace('[]', '');
    return VALID_FIELD_TYPES.includes(baseType as any) || type.endsWith('[]');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createContractValidator(): ContractValidator {
  return new ContractValidator();
}

export { ERROR_CODES };
