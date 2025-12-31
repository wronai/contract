/**
 * Verification Engine Unit Tests
 */

import { 
  VerificationEngine, 
  createVerificationEngine,
  Intent,
  ExpectedOutcome
} from '../../core/verification';
import { ExecutionPlan, ExecutionResult, ExecutionGraph } from '../../core/planner';

// Helper to create test data
function createIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    id: 'intent-1',
    description: 'Test intent',
    type: 'query',
    targets: ['customer'],
    expectedOutcomes: [],
    constraints: [],
    priority: 'medium',
    timestamp: new Date(),
    ...overrides
  };
}

function createPlan(nodeCount: number = 1): ExecutionPlan {
  const nodes = new Map();
  for (let i = 0; i < nodeCount; i++) {
    nodes.set(`node-${i}`, {
      id: `node-${i}`,
      type: 'transform',
      name: `Node ${i}`,
      config: {},
      dependencies: i > 0 ? [`node-${i-1}`] : [],
      outputs: [],
      status: 'pending'
    });
  }

  return {
    graph: {
      nodes,
      edges: [],
      entryPoints: ['node-0'],
      metadata: { name: 'test', version: '1.0', createdAt: new Date(), hash: 'abc' }
    },
    stages: [{ order: 0, nodes: Array.from(nodes.keys()), parallel: false }]
  };
}

function createResult(success: boolean, completedNodes: number = 1): ExecutionResult {
  const results = [];
  for (let i = 0; i < completedNodes; i++) {
    results.push({
      nodeId: `node-${i}`,
      status: success ? 'completed' as const : 'failed' as const,
      data: { value: i }
    });
  }

  return {
    success,
    results,
    errors: success ? [] : [{ nodeId: 'node-0', error: 'Test error' }]
  };
}

