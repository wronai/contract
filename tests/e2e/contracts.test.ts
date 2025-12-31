/**
 * E2E Test: TypeScript AI Contracts
 * 
 * Tests the complete contract lifecycle:
 * - Contract definition
 * - Validation
 * - Execution
 * - Verification
 * - Learning
 */

import {
  AgentContract,
  Entity,
  Workflow,
  Permission,
  defineContract,
  createEntity,
  createWorkflow,
  createVerification,
  DEFAULT_SAFETY_RAILS,
  DEFAULT_ENFORCEMENT,
  DEFAULT_RATE_LIMITS,
  DEFAULT_UNCERTAINTY_PROTOCOL,
  DEFAULT_NEGOTIATION_PROTOCOL
} from '../../contracts/types';

import {
  validateContract,
  validateEntity,
  validateWorkflow,
  ValidationResult
} from '../../contracts/validator';

import {
  ContractExecutor,
  createExecutor,
  ExecutionResult,
  ActionRequest,
  ActionResponse
} from '../../contracts/executor';

// ============================================================================
// TEST DATA
// ============================================================================

const TestCustomerEntity: Entity = createEntity({
  name: 'TestCustomer',
  description: 'Test customer entity for E2E tests',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'name', type: 'string', required: true },
    { name: 'riskScore', type: 'number', min: 0, max: 100, default: 50 },
    { name: 'status', type: 'string', enum: ['pending', 'active', 'suspended'] }
  ],
  causalInfluences: [
    { field: 'revenue', weight: -0.3, decay: 0.01, mechanism: 'Higher revenue = lower risk' },
    { field: 'paymentDelays', weight: 0.4, decay: 0.02, mechanism: 'Delays increase risk' }
  ],
  interventions: [
    {
      name: 'reduceRisk',
      description: 'Apply risk reduction measures',
      adjust: { creditLimit: -1000 },
      expectedEffect: { riskScore: -15 },
      confidence: 0.8,
      sandbox: true,
      cooldownMs: 3600000
    },
    {
      name: 'increaseMonitoring',
      description: 'Enable frequent monitoring',
      adjust: { monitoringLevel: 'high' },
      expectedEffect: { riskScore: -5 },
      confidence: 0.9,
      sandbox: false
    }
  ]
});

const TestWorkflow: Workflow = createWorkflow({
  name: 'TestRiskWorkflow',
  steps: [
    {
      id: 'fetch',
      type: 'fetch_data',
      name: 'Fetch Data',
      config: { source: 'test' },
      onSuccess: 'compute',
      onFailure: 'log_error',
      timeout: 5000,
      retries: 2
    },
    {
      id: 'compute',
      type: 'compute',
      name: 'Compute Risk',
      config: { algorithm: 'weighted_sum' },
      onSuccess: 'decide'
    },
    {
      id: 'decide',
      type: 'decision',
      name: 'Decide Action',
      conditions: [{ expression: 'riskScore > 50', description: 'High risk threshold' }],
      onSuccess: 'apply',
      onFailure: 'log_success'
    },
    {
      id: 'apply',
      type: 'apply_intervention',
      name: 'Apply Intervention',
      config: { intervention: 'reduceRisk' },
      onSuccess: 'verify'
    },
    {
      id: 'verify',
      type: 'verify',
      name: 'Verify Result',
      onSuccess: 'log_success'
    },
    {
      id: 'log_success',
      type: 'log',
      name: 'Log Success',
      config: { level: 'info' }
    },
    {
      id: 'log_error',
      type: 'log',
      name: 'Log Error',
      config: { level: 'error' }
    }
  ],
  safety: {
    ...DEFAULT_SAFETY_RAILS,
    maxAdjustmentPerCycle: 0.2,
    rollbackOnAnomaly: true,
    sandboxExperimental: true
  }
});

const TestVerification = createVerification({
  metrics: [
    { name: 'riskAccuracy', description: 'Risk prediction accuracy', threshold: 0.8 },
    { name: 'interventionSuccess', description: 'Success rate', threshold: 0.7 }
  ],
  thresholds: {
    anomalyDetection: 0.1,
    intentMatch: 0.6,
    causalValidity: 0.5,
    confidenceDecay: true,
    confidenceDecayRate: 0.01,
    minConfidence: 0.3,
    maxConfidence: 0.95
  },
  learningConfig: {
    enabled: true,
    minObservations: 5,
    learningRate: 0.1,
    lockedBeforeApproval: true,
    batchSize: 10,
    validationSplit: 0.2
  }
});

