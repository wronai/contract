/**
 * AI Contract Unit Tests
 */

import {
  AIContractEnforcer,
  createContractEnforcer,
  DEFAULT_AI_CONTRACT,
  AIContract,
  AIAction,
  Permission
} from '../../core/ai-contract';

function createAction(overrides: Partial<AIAction> = {}): AIAction {
  return {
    id: `action-${Date.now()}`,
    type: 'query_data',
    target: 'customers',
    parameters: {},
    confidence: 0.9,
    reasoning: 'Test action',
    context: {
      sessionId: 'test-session',
      previousActions: [],
      currentState: {}
    },
    timestamp: new Date(),
    ...overrides
  };
}

function createContract(overrides: Partial<AIContract> = {}): AIContract {
  return {
    ...DEFAULT_AI_CONTRACT,
    ...overrides
  };
}

describe('AIContractEnforcer', () => {
  let enforcer: AIContractEnforcer;

  beforeEach(() => {
    enforcer = createContractEnforcer();
  });

  describe('evaluateAction()', () => {
    describe('Autonomous Actions', () => {
      it('should allow query_data autonomously', async () => {
        const action = createAction({ type: 'query_data' });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe(true);
      });

      it('should allow generate_dsl autonomously', async () => {
        const action = createAction({ type: 'generate_dsl' });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe(true);
      });

      it('should allow update_dashboard autonomously', async () => {
        const action = createAction({ type: 'update_dashboard' });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe(true);
      });

      it('should allow low severity alerts autonomously', async () => {
        const action = createAction({
          type: 'create_alert',
          parameters: { severity: 'low' }
        });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe(true);
      });
    });

    describe('Actions Requiring Approval', () => {
      it('should require approval for modify_entity', async () => {
        const action = createAction({ type: 'modify_entity' });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe('pending');
        expect(decision.approvalRequest).toBeDefined();
      });

      it('should require approval for high severity alerts', async () => {
        const action = createAction({
          type: 'create_alert',
          parameters: { severity: 'high' }
        });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe('pending');
      });

      it('should require approval for send_notification', async () => {
        const action = createAction({ type: 'send_notification' });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe('pending');
      });

      it('should require approval for access_external', async () => {
        const action = createAction({ type: 'access_external' });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe('pending');
      });

      it('should create proper approval request', async () => {
        const action = createAction({ type: 'modify_entity' });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.approvalRequest).toMatchObject({
          id: expect.any(String),
          action: action,
          requiredApprovers: expect.any(Array),
          expiresAt: expect.any(Date),
          priority: expect.any(String)
        });
      });
    });

    describe('Prohibited Actions', () => {
      it('should deny access to payment_systems', async () => {
        const action = createAction({
          type: 'query_data',
          target: 'payment_systems'
        });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe(false);
      });

      it('should deny access to security_settings', async () => {
        const action = createAction({
          type: 'modify_entity',
          target: 'security_settings'
        });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe(false);
      });

      it('should deny deleting audit_logs', async () => {
        const action = createAction({
          type: 'delete_resource',
          target: 'audit_logs'
        });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe(false);
      });

      it('should suggest alternatives for denied actions', async () => {
        const action = createAction({
          type: 'query_data',
          target: 'payment_systems',
          alternatives: [
            createAction({ type: 'query_data', target: 'customers' })
          ]
        });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.alternatives).toBeDefined();
      });
    });

    describe('Confidence Threshold', () => {
      it('should require clarification for low confidence', async () => {
        const action = createAction({
          type: 'generate_dsl',
          confidence: 0.5 // Below 0.7 threshold
        });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe('clarification_needed');
        expect(decision.questions).toBeDefined();
      });

      it('should allow high confidence actions', async () => {
        const action = createAction({
          type: 'generate_dsl',
          confidence: 0.9
        });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.allowed).toBe(true);
      });

      it('should generate clarifying questions', async () => {
        const action = createAction({
          type: 'generate_dsl',
          confidence: 0.5,
          uncertainties: [
            { aspect: 'target', level: 'high', reason: 'Multiple targets possible' }
          ]
        });

        const decision = await enforcer.evaluateAction(action);

        expect(decision.questions).toBeDefined();
        expect(decision.questions!.length).toBeGreaterThan(0);
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limits', async () => {
        const contract = createContract({
          limits: {
            maxActionsPerMinute: 2,
            maxResourcesPerAction: 100,
            maxConcurrentActions: 10,
            dailyActionBudget: 1000
          }
        });
        const enforcer = createContractEnforcer(contract);

        // First two should succeed
        await enforcer.evaluateAction(createAction());
        await enforcer.evaluateAction(createAction());

        // Third should be rate limited
        const decision = await enforcer.evaluateAction(createAction());

        expect(decision.allowed).toBe(false);
        expect(decision.reason).toContain('Rate limit');
      });
    });

    describe('Audit Logging', () => {
      it('should log all decisions', async () => {
        await enforcer.evaluateAction(createAction({ type: 'query_data' }));
        await enforcer.evaluateAction(createAction({ type: 'modify_entity' }));

        const log = enforcer.getAuditLog();

        expect(log.length).toBe(2);
      });

      it('should include decision details in audit', async () => {
        const action = createAction({ type: 'query_data' });
        
        const decision = await enforcer.evaluateAction(action);

        expect(decision.auditLog).toMatchObject({
          timestamp: expect.any(Date),
          action: action,
          decision: expect.any(String),
          reason: expect.any(String),
          contractVersion: DEFAULT_AI_CONTRACT.version
        });
      });

      it('should limit audit log retrieval', async () => {
        for (let i = 0; i < 10; i++) {
          await enforcer.evaluateAction(createAction());
        }

        const limitedLog = enforcer.getAuditLog(5);

        expect(limitedLog.length).toBe(5);
      });
    });
  });

  describe('processApproval()', () => {
    it('should process approval and return action', async () => {
      const action = createAction({ type: 'modify_entity' });
      const decision = await enforcer.evaluateAction(action);
      
      const approvalId = decision.approvalRequest!.id;
      const result = await enforcer.processApproval(approvalId, true, 'admin');

      expect(result.success).toBe(true);
      expect(result.action).toEqual(action);
    });

    it('should process rejection', async () => {
      const action = createAction({ type: 'modify_entity' });
      const decision = await enforcer.evaluateAction(action);
      
      const approvalId = decision.approvalRequest!.id;
      const result = await enforcer.processApproval(approvalId, false, 'admin', 'Not needed');

      expect(result.success).toBe(true);
      expect(result.action).toBeUndefined();
    });

    it('should fail for invalid approval ID', async () => {
      const result = await enforcer.processApproval('invalid-id', true, 'admin');

      expect(result.success).toBe(false);
    });

    it('should log approval decision', async () => {
      const action = createAction({ type: 'modify_entity' });
      const decision = await enforcer.evaluateAction(action);
      
      await enforcer.processApproval(decision.approvalRequest!.id, true, 'admin');

      const log = enforcer.getAuditLog(1);
      expect(log[0].reason).toContain('Approved by admin');
    });
  });

  describe('getPendingApprovals()', () => {
    it('should return pending approvals', async () => {
      await enforcer.evaluateAction(createAction({ type: 'modify_entity' }));
      await enforcer.evaluateAction(createAction({ type: 'send_notification' }));

      const pending = enforcer.getPendingApprovals();

      expect(pending.length).toBe(2);
    });

    it('should remove approved requests from pending', async () => {
      await enforcer.evaluateAction(createAction({ type: 'modify_entity' }));
      const pending1 = enforcer.getPendingApprovals();
      
      await enforcer.processApproval(pending1[0].id, true, 'admin');
      
      const pending2 = enforcer.getPendingApprovals();
      expect(pending2.length).toBe(0);
    });
  });
});