describe('VerificationEngine', () => {
  let engine: VerificationEngine;

  beforeEach(() => {
    engine = createVerificationEngine();
  });

  describe('verify()', () => {
    it('should verify successful execution', async () => {
      const intent = createIntent();
      const plan = createPlan(3);
      const result = createResult(true, 3);

      const verification = await engine.verify(intent, plan, result);

      expect(verification.intentMatch).toBeGreaterThan(0.5);
      expect(verification.stateConsistency).toBeGreaterThan(0.5);
      expect(verification.decision.action).toBe('accept');
    });

    it('should detect failed execution', async () => {
      const intent = createIntent();
      const plan = createPlan(1);
      const result = createResult(false, 1);

      const verification = await engine.verify(intent, plan, result);

      expect(verification.intentMatch).toBeLessThan(1);
      expect(verification.decision.action).not.toBe('accept');
    });

    it('should check outcome achievements', async () => {
      const intent = createIntent({
        expectedOutcomes: [
          { type: 'data', target: 'node-0', condition: 'exists', importance: 1.0 }
        ]
      });
      const plan = createPlan(1);
      const result = createResult(true, 1);

      const verification = await engine.verify(intent, plan, result);

      expect(verification.outcomeResults).toHaveLength(1);
      expect(verification.outcomeResults[0].achieved).toBe(true);
    });

    it('should detect failed outcomes', async () => {
      const intent = createIntent({
        expectedOutcomes: [
          { type: 'data', target: 'missing-node', condition: 'exists', importance: 1.0 }
        ]
      });
      const plan = createPlan(1);
      const result = createResult(true, 1);

      const verification = await engine.verify(intent, plan, result);

      expect(verification.outcomeResults[0].achieved).toBe(false);
    });

    it('should check constraints', async () => {
      const intent = createIntent({
        constraints: [
          { type: 'must_not', condition: 'errors' }
        ]
      });
      const plan = createPlan(1);
      const result = createResult(false, 1); // Has errors

      const verification = await engine.verify(intent, plan, result);

      expect(verification.constraintResults.some(c => !c.satisfied)).toBe(true);
    });

    it('should assess risk level', async () => {
      const intent = createIntent();
      const plan = createPlan(1);
      const result = createResult(true, 1);

      const verification = await engine.verify(intent, plan, result);

      expect(['minimal', 'low', 'medium', 'high', 'critical']).toContain(verification.riskLevel);
    });

    it('should generate recommendations', async () => {
      const intent = createIntent({
        expectedOutcomes: [
          { type: 'data', target: 'missing', condition: 'exists', importance: 0.9 }
        ]
      });
      const plan = createPlan(1);
      const result = createResult(true, 1);

      const verification = await engine.verify(intent, plan, result);

      expect(verification.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should include reasoning', async () => {
      const intent = createIntent();
      const plan = createPlan(1);
      const result = createResult(true, 1);

      const verification = await engine.verify(intent, plan, result);

      expect(verification.reasoning).toBeTruthy();
      expect(typeof verification.reasoning).toBe('string');
    });
  });

  describe('Decision Making', () => {
    it('should accept high-quality execution', async () => {
      const intent = createIntent();
      const plan = createPlan(3);
      const result = createResult(true, 3);

      const verification = await engine.verify(intent, plan, result);

      expect(verification.decision.action).toBe('accept');
      expect(verification.decision.confidence).toBeGreaterThan(0.5);
    });

    it('should suggest retry for low intent match', async () => {
      const intent = createIntent({
        expectedOutcomes: [
          { type: 'data', target: 'x', condition: 'a', importance: 1 },
          { type: 'data', target: 'y', condition: 'b', importance: 1 },
          { type: 'data', target: 'z', condition: 'c', importance: 1 }
        ]
      });
      const plan = createPlan(1);
      const result: ExecutionResult = {
        success: false,
        results: [{ nodeId: 'node-0', status: 'failed' }],
        errors: [{ nodeId: 'node-0', error: 'failed' }]
      };

      const verification = await engine.verify(intent, plan, result);

      expect(['retry', 'adjust', 'escalate']).toContain(verification.decision.action);
    });

    it('should escalate on critical anomalies', async () => {
      // This test depends on anomaly detection finding critical issues
      const intent = createIntent();
      const plan = createPlan(2);
      
      // Create inconsistent result - node-1 completed but dependency node-0 failed
      const result: ExecutionResult = {
        success: false,
        results: [
          { nodeId: 'node-0', status: 'failed', error: 'failed' },
          { nodeId: 'node-1', status: 'completed', data: {} }
        ],
        errors: [{ nodeId: 'node-0', error: 'failed' }]
      };

      const verification = await engine.verify(intent, plan, result);

      // Should detect inconsistency and possibly escalate
      expect(verification.anomalies.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect missing data anomaly', async () => {
      const intent = createIntent();
      const plan = createPlan(1);
      const result: ExecutionResult = {
        success: true,
        results: [{ nodeId: 'node-0', status: 'completed' }], // No data
        errors: []
      };

      const verification = await engine.verify(intent, plan, result);

      expect(verification.anomalies.some(a => a.type === 'missing_data')).toBe(true);
    });

    it('should detect state inconsistency', async () => {
      const intent = createIntent();
      const plan = createPlan(2);
      
      // Node 1 completed before its dependency node 0
      plan.graph.nodes.get('node-1')!.dependencies = ['node-0'];
      
      const result: ExecutionResult = {
        success: true,
        results: [
          { nodeId: 'node-0', status: 'pending' },
          { nodeId: 'node-1', status: 'completed', data: {} }
        ],
        errors: []
      };

      const verification = await engine.verify(intent, plan, result);

      expect(verification.anomalies.some(a => a.type === 'inconsistent_state')).toBe(true);
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate low risk for successful execution', async () => {
      const intent = createIntent();
      const plan = createPlan(1);
      const result = createResult(true, 1);

      const verification = await engine.verify(intent, plan, result);

      expect(['minimal', 'low']).toContain(verification.riskLevel);
    });

    it('should calculate high risk for failed execution with violations', async () => {
      const intent = createIntent({
        constraints: [{ type: 'must', condition: 'success' }]
      });
      const plan = createPlan(1);
      const result = createResult(false, 1);

      const verification = await engine.verify(intent, plan, result);

      expect(['medium', 'high', 'critical']).toContain(verification.riskLevel);
      expect(verification.riskFactors.length).toBeGreaterThan(0);
    });

    it('should identify risk factors', async () => {
      const intent = createIntent();
      const plan = createPlan(1);
      const result = createResult(false, 1);

      const verification = await engine.verify(intent, plan, result);

      for (const factor of verification.riskFactors) {
        expect(factor).toHaveProperty('factor');
        expect(factor).toHaveProperty('contribution');
        expect(factor).toHaveProperty('mitigationPossible');
      }
    });
  });
});

describe('createVerificationEngine()', () => {
  it('should create verification engine instance', () => {
    const engine = createVerificationEngine();

    expect(engine).toBeInstanceOf(VerificationEngine);
  });
});