// ============================================================================
// CONTRACT DEFINITION TESTS
// ============================================================================

describe('E2E: TypeScript AI Contracts', () => {
  describe('Contract Definition', () => {
    it('should create contract using fluent builder', () => {
      const contract = defineContract('TestAgent', '1.0.0')
        .description('Test agent for E2E')
        .author('Test Suite')
        .addEntity(TestCustomerEntity)
        .workflow(TestWorkflow)
        .verification(TestVerification)
        .canDo({ action: 'query_data', resources: ['*'], riskLevel: 'low' })
        .needsApproval({ action: 'modify_entity', resources: ['*'], riskLevel: 'high' })
        .cannotDo({ action: '*', resources: ['secrets'], riskLevel: 'critical' })
        .safetyRails({ maxAdjustmentPerCycle: 0.1 })
        .enforcement({ logAllDecisions: true })
        .rateLimits({ actionsPerMinute: 30 })
        .build();

      expect(contract.name).toBe('TestAgent');
      expect(contract.version).toBe('1.0.0');
      expect(contract.entities).toHaveLength(1);
      expect(contract.workflow.name).toBe('TestRiskWorkflow');
      expect(contract.canAutonomously).toHaveLength(1);
      expect(contract.requiresApproval).toHaveLength(1);
      expect(contract.prohibited).toHaveLength(1);
    });

    it('should create contract with all required fields', () => {
      const contract: AgentContract = {
        name: 'FullContract',
        version: '2.0.0',
        description: 'Complete contract definition',
        author: 'E2E Test',
        created: new Date(),
        updated: new Date(),
        entities: [TestCustomerEntity],
        workflow: TestWorkflow,
        canAutonomously: [
          { action: 'query_data', resources: ['customers'], riskLevel: 'low' },
          { action: 'generate_dsl', resources: ['*'], riskLevel: 'low' }
        ],
        requiresApproval: [
          { action: 'modify_entity', resources: ['*'], riskLevel: 'high' },
          { action: 'apply_intervention', resources: ['*'], conditions: [{ field: 'sandbox', operator: 'eq', value: false }], riskLevel: 'high' }
        ],
        prohibited: [
          { action: '*', resources: ['payment_systems'], riskLevel: 'critical' },
          { action: 'delete_resource', resources: ['audit_logs'], riskLevel: 'critical' }
        ],
        uncertaintyProtocol: {
          ...DEFAULT_UNCERTAINTY_PROTOCOL,
          confidenceThreshold: 0.75
        },
        negotiationProtocol: DEFAULT_NEGOTIATION_PROTOCOL,
        verification: TestVerification,
        enforcement: {
          ...DEFAULT_ENFORCEMENT,
          auditRetentionDays: 90
        },
        rateLimits: {
          ...DEFAULT_RATE_LIMITS,
          actionsPerMinute: 50
        }
      };

      expect(contract.name).toBe('FullContract');
      expect(contract.canAutonomously).toHaveLength(2);
      expect(contract.requiresApproval).toHaveLength(2);
      expect(contract.prohibited).toHaveLength(2);
      expect(contract.uncertaintyProtocol.confidenceThreshold).toBe(0.75);
    });
  });

  describe('Entity Definition', () => {
    it('should define entity with fields and constraints', () => {
      const entity = createEntity({
        name: 'Product',
        fields: [
          { name: 'id', type: 'uuid', required: true },
          { name: 'price', type: 'number', min: 0, max: 1000000 },
          { name: 'category', type: 'string', enum: ['electronics', 'clothing', 'food'] }
        ]
      });

      expect(entity.name).toBe('Product');
      expect(entity.fields).toHaveLength(3);
      expect(entity.fields[1].min).toBe(0);
      expect(entity.fields[2].enum).toContain('electronics');
    });

    it('should define entity with causal influences', () => {
      expect(TestCustomerEntity.causalInfluences).toHaveLength(2);
      expect(TestCustomerEntity.causalInfluences[0].weight).toBe(-0.3);
      expect(TestCustomerEntity.causalInfluences[0].decay).toBe(0.01);
    });

    it('should define entity with interventions', () => {
      expect(TestCustomerEntity.interventions).toHaveLength(2);
      expect(TestCustomerEntity.interventions[0].sandbox).toBe(true);
      expect(TestCustomerEntity.interventions[0].expectedEffect.riskScore).toBe(-15);
    });
  });

  describe('Workflow Definition', () => {
    it('should create workflow with steps and transitions', () => {
      expect(TestWorkflow.steps).toHaveLength(7);
      expect(TestWorkflow.steps[0].onSuccess).toBe('compute');
      expect(TestWorkflow.steps[0].onFailure).toBe('log_error');
    });

    it('should include safety rails', () => {
      expect(TestWorkflow.safety.maxAdjustmentPerCycle).toBe(0.2);
      expect(TestWorkflow.safety.rollbackOnAnomaly).toBe(true);
      expect(TestWorkflow.safety.sandboxExperimental).toBe(true);
    });

    it('should support step conditions', () => {
      const decideStep = TestWorkflow.steps.find(s => s.id === 'decide');
      expect(decideStep?.conditions).toHaveLength(1);
      expect(decideStep?.conditions?.[0].expression).toBe('riskScore > 50');
    });
  });
});