describe('DEFAULT_AI_CONTRACT', () => {
  it('should have valid structure', () => {
    expect(DEFAULT_AI_CONTRACT).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      version: expect.any(String),
      canAutonomously: expect.any(Array),
      requiresApproval: expect.any(Array),
      cannot: expect.any(Array),
      uncertaintyProtocol: expect.any(Object),
      negotiationProtocol: expect.any(Object),
      limits: expect.any(Object)
    });
  });

  it('should have reasonable defaults', () => {
    expect(DEFAULT_AI_CONTRACT.uncertaintyProtocol.confidenceThreshold).toBeGreaterThan(0.5);
    expect(DEFAULT_AI_CONTRACT.limits.maxActionsPerMinute).toBeGreaterThan(0);
  });
});

describe('createContractEnforcer()', () => {
  it('should create enforcer with default contract', () => {
    const enforcer = createContractEnforcer();

    expect(enforcer).toBeInstanceOf(AIContractEnforcer);
  });

  it('should create enforcer with custom contract', () => {
    const customContract = createContract({
      limits: { ...DEFAULT_AI_CONTRACT.limits, maxActionsPerMinute: 1000 }
    });

    const enforcer = createContractEnforcer(customContract);

    expect(enforcer).toBeInstanceOf(AIContractEnforcer);
  });
});
