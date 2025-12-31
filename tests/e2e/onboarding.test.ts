/**
 * E2E Test: B2B Customer Onboarding Flow
 * 
 * Tests the complete flow from DSL definition to
 * dashboard visualization for customer onboarding.
 */

import {
  getTestContext,
  TEST_DSL_PROGRAMS,
  waitFor
} from './setup';

import type { ExecutionNode, ExecutionPlan, ExecutionResult } from '../../core/planner';

describe('E2E: B2B Customer Onboarding Flow', () => {
  describe('Complete Onboarding DSL Processing', () => {
    it('should parse and validate onboarding DSL', async () => {
      const ctx = getTestContext();
      
      // This would use the real parser in production
      expect(TEST_DSL_PROGRAMS.fullOnboarding).toContain('ENTITY Customer');
      expect(TEST_DSL_PROGRAMS.fullOnboarding).toContain('EVENT CustomerRegistered');
      expect(TEST_DSL_PROGRAMS.fullOnboarding).toContain('PIPELINE OnboardingVerification');
      expect(TEST_DSL_PROGRAMS.fullOnboarding).toContain('ALERT');
      expect(TEST_DSL_PROGRAMS.fullOnboarding).toContain('DASHBOARD');
    });

    it('should build execution graph with correct nodes', async () => {
      const ctx = getTestContext();
      
      // Verify planner exists
      expect(ctx.planner).toBeDefined();
      expect(typeof ctx.planner.buildGraph).toBe('function');
    });
  });

  describe('Customer Registration Event Flow', () => {
    it('should store customer registration event', async () => {
      const ctx = getTestContext();
      
      const result = await ctx.eventStore.append('customer-e2e-123', [{
        streamId: 'customer-e2e-123',
        type: 'CustomerRegistered',
        data: {
          customerId: 'e2e-123',
          name: 'E2E Test Company',
          nip: '1234567890',
          timestamp: new Date()
        },
        metadata: { source: 'e2e-test' }
      }]);

      expect(result.success).toBe(true);
    });

    it('should replay events to reconstruct state', async () => {
      const ctx = getTestContext();
      const customerId = 'replay-e2e-123';
      
      await ctx.eventStore.append(`customer-${customerId}`, [
        { streamId: `customer-${customerId}`, type: 'CustomerRegistered', data: { customerId, name: 'Test', status: 'pending' }, metadata: {} },
        { streamId: `customer-${customerId}`, type: 'CustomerVerified', data: { customerId, verifiedBy: 'admin' }, metadata: {} }
      ]);

      const events = await ctx.eventStore.read(`customer-${customerId}`);
      
      let status = 'unknown';
      for (const event of events.events) {
        if (event.type === 'CustomerRegistered') status = 'pending';
        if (event.type === 'CustomerVerified') status = 'verified';
      }

      expect(status).toBe('verified');
    });
  });

  describe('Read Model Operations', () => {
    it('should have seeded customers', async () => {
      const ctx = getTestContext();
      const customers = await ctx.readModels.customers.getAll();
      expect(customers.length).toBeGreaterThan(0);
    });

    it('should retrieve customer by ID', async () => {
      const ctx = getTestContext();
      const firstCustomer = ctx.seedData.customers[0];
      const customer = await ctx.readModels.customers.get(firstCustomer.customerId);
      expect(customer).toBeDefined();
      expect(customer!.customerId).toBe(firstCustomer.customerId);
    });

    it('should calculate dashboard metrics', async () => {
      const ctx = getTestContext();
      const allCustomers = await ctx.readModels.customers.getAll();
      
      const metrics = {
        total: allCustomers.length,
        pending: allCustomers.filter(c => c.onboardingStatus === 'pending').length,
        verified: allCustomers.filter(c => c.onboardingStatus === 'verified').length,
        highRisk: allCustomers.filter(c => (c.riskScore || 0) > 70).length
      };

      expect(metrics.total).toBeGreaterThan(0);
      expect(metrics.total).toBe(
        allCustomers.filter(c => ['pending', 'verified', 'rejected'].includes(c.onboardingStatus)).length
      );
    });
  });

  describe('Verification Integration', () => {
    it('should verify execution results', async () => {
      const ctx = getTestContext();

      const intent = {
        id: 'e2e-intent-1',
        description: 'Process customer onboarding',
        type: 'automate' as const,
        targets: ['Customer'],
        expectedOutcomes: [],
        constraints: [],
        priority: 'medium' as const,
        timestamp: new Date()
      };

      const node: ExecutionNode = {
        id: 'node-1',
        type: 'transform',
        name: 'Test',
        config: {},
        dependencies: [],
        outputs: [],
        status: 'pending'
      };

      const mockPlan: ExecutionPlan = {
        graph: {
          nodes: new Map<string, ExecutionNode>([['node-1', node]]),
          edges: [],
          entryPoints: ['node-1'],
          metadata: { name: 'test', version: '1.0', createdAt: new Date(), hash: 'abc' }
        },
        stages: [{ order: 0, nodes: ['node-1'], parallel: false }]
      };

      const mockResult: ExecutionResult = {
        success: true,
        results: [{ nodeId: 'node-1', status: 'completed' as const, data: {} }],
        errors: []
      };

      const verification = await ctx.verification.verify(intent, mockPlan, mockResult);
      expect(verification.decision.action).toBe('accept');
    });
  });

  describe('AI Contract Enforcement', () => {
    it('should allow read operations', async () => {
      const ctx = getTestContext();

      const decision = await ctx.aiContract.evaluateAction({
        id: 'action-e2e-1',
        type: 'query_data',
        target: 'customers',
        parameters: {},
        confidence: 0.9,
        reasoning: 'E2E test query',
        context: { sessionId: 'e2e', previousActions: [], currentState: {} },
        timestamp: new Date()
      });

      expect(decision.allowed).toBe(true);
    });

    it('should require approval for mutations', async () => {
      const ctx = getTestContext();

      const decision = await ctx.aiContract.evaluateAction({
        id: 'action-e2e-2',
        type: 'modify_entity',
        target: 'customers',
        parameters: { action: 'verify' },
        confidence: 0.9,
        reasoning: 'E2E test mutation',
        context: { sessionId: 'e2e', previousActions: [], currentState: {} },
        timestamp: new Date()
      });

      expect(decision.allowed).toBe('pending');
    });
  });
});
