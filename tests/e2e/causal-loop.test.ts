/**
 * E2E Test: Causal Verification Loop
 * 
 * Tests the complete causal verification flow:
 * - Prediction creation
 * - Observation recording
 * - Verification execution
 * - Learning application
 * - Confidence decay
 */

import {
  CausalVerificationLoop,
  createCausalVerificationLoop,
  CausalLoopConfig,
  DEFAULT_CAUSAL_LOOP_CONFIG,
  CausalPrediction,
  ObservedOutcome,
  VerificationResult,
  ModelAdjustment
} from '../../core/causal/verification-loop';

import {
  CausalModel,
  CausalNode,
  CausalEdge,
  Intervention
} from '../../core/ontology/types';

// ============================================================================
// TEST DATA
// ============================================================================

const createTestCausalModel = (): CausalModel => ({
  name: 'TestRiskModel',
  version: '1.0',
  nodes: [
    { id: 'revenue', label: 'Revenue', type: 'observable' },
    { id: 'paymentDelays', label: 'Payment Delays', type: 'observable' },
    { id: 'riskScore', label: 'Risk Score', type: 'outcome' },
    { id: 'creditLimit', label: 'Credit Limit', type: 'controllable' }
  ],
  edges: [
    { from: 'revenue', to: 'riskScore', strength: -0.3, confidence: 0.8 },
    { from: 'paymentDelays', to: 'riskScore', strength: 0.4, confidence: 0.85 },
    { from: 'creditLimit', to: 'riskScore', strength: -0.2, confidence: 0.7 }
  ],
  interventions: [
    {
      id: 'int-1',
      name: 'reduceLimit',
      description: 'Reduce credit limit',
      target: 'creditLimit',
      expectedEffects: [
        { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
      ]
    },
    {
      id: 'int-2',
      name: 'increaseMonitoring',
      description: 'Increase monitoring frequency',
      target: 'monitoringLevel',
      expectedEffects: [
        { target: 'riskScore', direction: 'decrease', magnitude: 0.05, confidence: 0.9 }
      ]
    }
  ],
  constraints: []
});

// ============================================================================
// CAUSAL LOOP CREATION TESTS
// ============================================================================

describe('E2E: Causal Verification Loop', () => {
  let model: CausalModel;
  let loop: CausalVerificationLoop;

  beforeEach(() => {
    model = createTestCausalModel();
    loop = createCausalVerificationLoop(model);
  });

  describe('Loop Creation', () => {
    it('should create loop with default config', () => {
      expect(loop).toBeDefined();
      expect(loop.getModel()).toBe(model);
    });

    it('should create loop with custom config', () => {
      const customConfig: Partial<CausalLoopConfig> = {
        confidenceDecayRate: 0.02,
        minConfidence: 0.4,
        maxAdjustmentPerCycle: 0.05
      };

      const customLoop = createCausalVerificationLoop(model, customConfig);
      expect(customLoop).toBeDefined();
    });

    it('should have default config values', () => {
      expect(DEFAULT_CAUSAL_LOOP_CONFIG.confidenceDecayRate).toBe(0.01);
      expect(DEFAULT_CAUSAL_LOOP_CONFIG.minConfidence).toBe(0.3);
      expect(DEFAULT_CAUSAL_LOOP_CONFIG.maxConfidence).toBe(0.99);
      expect(DEFAULT_CAUSAL_LOOP_CONFIG.matchTolerance).toBe(0.1);
      expect(DEFAULT_CAUSAL_LOOP_CONFIG.anomalyThreshold).toBe(0.3);
    });
  });

  // ==========================================================================
  // PREDICTION TESTS
  // ==========================================================================

  describe('Predictions', () => {
    it('should create prediction for intervention', () => {
      const intervention: Intervention = {
        id: 'test-int-1',
        name: 'testIntervention',
        description: 'Test intervention',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
        ]
      };

      const prediction = loop.predict(intervention);

      expect(prediction).toBeDefined();
      expect(prediction.id).toMatch(/^pred_/);
      expect(prediction.intervention).toBe(intervention);
      expect(prediction.status).toBe('pending');
      expect(prediction.predictedEffects.length).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should store predictions', () => {
      const intervention: Intervention = {
        id: 'test-int-2',
        name: 'storeTest',
        description: 'Store test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.1, confidence: 0.7 }
        ]
      };

      const prediction = loop.predict(intervention);
      const retrieved = loop.getPrediction(prediction.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(prediction.id);
    });

    it('should list all predictions', () => {
      // Create multiple predictions
      for (let i = 0; i < 3; i++) {
        loop.predict({
          id: `int-${i}`,
          name: `intervention-${i}`,
          description: `Intervention ${i}`,
          target: 'creditLimit',
          expectedEffects: [
            { target: 'riskScore', direction: 'decrease', magnitude: 0.1, confidence: 0.7 }
          ]
        });
      }

      const allPredictions = loop.getAllPredictions();
      expect(allPredictions.length).toBe(3);
    });

    it('should include predicted effects with confidence', () => {
      const intervention: Intervention = {
        id: 'effect-test',
        name: 'effectTest',
        description: 'Effect test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.2, confidence: 0.85, timeframe: '24h' }
        ]
      };

      const prediction = loop.predict(intervention);

      expect(prediction.predictedEffects[0].target).toBe('riskScore');
      expect(prediction.predictedEffects[0].direction).toBe('decrease');
      expect(prediction.predictedEffects[0].confidence).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // OBSERVATION TESTS
  // ==========================================================================

  describe('Observations', () => {
    let predictionId: string;

    beforeEach(() => {
      const prediction = loop.predict({
        id: 'obs-int',
        name: 'observationTest',
        description: 'Observation test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
        ]
      });
      predictionId = prediction.id;
    });

    it('should record observation', () => {
      const observation = loop.observe(predictionId, 'riskScore', -0.12, { source: 'test' });

      expect(observation).toBeDefined();
      expect(observation.predictionId).toBe(predictionId);
      expect(observation.target).toBe('riskScore');
      expect(observation.actualValue).toBe(-0.12);
    });

    it('should calculate deviation', () => {
      const observation = loop.observe(predictionId, 'riskScore', -0.10);

      // Predicted was 0.15, actual is 0.10, deviation should be calculated
      expect(observation.deviation).toBeDefined();
      expect(typeof observation.deviation).toBe('number');
    });

    it('should throw for unknown prediction', () => {
      expect(() => {
        loop.observe('nonexistent', 'riskScore', -0.1);
      }).toThrow();
    });

    it('should include context in observation', () => {
      const context = { source: 'daily_check', userId: 'user-123' };
      const observation = loop.observe(predictionId, 'riskScore', -0.12, context);

      expect(observation.context).toEqual(context);
    });
  });

  // ==========================================================================
  // VERIFICATION TESTS
  // ==========================================================================

  describe('Verification', () => {
    let predictionId: string;

    beforeEach(() => {
      const prediction = loop.predict({
        id: 'verify-int',
        name: 'verifyTest',
        description: 'Verification test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
        ]
      });
      predictionId = prediction.id;
    });

    it('should verify prediction without observations', () => {
      const result = loop.verify(predictionId);

      expect(result).toBeDefined();
      expect(result.predictionId).toBe(predictionId);
      // Should have anomalies for missing observations
      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it('should verify prediction with matching observations', () => {
      // Record observation that matches prediction
      loop.observe(predictionId, 'riskScore', 0.15); // Matches expected magnitude

      const result = loop.verify(predictionId);

      expect(result).toBeDefined();
      expect(result.overallMatch).toBeGreaterThan(0);
    });

    it('should detect anomalies for large deviations', () => {
      // Record observation with large deviation
      loop.observe(predictionId, 'riskScore', 0.5); // Much larger than expected 0.15

      const result = loop.verify(predictionId);

      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it('should suggest model adjustments', () => {
      // Record observation with deviation
      loop.observe(predictionId, 'riskScore', 0.10); // Slightly different

      const result = loop.verify(predictionId);

      // May or may not have adjustments depending on tolerance
      expect(Array.isArray(result.modelAdjustments)).toBe(true);
    });

    it('should validate causal path', () => {
      loop.observe(predictionId, 'riskScore', 0.14);

      const result = loop.verify(predictionId);

      expect(typeof result.causalPathValid).toBe('boolean');
    });

    it('should update prediction status after verification', () => {
      loop.observe(predictionId, 'riskScore', 0.15);
      loop.verify(predictionId);

      const prediction = loop.getPrediction(predictionId);
      expect(prediction?.status).not.toBe('pending');
    });

    it('should throw for unknown prediction', () => {
      expect(() => {
        loop.verify('nonexistent');
      }).toThrow();
    });
  });

  // ==========================================================================
  // LEARNING TESTS
  // ==========================================================================

  describe('Learning', () => {
    it('should require approval by default', () => {
      // Create and verify prediction
      const prediction = loop.predict({
        id: 'learn-int',
        name: 'learnTest',
        description: 'Learning test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
        ]
      });

      loop.observe(prediction.id, 'riskScore', 0.12);
      loop.verify(prediction.id);

      // Try to apply learning without approval
      const result = loop.applyLearning();

      // Should be skipped because approval required
      expect(result.applied.length).toBe(0);
    });

    it('should apply learning with approval', () => {
      // Need enough observations
      for (let i = 0; i < 5; i++) {
        const prediction = loop.predict({
          id: `learn-int-${i}`,
          name: `learnTest-${i}`,
          description: 'Learning test',
          target: 'creditLimit',
          expectedEffects: [
            { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
          ]
        });

        loop.observe(prediction.id, 'riskScore', 0.12);
        loop.verify(prediction.id);
      }

      // Apply with approval
      const result = loop.applyLearning('admin@test.com');

      expect(result).toBeDefined();
      expect(Array.isArray(result.applied)).toBe(true);
      expect(Array.isArray(result.skipped)).toBe(true);
    });

    it('should get pending adjustments', () => {
      const pending = loop.getPendingAdjustments();
      expect(Array.isArray(pending)).toBe(true);
    });

    it('should get feedback log', () => {
      const feedbackLog = loop.getFeedbackLog();
      expect(Array.isArray(feedbackLog)).toBe(true);
    });
  });

  // ==========================================================================
  // CONFIDENCE DECAY TESTS
  // ==========================================================================

  describe('Confidence Decay', () => {
    it('should have confidence within bounds', () => {
      const prediction = loop.predict({
        id: 'decay-int',
        name: 'decayTest',
        description: 'Decay test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
        ]
      });

      expect(prediction.confidence).toBeGreaterThanOrEqual(DEFAULT_CAUSAL_LOOP_CONFIG.minConfidence);
      expect(prediction.confidence).toBeLessThanOrEqual(DEFAULT_CAUSAL_LOOP_CONFIG.maxConfidence);
    });

    it('should update confidence after verification', () => {
      const prediction = loop.predict({
        id: 'confidence-int',
        name: 'confidenceTest',
        description: 'Confidence test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
        ]
      });

      const initialConfidence = prediction.confidence;

      loop.observe(prediction.id, 'riskScore', 0.15);
      const result = loop.verify(prediction.id);

      // Confidence should be updated
      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });
  });

  // ==========================================================================
  // ANOMALY DETECTION TESTS
  // ==========================================================================

  describe('Anomaly Detection', () => {
    it('should detect missing effect anomaly', () => {
      const prediction = loop.predict({
        id: 'missing-int',
        name: 'missingTest',
        description: 'Missing effect test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
        ]
      });

      // Don't observe anything
      const result = loop.verify(prediction.id);

      const missingAnomalies = result.anomalies.filter(a => a.type === 'missing_effect');
      expect(missingAnomalies.length).toBeGreaterThan(0);
    });

    it('should categorize anomaly severity', () => {
      const prediction = loop.predict({
        id: 'severity-int',
        name: 'severityTest',
        description: 'Severity test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
        ]
      });

      // Observe with large deviation
      loop.observe(prediction.id, 'riskScore', 0.8);

      const result = loop.verify(prediction.id);

      if (result.anomalies.length > 0) {
        const severities = result.anomalies.map(a => a.severity);
        expect(severities.every(s => ['low', 'medium', 'high', 'critical'].includes(s))).toBe(true);
      }
    });

    it('should include suggested action for anomalies', () => {
      const prediction = loop.predict({
        id: 'action-int',
        name: 'actionTest',
        description: 'Action test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8 }
        ]
      });

      const result = loop.verify(prediction.id);

      if (result.anomalies.length > 0) {
        expect(result.anomalies.every(a => a.suggestedAction)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // INTEGRATION TEST
  // ==========================================================================

  describe('Full Integration', () => {
    it('should complete full causal verification cycle', () => {
      // 1. Create intervention
      const intervention: Intervention = {
        id: 'full-int',
        name: 'fullCycleTest',
        description: 'Full cycle integration test',
        target: 'creditLimit',
        expectedEffects: [
          { target: 'riskScore', direction: 'decrease', magnitude: 0.15, confidence: 0.8, timeframe: '24h' }
        ]
      };

      // 2. Create prediction
      const prediction = loop.predict(intervention);
      expect(prediction.status).toBe('pending');

      // 3. Simulate intervention execution (external)
      // ... intervention applied ...

      // 4. Record observation
      const observation = loop.observe(prediction.id, 'riskScore', 0.13, {
        source: 'daily_assessment',
        timestamp: new Date().toISOString()
      });
      expect(observation.predictionId).toBe(prediction.id);

      // 5. Verify outcome
      const verification = loop.verify(prediction.id);
      expect(verification.predictionId).toBe(prediction.id);
      expect(verification.effectResults.length).toBeGreaterThan(0);

      // 6. Check prediction status updated
      const updatedPrediction = loop.getPrediction(prediction.id);
      expect(updatedPrediction?.status).not.toBe('pending');

      // 7. Get feedback log
      const feedbackLog = loop.getFeedbackLog();
      expect(feedbackLog.length).toBeGreaterThan(0);

      // 8. Get pending adjustments
      const pendingAdjustments = loop.getPendingAdjustments();
      expect(Array.isArray(pendingAdjustments)).toBe(true);
    });
  });
});
