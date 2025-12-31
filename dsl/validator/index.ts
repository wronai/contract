/**
 * Reclapp DSL Semantic Validator
 * 
 * Validates AST for semantic correctness:
 * - Type checking
 * - Reference resolution
 * - Business rule validation
 * - Best practice warnings
 */

import type {
  Program,
  Statement,
  EntityDeclaration,
  EventDeclaration,
  PipelineDeclaration,
  AlertDeclaration,
  DashboardDeclaration,
  SourceDeclaration,
  DeviceDeclaration,
  WorkflowDeclaration,
  FieldDeclaration,
  TypeExpression,
  Expression,
  DotPath,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SemanticModel
} from '../ast/types';

// ============================================================================
// VALIDATOR CLASS
// ============================================================================

export class Validator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private entities: Map<string, EntityDeclaration> = new Map();
  private events: Map<string, EventDeclaration> = new Map();
  private pipelines: Map<string, PipelineDeclaration> = new Map();
  private sources: Map<string, SourceDeclaration> = new Map();
  private devices: Map<string, string> = new Map();
  private workflows: Map<string, WorkflowDeclaration> = new Map();

  // Valid base types
  private readonly VALID_TYPES = new Set([
    'UUID', 'String', 'Int', 'Float', 'Boolean',
    'DateTime', 'Date', 'Email', 'URL', 'JSON', 'Money'
  ]);

  // Valid stream modes
  private readonly VALID_STREAM_MODES = new Set([
    'real_time', 'hourly', 'daily', 'weekly', 'manual'
  ]);

  // Valid protocols
  private readonly VALID_PROTOCOLS = new Set([
    'mqtt', 'coap', 'http', 'websocket', 'grpc'
  ]);

  // Valid severity levels
  private readonly VALID_SEVERITIES = new Set([
    'low', 'medium', 'high', 'critical'
  ]);

  /**
   * Validate the entire AST
   */
  validate(ast: Program): ValidationResult {
    this.reset();

    // First pass: collect all declarations
    this.collectDeclarations(ast);

    // Second pass: validate each statement
    for (const statement of ast.statements) {
      this.validateStatement(statement);
    }

    // Third pass: cross-reference validation
    this.validateReferences();

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Build semantic model from validated AST
   */
  buildSemanticModel(ast: Program): SemanticModel {
    // Validate first
    const validation = this.validate(ast);
    if (!validation.valid) {
      throw new Error('Cannot build semantic model from invalid AST');
    }

    // Build model (simplified for MVP)
    return {
      entities: new Map(),
      events: new Map(),
      pipelines: new Map(),
      alerts: new Map(),
      dashboards: new Map(),
      sources: new Map(),
      devices: new Map(),
      workflows: new Map()
    };
  }

  // ============================================================================
  // COLLECTION PHASE
  // ============================================================================

  private collectDeclarations(ast: Program): void {
    for (const statement of ast.statements) {
      switch (statement.type) {
        case 'EntityDeclaration':
          this.registerEntity(statement);
          break;
        case 'EventDeclaration':
          this.registerEvent(statement);
          break;
        case 'PipelineDeclaration':
          this.registerPipeline(statement);
          break;
        case 'SourceDeclaration':
          this.registerSource(statement);
          break;
        case 'DeviceDeclaration':
          this.registerDevice(statement);
          break;
        case 'WorkflowDeclaration':
          this.registerWorkflow(statement);
          break;
      }
    }
  }

  private registerEntity(entity: EntityDeclaration): void {
    if (this.entities.has(entity.name)) {
      this.addError('E001', `Duplicate entity declaration: ${entity.name}`, entity.location);
    } else {
      this.entities.set(entity.name, entity);
    }
  }

  private registerEvent(event: EventDeclaration): void {
    if (this.events.has(event.name)) {
      this.addError('E002', `Duplicate event declaration: ${event.name}`, event.location);
    } else {
      this.events.set(event.name, event);
    }
  }

  private registerPipeline(pipeline: PipelineDeclaration): void {
    if (this.pipelines.has(pipeline.name)) {
      this.addError('E003', `Duplicate pipeline declaration: ${pipeline.name}`, pipeline.location);
    } else {
      this.pipelines.set(pipeline.name, pipeline);
    }
  }

  private registerSource(source: SourceDeclaration): void {
    if (this.sources.has(source.name)) {
      this.addError('E004', `Duplicate source declaration: ${source.name}`, source.location);
    } else {
      this.sources.set(source.name, source);
    }
  }

  private registerDevice(device: DeviceDeclaration): void {
    const name = device.name.value;
    if (this.devices.has(name)) {
      this.addError('E005', `Duplicate device declaration: ${name}`, device.location);
    } else {
      this.devices.set(name, device.deviceType || 'unknown');
    }
  }

  private registerWorkflow(workflow: WorkflowDeclaration): void {
    if (this.workflows.has(workflow.name)) {
      this.addError('E006', `Duplicate workflow declaration: ${workflow.name}`, workflow.location);
    } else {
      this.workflows.set(workflow.name, workflow);
    }
  }

  // ============================================================================
  // VALIDATION PHASE
  // ============================================================================

  private validateStatement(statement: Statement): void {
    switch (statement.type) {
      case 'EntityDeclaration':
        this.validateEntity(statement);
        break;
      case 'EventDeclaration':
        this.validateEvent(statement);
        break;
      case 'PipelineDeclaration':
        this.validatePipeline(statement);
        break;
      case 'AlertDeclaration':
        this.validateAlert(statement);
        break;
      case 'DashboardDeclaration':
        this.validateDashboard(statement);
        break;
      case 'SourceDeclaration':
        this.validateSource(statement);
        break;
      case 'DeviceDeclaration':
        this.validateDevice(statement);
        break;
      case 'WorkflowDeclaration':
        this.validateWorkflow(statement);
        break;
    }
  }

  private validateEntity(entity: EntityDeclaration): void {
    // Validate entity name
    if (!this.isValidIdentifier(entity.name)) {
      this.addError('E101', `Invalid entity name: ${entity.name}`, entity.location);
    }

    // Validate fields
    const fieldNames = new Set<string>();
    let hasIdField = false;

    for (const field of entity.fields) {
      // Check for duplicate field names
      if (fieldNames.has(field.name)) {
        this.addError('E102', `Duplicate field name: ${field.name} in entity ${entity.name}`, field.location);
      }
      fieldNames.add(field.name);

      // Validate field type
      this.validateType(field.fieldType, field.location);

      // Check for id field
      if (field.name === 'id' || field.annotations.some(a => a.name === 'generated')) {
        hasIdField = true;
      }

      // Validate annotations
      this.validateFieldAnnotations(field);
    }

    // Warn if no id field
    if (!hasIdField) {
      this.addWarning('W101', `Entity ${entity.name} has no ID field`, entity.location, 'Add FIELD id: UUID @generated');
    }
  }

  private validateEvent(event: EventDeclaration): void {
    // Event naming convention
    if (!event.name.match(/^[A-Z][a-zA-Z]+$/)) {
      this.addWarning('W201', `Event name should be PascalCase: ${event.name}`, event.location);
    }

    // Validate fields
    const fieldNames = new Set<string>();
    for (const field of event.fields) {
      if (fieldNames.has(field.name)) {
        this.addError('E201', `Duplicate field in event: ${field.name}`, field.location);
      }
      fieldNames.add(field.name);
      this.validateType(field.fieldType, field.location);
    }

    // Events should have timestamp
    if (!fieldNames.has('timestamp') && !fieldNames.has('occurredAt')) {
      this.addWarning('W202', `Event ${event.name} has no timestamp field`, event.location);
    }
  }

  private validatePipeline(pipeline: PipelineDeclaration): void {
    // Pipeline must have input
    if (!pipeline.input) {
      this.addError('E301', `Pipeline ${pipeline.name} has no INPUT`, pipeline.location);
    }

    // Pipeline must have at least one output
    if (!pipeline.outputs || pipeline.outputs.length === 0) {
      this.addError('E302', `Pipeline ${pipeline.name} has no OUTPUT`, pipeline.location);
    }

    // Validate transforms (must be valid identifiers)
    if (pipeline.transforms) {
      for (const transform of pipeline.transforms) {
        if (!this.isValidIdentifier(transform)) {
          this.addError('E303', `Invalid transform name: ${transform}`, pipeline.location);
        }
      }
    }
  }

  private validateAlert(alert: AlertDeclaration): void {
    // Alert must have condition
    if (!alert.condition) {
      this.addError('E401', `Alert ${alert.name.value} has no CONDITION`, alert.location);
    }

    // Alert must have at least one target
    if (!alert.targets || alert.targets.length === 0) {
      this.addError('E402', `Alert ${alert.name.value} has no TARGET`, alert.location);
    }

    // Validate severity if present
    if (alert.severity && !this.VALID_SEVERITIES.has(alert.severity.toLowerCase())) {
      this.addError('E403', `Invalid severity: ${alert.severity}`, alert.location);
    }

    // Validate condition expression
    if (alert.condition) {
      this.validateExpression(alert.condition);
    }
  }

  private validateDashboard(dashboard: DashboardDeclaration): void {
    // Dashboard must have entity or metrics
    if (!dashboard.entity && (!dashboard.metrics || dashboard.metrics.length === 0)) {
      this.addError('E501', `Dashboard ${dashboard.name.value} needs ENTITY or METRICS`, dashboard.location);
    }

    // Validate stream mode
    if (dashboard.streamMode && !this.VALID_STREAM_MODES.has(dashboard.streamMode)) {
      this.addError('E502', `Invalid stream mode: ${dashboard.streamMode}`, dashboard.location);
    }
  }

  private validateSource(source: SourceDeclaration): void {
    // Source must have type
    if (!source.sourceType) {
      this.addError('E601', `Source ${source.name} has no TYPE`, source.location);
    }

    // REST/GraphQL sources must have URL
    if (['rest', 'graphql'].includes(source.sourceType?.toLowerCase() || '')) {
      if (!source.url) {
        this.addError('E602', `Source ${source.name} needs URL`, source.location);
      }
    }
  }

  private validateDevice(device: DeviceDeclaration): void {
    // Device must have protocol
    if (!device.protocol) {
      this.addError('E701', `Device ${device.name.value} has no PROTOCOL`, device.location);
    } else if (!this.VALID_PROTOCOLS.has(device.protocol.toLowerCase())) {
      this.addError('E702', `Invalid protocol: ${device.protocol}`, device.location);
    }

    // MQTT devices must have topic
    if (device.protocol?.toLowerCase() === 'mqtt' && !device.topic) {
      this.addError('E703', `MQTT device ${device.name.value} needs TOPIC`, device.location);
    }

    // Device should have subscribe or publish
    if (!device.subscribe && !device.publish) {
      this.addWarning('W701', `Device ${device.name.value} has no subscriptions or publications`, device.location);
    }
  }

  private validateWorkflow(workflow: WorkflowDeclaration): void {
    // Workflow must have trigger
    if (!workflow.trigger) {
      this.addError('E801', `Workflow ${workflow.name} has no TRIGGER`, workflow.location);
    }

    // Validate step transitions
    // (simplified for MVP)
  }

  // ============================================================================
  // TYPE VALIDATION
  // ============================================================================

  private validateType(type: TypeExpression, location: any): void {
    const baseType = type.baseType;

    // Check if it's a primitive type
    if (this.VALID_TYPES.has(baseType)) {
      return;
    }

    // Check if it's a reference to an entity
    if (this.entities.has(baseType)) {
      return;
    }

    this.addError('E100', `Unknown type: ${baseType}`, location);
  }

  private validateFieldAnnotations(field: FieldDeclaration): void {
    const annotationNames = new Set<string>();

    for (const annotation of field.annotations) {
      // Check for duplicate annotations
      if (annotationNames.has(annotation.name)) {
        this.addWarning('W102', `Duplicate annotation: @${annotation.name}`, annotation.location);
      }
      annotationNames.add(annotation.name);

      // Validate specific annotations
      switch (annotation.name) {
        case 'pattern':
          if (annotation.params.length === 0) {
            this.addError('E103', '@pattern requires a regex parameter', annotation.location);
          }
          break;
        case 'min':
        case 'max':
          if (annotation.params.length === 0 || 
              annotation.params[0].value?.type !== 'NumberLiteral') {
            this.addError('E104', `@${annotation.name} requires a number parameter`, annotation.location);
          }
          break;
        case 'enum':
          if (annotation.params.length === 0) {
            this.addError('E105', '@enum requires at least one value', annotation.location);
          }
          break;
      }
    }
  }

  // ============================================================================
  // EXPRESSION VALIDATION
  // ============================================================================

  private validateExpression(expr: Expression): void {
    switch (expr.type) {
      case 'BinaryExpression':
        this.validateExpression(expr.left);
        this.validateExpression(expr.right);
        break;
      case 'UnaryExpression':
        this.validateExpression(expr.argument);
        break;
      case 'FunctionCall':
        for (const arg of expr.arguments) {
          this.validateExpression(arg);
        }
        break;
      case 'DotPath':
        // Validate that the path starts with a known entity or variable
        // (simplified for MVP)
        break;
    }
  }

  // ============================================================================
  // CROSS-REFERENCE VALIDATION
  // ============================================================================

  private validateReferences(): void {
    // Validate pipeline inputs reference valid sources
    for (const [name, pipeline] of this.pipelines) {
      if (pipeline.input) {
        const inputPath = pipeline.input.path;
        const rootName = inputPath[0];

        // Input should reference entity, source, or event
        if (!this.entities.has(rootName) && 
            !this.sources.has(rootName) && 
            !this.events.has(rootName)) {
          this.addError('E310', `Pipeline ${name} references unknown input: ${rootName}`, pipeline.location);
        }
      }
    }

    // Validate device subscriptions
    for (const [name, device] of this.devices) {
      // (simplified validation for MVP)
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private reset(): void {
    this.errors = [];
    this.warnings = [];
    this.entities.clear();
    this.events.clear();
    this.pipelines.clear();
    this.sources.clear();
    this.devices.clear();
    this.workflows.clear();
  }

  private isValidIdentifier(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private addError(code: string, message: string, location?: any): void {
    this.errors.push({ code, message, location });
  }

  private addWarning(code: string, message: string, location?: any, suggestion?: string): void {
    this.warnings.push({ code, message, location, suggestion });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function validate(ast: Program): ValidationResult {
  const validator = new Validator();
  return validator.validate(ast);
}

export function buildSemanticModel(ast: Program): SemanticModel {
  const validator = new Validator();
  return validator.buildSemanticModel(ast);
}