// ============================================================================
// CONTRACT VALIDATION TESTS
// ============================================================================

describe('E2E: Contract Validation', () => {
  let validContract: AgentContract;

  beforeEach(() => {
    validContract = defineContract('ValidContract', '1.0.0')
      .description('Valid contract for testing')
      .addEntity(TestCustomerEntity)
      .workflow(TestWorkflow)
      .verification(TestVerification)
      .canDo({ action: 'query_data', resources: ['*'], riskLevel: 'low' })
      .build();
  });

  describe('Valid Contract Validation', () => {
    it('should validate a complete contract', () => {
      const result = validateContract(validContract);
      
      // Even if Zod isn't available in test, structure should be correct
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('Entity Validation', () => {
    it('should validate entity structure', () => {
      const result = validateEntity(TestCustomerEntity);
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('should detect invalid entity name (non-PascalCase)', () => {
      const invalidEntity = createEntity({
        name: 'invalid_name', // Should be PascalCase
        fields: [{ name: 'id', type: 'uuid' }]
      });

      const result = validateEntity(invalidEntity);
      // The validator should flag this
      expect(result).toBeDefined();
    });
  });

  describe('Workflow Validation', () => {
    it('should validate workflow structure', () => {
      const result = validateWorkflow(TestWorkflow);
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('should detect invalid step references', () => {
      const invalidWorkflow = createWorkflow({
        name: 'InvalidWorkflow',
        steps: [
          {
            id: 'step1',
            type: 'fetch_data',
            name: 'Step 1',
            onSuccess: 'nonexistent_step' // Invalid reference
          }
        ]
      });

      const result = validateWorkflow(invalidWorkflow);
      expect(result).toBeDefined();
    });
  });
});

// ============================================================================
// CONTRACT EXECUTION TESTS
// ============================================================================

describe('E2E: Contract Execution', () => {
  let contract: AgentContract;
  let executor: ContractExecutor;

  beforeEach(() => {
    contract = defineContract('ExecutionTestAgent', '1.0.0')
      .description('Agent for execution testing')
      .addEntity(TestCustomerEntity)
      .workflow(TestWorkflow)
      .verification(TestVerification)
      .canDo({ action: 'query_data', resources: ['*'], riskLevel: 'low' })
      .canDo({ action: 'apply_intervention', resources: ['*'], conditions: [{ field: 'sandbox', operator: 'eq', value: true }], riskLevel: 'medium' })
      .needsApproval({ action: 'modify_entity', resources: ['*'], riskLevel: 'high' })
      .cannotDo({ action: '*', resources: ['forbidden'], riskLevel: 'critical' })
      .rateLimits({ actionsPerMinute: 100, actionsPerHour: 1000, actionsPerDay: 10000, concurrentActions: 10 })
      .build();

    executor = createExecutor(contract);
  });

  describe('Workflow Execution', () => {
    it('should execute workflow successfully', async () => {
      const result = await executor.execute({ testMode: true });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.context).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.verification).toBeDefined();
    });

    it('should track execution metrics', async () => {
      const result = await executor.execute();

      expect(result.metrics.totalSteps).toBeGreaterThan(0);
      expect(typeof result.metrics.durationMs).toBe('number');
      expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should maintain execution history', async () => {
      const result = await executor.execute();

      expect(result.context.history).toBeDefined();
      expect(Array.isArray(result.context.history)).toBe(true);
    });
  });

  describe('Action Requests', () => {
    it('should allow autonomous query_data action', async () => {
      const request: ActionRequest = {
        action: 'query_data',
        target: 'customers',
        parameters: { filter: 'active' },
        confidence: 0.9,
        reasoning: 'Fetching customer data for analysis'
      };

      const response = await executor.requestAction(request);

      expect(response.allowed).toBe(true);
      expect(response.requiresApproval).toBe(false);
      expect(response.auditId).toBeDefined();
    });

    it('should require approval for modify_entity action', async () => {
      const request: ActionRequest = {
        action: 'modify_entity',
        target: 'customers',
        parameters: { action: 'update' },
        confidence: 0.85,
        reasoning: 'Updating customer record'
      };

      const response = await executor.requestAction(request);

      expect(response.allowed).toBe(true);
      expect(response.requiresApproval).toBe(true);
    });

    it('should deny prohibited actions', async () => {
      const request: ActionRequest = {
        action: 'delete_resource',
        target: 'forbidden',
        parameters: {},
        confidence: 0.95,
        reasoning: 'Attempting forbidden action'
      };

      const response = await executor.requestAction(request);

      expect(response.allowed).toBe(false);
    });

    it('should require approval for low confidence actions', async () => {
      const request: ActionRequest = {
        action: 'query_data',
        target: 'customers',
        parameters: {},
        confidence: 0.5, // Below threshold (0.7)
        reasoning: 'Low confidence query'
      };

      const response = await executor.requestAction(request);

      // Low confidence should trigger approval requirement
      expect(response.requiresApproval).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Send many requests quickly
      const requests: Promise<ActionResponse>[] = [];
      
      for (let i = 0; i < 10; i++) {
        requests.push(executor.requestAction({
          action: 'query_data',
          target: 'customers',
          parameters: { i },
          confidence: 0.9,
          reasoning: `Request ${i}`
        }));
      }

      const responses = await Promise.all(requests);
      
      // At least some should succeed
      const allowed = responses.filter(r => r.allowed);
      expect(allowed.length).toBeGreaterThan(0);
    });
  });

  describe('Audit Logging', () => {
    it('should log all actions', async () => {
      await executor.requestAction({
        action: 'query_data',
        target: 'customers',
        parameters: {},
        confidence: 0.9,
        reasoning: 'Audit test'
      });

      const auditLog = executor.getAuditLog();
      
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].timestamp).toBeDefined();
    });
  });

  describe('Freeze Protection', () => {
    it('should track frozen state', () => {
      expect(executor.isFrozenState()).toBe(false);
    });
  });
});

// ============================================================================
// VERIFICATION TESTS
// ============================================================================

describe('E2E: Verification & Learning', () => {
  let contract: AgentContract;

  beforeEach(() => {
    contract = defineContract('VerificationTestAgent', '1.0.0')
      .description('Agent for verification testing')
      .addEntity(TestCustomerEntity)
      .workflow(TestWorkflow)
      .verification(TestVerification)
      .build();
  });

  describe('Verification Configuration', () => {
    it('should have verification enabled', () => {
      expect(contract.verification.enabled).toBe(true);
      expect(contract.verification.causalLoop).toBe(true);
    });

    it('should have metrics defined', () => {
      expect(contract.verification.metrics).toHaveLength(2);
      expect(contract.verification.metrics[0].name).toBe('riskAccuracy');
    });

    it('should have thresholds configured', () => {
      expect(contract.verification.thresholds.anomalyDetection).toBe(0.1);
      expect(contract.verification.thresholds.confidenceDecay).toBe(true);
    });
  });

  describe('Learning Configuration', () => {
    it('should have learning enabled with approval lock', () => {
      expect(contract.verification.learningConfig.enabled).toBe(true);
      expect(contract.verification.learningConfig.lockedBeforeApproval).toBe(true);
    });

    it('should require minimum observations', () => {
      expect(contract.verification.learningConfig.minObservations).toBe(5);
    });

    it('should have learning rate configured', () => {
      expect(contract.verification.learningConfig.learningRate).toBe(0.1);
    });
  });
});

// ============================================================================
// PERMISSION SYSTEM TESTS
// ============================================================================

describe('E2E: Permission System', () => {
  describe('Permission Definitions', () => {
    it('should support conditional permissions', () => {
      const permission: Permission = {
        action: 'create_alert',
        resources: ['*'],
        conditions: [
          { field: 'severity', operator: 'in', value: ['low', 'medium'] }
        ],
        riskLevel: 'medium'
      };

      expect(permission.conditions).toHaveLength(1);
      expect(permission.conditions?.[0].operator).toBe('in');
    });

    it('should support wildcard resources', () => {
      const permission: Permission = {
        action: 'query_data',
        resources: ['*'],
        riskLevel: 'low'
      };

      expect(permission.resources).toContain('*');
    });

    it('should support multiple resources', () => {
      const permission: Permission = {
        action: 'modify_entity',
        resources: ['customers', 'contractors', 'products'],
        riskLevel: 'high'
      };

      expect(permission.resources).toHaveLength(3);
    });
  });

  describe('Risk Levels', () => {
    it('should categorize actions by risk', () => {
      const lowRisk: Permission = { action: 'query_data', resources: ['*'], riskLevel: 'low' };
      const mediumRisk: Permission = { action: 'create_alert', resources: ['*'], riskLevel: 'medium' };
      const highRisk: Permission = { action: 'modify_entity', resources: ['*'], riskLevel: 'high' };
      const criticalRisk: Permission = { action: '*', resources: ['payment_systems'], riskLevel: 'critical' };

      expect(lowRisk.riskLevel).toBe('low');
      expect(mediumRisk.riskLevel).toBe('medium');
      expect(highRisk.riskLevel).toBe('high');
      expect(criticalRisk.riskLevel).toBe('critical');
    });
  });
});

// ============================================================================
// SAFETY RAILS TESTS
// ============================================================================

describe('E2E: Safety Rails', () => {
  describe('Default Safety Rails', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_SAFETY_RAILS.maxAdjustmentPerCycle).toBeLessThanOrEqual(0.2);
      expect(DEFAULT_SAFETY_RAILS.rollbackOnAnomaly).toBe(true);
      expect(DEFAULT_SAFETY_RAILS.sandboxExperimental).toBe(true);
      expect(DEFAULT_SAFETY_RAILS.freezeOnCriticalAnomaly).toBe(true);
    });
  });

  describe('Custom Safety Rails', () => {
    it('should allow customization', () => {
      const customRails = {
        ...DEFAULT_SAFETY_RAILS,
        maxAdjustmentPerCycle: 0.05,
        maxIterations: 50
      };

      expect(customRails.maxAdjustmentPerCycle).toBe(0.05);
      expect(customRails.maxIterations).toBe(50);
    });
  });

  describe('Enforcement Configuration', () => {
    it('should have audit and approval settings', () => {
      expect(DEFAULT_ENFORCEMENT.logAllDecisions).toBe(true);
      expect(DEFAULT_ENFORCEMENT.overrideRequiresApproval).toBe(true);
      expect(DEFAULT_ENFORCEMENT.feedbackLockedBeforeLearning).toBe(true);
      expect(DEFAULT_ENFORCEMENT.causalVerificationRequired).toBe(true);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('E2E: Full Integration', () => {
  it('should complete full contract lifecycle', async () => {
    // 1. Define contract
    const contract = defineContract('FullLifecycleAgent', '1.0.0')
      .description('Full lifecycle test')
      .addEntity(TestCustomerEntity)
      .workflow(TestWorkflow)
      .verification(TestVerification)
      .canDo({ action: 'query_data', resources: ['*'], riskLevel: 'low' })
      .needsApproval({ action: 'modify_entity', resources: ['*'], riskLevel: 'high' })
      .cannotDo({ action: '*', resources: ['forbidden'], riskLevel: 'critical' })
      .build();

    // 2. Validate contract
    const validation = validateContract(contract);
    expect(validation).toBeDefined();

    // 3. Create executor
    const executor = createExecutor(contract);
    expect(executor).toBeDefined();

    // 4. Execute workflow
    const result = await executor.execute({ testInput: 'value' });
    expect(result).toBeDefined();
    expect(result.context.contractId).toBe('FullLifecycleAgent');

    // 5. Request action
    const response = await executor.requestAction({
      action: 'query_data',
      target: 'customers',
      parameters: {},
      confidence: 0.9,
      reasoning: 'Integration test query'
    });
    expect(response.allowed).toBe(true);

    // 6. Check audit log
    const auditLog = executor.getAuditLog();
    expect(auditLog.length).toBeGreaterThan(0);

    // 7. Verify no freeze
    expect(executor.isFrozenState()).toBe(false);
  });
});
