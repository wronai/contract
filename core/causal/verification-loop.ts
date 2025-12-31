/**
 * Reclapp Causal Verification Loop
 * 
 * Implements real-world outcome verification against causal predictions,
 * with confidence decay, feedback learning, and intervention tracking.
 * 
 * This is the core "game-changer" component that closes the loop between
 * intent, prediction, execution, and actual outcomes.
 */

import {
  CausalModel,
  CausalNode,
  CausalEdge,
  Intervention,
  ExpectedEffect,
  Observation
} from '../ontology/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CausalPrediction {
  id: string;
  modelVersion: string;
  intervention: Intervention;
  predictedEffects: PredictedEffect[];
  confidence: number;
  timestamp: Date;
  status: 'pending' | 'verified' | 'failed' | 'partial';
}

export interface PredictedEffect {
  target: string;
  direction: 'increase' | 'decrease' | 'stabilize';
  magnitude: number;           // Expected change (0-1 scale)
  confidence: number;
  timeframeMs: number;         // Expected time to effect
}

export interface ObservedOutcome {
  id: string;
  predictionId: string;
  target: string;
  predictedValue: number;
  actualValue: number;
  deviation: number;           // |predicted - actual| / predicted
  observedAt: Date;
  context: Record<string, any>;
}

export interface VerificationResult {
  predictionId: string;
  overallMatch: number;        // 0-1: How well prediction matched reality
  effectResults: EffectResult[];
  causalPathValid: boolean;
  anomalies: CausalAnomaly[];
  modelAdjustments: ModelAdjustment[];
  confidence: number;          // Updated confidence after verification
}

export interface EffectResult {
  target: string;
  predicted: PredictedEffect;
  observed: ObservedOutcome;
  match: number;               // 0-1: How well this effect matched
  withinTolerance: boolean;
}

export interface CausalAnomaly {
  type: 'unexpected_effect' | 'missing_effect' | 'reversed_effect' | 'magnitude_mismatch' | 'timing_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPath: string[];
  suggestedAction: string;
}

export interface ModelAdjustment {
  type: 'edge_weight' | 'node_confidence' | 'intervention_effectiveness';
  target: string;
  previousValue: number;
  newValue: number;
  reason: string;
  autoApply: boolean;
}

export interface FeedbackEntry {
  id: string;
  predictionId: string;
  verificationResult: VerificationResult;
  humanFeedback?: HumanCausalFeedback;
  learningApplied: boolean;
  timestamp: Date;
}

export interface HumanCausalFeedback {
  correct: boolean;
  corrections?: CausalCorrection[];
  notes?: string;
  approvedBy?: string;
}

export interface CausalCorrection {
  path: string[];
  expectedStrength: number;
  observedStrength: number;
  correctedStrength: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface CausalLoopConfig {
  // Confidence decay
  confidenceDecayRate: number;       // Per-day decay rate (e.g., 0.01 = 1% per day)
  minConfidence: number;             // Minimum confidence floor (e.g., 0.3)
  maxConfidence: number;             // Maximum confidence cap (e.g., 0.99)
  
  // Verification thresholds
  matchTolerance: number;            // Acceptable deviation (e.g., 0.1 = 10%)
  anomalyThreshold: number;          // Deviation triggering anomaly (e.g., 0.3)
  
  // Learning
  feedbackLockedBeforeLearning: boolean;  // Require human approval before learning
  minObservationsForLearning: number;     // Min observations before adjusting model
  learningRate: number;                   // How fast to adjust weights (0-1)
  
  // Safety
  maxAdjustmentPerCycle: number;     // Max model change per verification (e.g., 0.1)
  rollbackOnCriticalAnomaly: boolean;
  sandboxExperimental: boolean;
}

export const DEFAULT_CAUSAL_LOOP_CONFIG: CausalLoopConfig = {
  confidenceDecayRate: 0.01,
  minConfidence: 0.3,
  maxConfidence: 0.99,
  matchTolerance: 0.1,
  anomalyThreshold: 0.3,
  feedbackLockedBeforeLearning: true,
  minObservationsForLearning: 10,
  learningRate: 0.1,
  maxAdjustmentPerCycle: 0.1,
  rollbackOnCriticalAnomaly: true,
  sandboxExperimental: true
};

// ============================================================================
// CAUSAL VERIFICATION ENGINE
// ============================================================================

export class CausalVerificationLoop {
  private config: CausalLoopConfig;
  private model: CausalModel;
  private predictions: Map<string, CausalPrediction> = new Map();
  private observations: Map<string, Observation[]> = new Map();
  private feedbackLog: FeedbackEntry[] = [];
  private pendingAdjustments: ModelAdjustment[] = [];

  constructor(model: CausalModel, config: Partial<CausalLoopConfig> = {}) {
    this.model = model;
    this.config = { ...DEFAULT_CAUSAL_LOOP_CONFIG, ...config };
  }

  // ==========================================================================
  // PREDICTION
  // ==========================================================================

  /**
   * Create a prediction for an intervention
   */
  predict(intervention: Intervention): CausalPrediction {
    const predictedEffects = this.calculateExpectedEffects(intervention);
    const confidence = this.calculatePredictionConfidence(intervention, predictedEffects);

    const prediction: CausalPrediction = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      modelVersion: this.model.name,
      intervention,
      predictedEffects,
      confidence,
      timestamp: new Date(),
      status: 'pending'
    };

    this.predictions.set(prediction.id, prediction);
    return prediction;
  }

  /**
   * Calculate expected effects of an intervention
   */
  private calculateExpectedEffects(intervention: Intervention): PredictedEffect[] {
    const effects: PredictedEffect[] = [];

    // Direct effects from intervention definition
    for (const expected of intervention.expectedEffects) {
      effects.push({
        target: expected.target,
        direction: expected.direction,
        magnitude: expected.magnitude,
        confidence: this.applyConfidenceDecay(expected.confidence),
        timeframeMs: this.parseTimeframe(expected.timeframe)
      });
    }

    // Propagate through causal graph
    const propagated = this.propagateEffects(intervention.target, effects);
    effects.push(...propagated);

    return effects;
  }

  /**
   * Propagate effects through causal graph
   */
  private propagateEffects(source: string, directEffects: PredictedEffect[]): PredictedEffect[] {
    const propagated: PredictedEffect[] = [];
    const visited = new Set<string>([source]);

    // Find downstream nodes
    for (const edge of this.model.edges) {
      if (edge.from === source && !visited.has(edge.to)) {
        visited.add(edge.to);

        // Calculate propagated effect
        const sourceEffect = directEffects.find(e => e.target === source);
        if (sourceEffect) {
          const propagatedMagnitude = sourceEffect.magnitude * Math.abs(edge.strength);
          const direction = edge.strength > 0 ? sourceEffect.direction : this.reverseDirection(sourceEffect.direction);

          propagated.push({
            target: edge.to,
            direction,
            magnitude: propagatedMagnitude,
            confidence: this.applyConfidenceDecay(sourceEffect.confidence * edge.confidence),
            timeframeMs: sourceEffect.timeframeMs * 1.5 // Downstream effects take longer
          });
        }
      }
    }

    return propagated;
  }

  // ==========================================================================
  // OBSERVATION
  // ==========================================================================

  /**
   * Record an observation for verification
   */
  observe(predictionId: string, target: string, actualValue: number, context: Record<string, any> = {}): ObservedOutcome {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) {
      throw new Error(`Prediction not found: ${predictionId}`);
    }

    const predictedEffect = prediction.predictedEffects.find(e => e.target === target);
    const predictedValue = predictedEffect?.magnitude || 0;
    const deviation = predictedValue !== 0 ? Math.abs(actualValue - predictedValue) / Math.abs(predictedValue) : actualValue;

    const outcome: ObservedOutcome = {
      id: `obs_${Date.now()}`,
      predictionId,
      target,
      predictedValue,
      actualValue,
      deviation,
      observedAt: new Date(),
      context
    };

    // Store observation
    const key = `${predictionId}:${target}`;
    const existing = this.observations.get(key) || [];
    existing.push({
      timestamp: new Date(),
      node: target,
      value: actualValue,
      context
    });
    this.observations.set(key, existing);

    return outcome;
  }

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================

  /**
   * Verify a prediction against observed outcomes
   */
  verify(predictionId: string): VerificationResult {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) {
      throw new Error(`Prediction not found: ${predictionId}`);
    }

    const effectResults: EffectResult[] = [];
    const anomalies: CausalAnomaly[] = [];
    const modelAdjustments: ModelAdjustment[] = [];

    // Verify each predicted effect
    for (const predictedEffect of prediction.predictedEffects) {
      const key = `${predictionId}:${predictedEffect.target}`;
      const observations = this.observations.get(key) || [];

      if (observations.length === 0) {
        anomalies.push({
          type: 'missing_effect',
          severity: 'medium',
          description: `No observations for predicted effect on ${predictedEffect.target}`,
          affectedPath: [prediction.intervention.target, predictedEffect.target],
          suggestedAction: 'Wait for more observations or check data collection'
        });
        continue;
      }

      // Get latest observation
      const latestObs = observations[observations.length - 1];
      const observedOutcome: ObservedOutcome = {
        id: `obs_${Date.now()}`,
        predictionId,
        target: predictedEffect.target,
        predictedValue: predictedEffect.magnitude,
        actualValue: latestObs.value as number,
        deviation: this.calculateDeviation(predictedEffect.magnitude, latestObs.value as number),
        observedAt: latestObs.timestamp,
        context: latestObs.context || {}
      };

      const match = this.calculateEffectMatch(predictedEffect, observedOutcome);
      const withinTolerance = observedOutcome.deviation <= this.config.matchTolerance;

      effectResults.push({
        target: predictedEffect.target,
        predicted: predictedEffect,
        observed: observedOutcome,
        match,
        withinTolerance
      });

      // Check for anomalies
      if (observedOutcome.deviation > this.config.anomalyThreshold) {
        const anomaly = this.detectAnomaly(predictedEffect, observedOutcome);
        if (anomaly) {
          anomalies.push(anomaly);
        }
      }

      // Suggest model adjustments
      if (!withinTolerance) {
        const adjustment = this.suggestAdjustment(predictedEffect, observedOutcome);
        if (adjustment) {
          modelAdjustments.push(adjustment);
        }
      }
    }

    // Calculate overall match
    const overallMatch = effectResults.length > 0
      ? effectResults.reduce((sum, r) => sum + r.match, 0) / effectResults.length
      : 0;

    // Validate causal path
    const causalPathValid = this.validateCausalPath(prediction, effectResults);

    // Update prediction status
    prediction.status = this.determineStatus(overallMatch, anomalies);
    
    // Update confidence with decay and feedback
    const updatedConfidence = this.updateConfidence(prediction.confidence, overallMatch);

    const result: VerificationResult = {
      predictionId,
      overallMatch,
      effectResults,
      causalPathValid,
      anomalies,
      modelAdjustments,
      confidence: updatedConfidence
    };

    // Store pending adjustments
    this.pendingAdjustments.push(...modelAdjustments.filter(a => !a.autoApply));

    // Log feedback entry
    this.feedbackLog.push({
      id: `fb_${Date.now()}`,
      predictionId,
      verificationResult: result,
      learningApplied: false,
      timestamp: new Date()
    });

    return result;
  }

  // ==========================================================================
  // CONFIDENCE DECAY
  // ==========================================================================

  /**
   * Apply confidence decay based on observation age
   */
  private applyConfidenceDecay(baseConfidence: number, observationDate?: Date): number {
    if (!observationDate) {
      return Math.max(this.config.minConfidence, baseConfidence);
    }

    const ageInDays = (Date.now() - observationDate.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.exp(-this.config.confidenceDecayRate * ageInDays);
    const decayedConfidence = baseConfidence * decayFactor;

    return Math.max(this.config.minConfidence, Math.min(this.config.maxConfidence, decayedConfidence));
  }

  /**
   * Update confidence based on verification result
   */
  private updateConfidence(currentConfidence: number, matchScore: number): number {
    // Adjust confidence based on how well prediction matched
    const adjustment = (matchScore - 0.5) * 2 * this.config.learningRate;
    const newConfidence = currentConfidence + (currentConfidence * adjustment);

    return Math.max(this.config.minConfidence, Math.min(this.config.maxConfidence, newConfidence));
  }

  // ==========================================================================
  // LEARNING & ADAPTATION
  // ==========================================================================

  /**
   * Apply learned adjustments to the model
   */
  applyLearning(approvedBy?: string): { applied: ModelAdjustment[]; skipped: ModelAdjustment[] } {
    if (this.config.feedbackLockedBeforeLearning && !approvedBy) {
      return { applied: [], skipped: this.pendingAdjustments };
    }

    // Check minimum observations
    const totalObservations = Array.from(this.observations.values())
      .reduce((sum, obs) => sum + obs.length, 0);
    
    if (totalObservations < this.config.minObservationsForLearning) {
      return { applied: [], skipped: this.pendingAdjustments };
    }

    const applied: ModelAdjustment[] = [];
    const skipped: ModelAdjustment[] = [];

    for (const adjustment of this.pendingAdjustments) {
      // Enforce max adjustment per cycle
      const actualChange = Math.min(
        Math.abs(adjustment.newValue - adjustment.previousValue),
        this.config.maxAdjustmentPerCycle
      );
      
      const constrainedNewValue = adjustment.previousValue + 
        (adjustment.newValue > adjustment.previousValue ? actualChange : -actualChange);

      if (this.applyModelAdjustment({ ...adjustment, newValue: constrainedNewValue })) {
        applied.push({ ...adjustment, newValue: constrainedNewValue });
      } else {
        skipped.push(adjustment);
      }
    }

    // Clear applied adjustments
    this.pendingAdjustments = this.pendingAdjustments.filter(
      a => !applied.some(ap => ap.target === a.target && ap.type === a.type)
    );

    // Mark feedback as learned
    for (const entry of this.feedbackLog.filter(f => !f.learningApplied)) {
      entry.learningApplied = true;
      entry.humanFeedback = { correct: true, approvedBy };
    }

    return { applied, skipped };
  }

  /**
   * Apply a single model adjustment
   */
  private applyModelAdjustment(adjustment: ModelAdjustment): boolean {
    switch (adjustment.type) {
      case 'edge_weight': {
        const edge = this.model.edges.find(e => 
          `${e.from}->${e.to}` === adjustment.target
        );
        if (edge) {
          edge.strength = adjustment.newValue;
          return true;
        }
        return false;
      }
      case 'node_confidence': {
        const node = this.model.nodes.find(n => n.id === adjustment.target);
        // Nodes don't have confidence in current model, but could be extended
        return false;
      }
      case 'intervention_effectiveness': {
        const intervention = this.model.interventions.find(i => i.id === adjustment.target);
        if (intervention) {
          for (const effect of intervention.expectedEffects) {
            effect.confidence = adjustment.newValue;
          }
          return true;
        }
        return false;
      }
      default:
        return false;
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private calculatePredictionConfidence(intervention: Intervention, effects: PredictedEffect[]): number {
    // Base confidence from intervention
    let confidence = intervention.expectedEffects.reduce((sum, e) => sum + e.confidence, 0) 
      / intervention.expectedEffects.length;

    // Reduce for long causal chains
    const maxPathLength = effects.length;
    confidence *= Math.pow(0.95, maxPathLength - 1);

    return this.applyConfidenceDecay(confidence);
  }

  private calculateDeviation(predicted: number, actual: number): number {
    if (predicted === 0) return Math.abs(actual);
    return Math.abs(actual - predicted) / Math.abs(predicted);
  }

  private calculateEffectMatch(predicted: PredictedEffect, observed: ObservedOutcome): number {
    // Check direction
    const directionMatch = this.checkDirectionMatch(predicted, observed);
    if (!directionMatch) return 0.2; // Major mismatch

    // Check magnitude
    const magnitudeMatch = 1 - Math.min(observed.deviation, 1);

    return (directionMatch ? 0.4 : 0) + (magnitudeMatch * 0.6);
  }

  private checkDirectionMatch(predicted: PredictedEffect, observed: ObservedOutcome): boolean {
    const diff = observed.actualValue - observed.predictedValue;
    
    switch (predicted.direction) {
      case 'increase': return diff >= 0;
      case 'decrease': return diff <= 0;
      case 'stabilize': return Math.abs(diff) < this.config.matchTolerance;
      default: return true;
    }
  }

  private detectAnomaly(predicted: PredictedEffect, observed: ObservedOutcome): CausalAnomaly | null {
    const diff = observed.actualValue - observed.predictedValue;
    
    // Reversed effect
    if ((predicted.direction === 'increase' && diff < -this.config.anomalyThreshold) ||
        (predicted.direction === 'decrease' && diff > this.config.anomalyThreshold)) {
      return {
        type: 'reversed_effect',
        severity: 'high',
        description: `Effect on ${predicted.target} went in opposite direction`,
        affectedPath: [predicted.target],
        suggestedAction: 'Review causal edge direction and confounders'
      };
    }

    // Magnitude mismatch
    if (observed.deviation > this.config.anomalyThreshold) {
      return {
        type: 'magnitude_mismatch',
        severity: observed.deviation > 0.5 ? 'high' : 'medium',
        description: `Effect magnitude on ${predicted.target} deviated by ${(observed.deviation * 100).toFixed(1)}%`,
        affectedPath: [predicted.target],
        suggestedAction: 'Adjust edge weights in causal model'
      };
    }

    return null;
  }

  private suggestAdjustment(predicted: PredictedEffect, observed: ObservedOutcome): ModelAdjustment | null {
    const deviation = observed.deviation;
    
    if (deviation <= this.config.matchTolerance) return null;

    // Calculate suggested weight adjustment
    const currentWeight = predicted.magnitude;
    const observedRatio = observed.actualValue / (observed.predictedValue || 1);
    const suggestedWeight = currentWeight * observedRatio;

    return {
      type: 'edge_weight',
      target: predicted.target,
      previousValue: currentWeight,
      newValue: suggestedWeight,
      reason: `Predicted ${predicted.magnitude}, observed ${observed.actualValue}`,
      autoApply: false
    };
  }

  private validateCausalPath(prediction: CausalPrediction, results: EffectResult[]): boolean {
    // Check if causal chain holds
    const sortedByMatch = [...results].sort((a, b) => b.match - a.match);
    
    // If direct effect matches but downstream doesn't, path might be invalid
    const directEffect = results.find(r => r.target === prediction.intervention.target);
    const downstreamEffects = results.filter(r => r.target !== prediction.intervention.target);

    if (directEffect?.match && directEffect.match > 0.7) {
      const avgDownstream = downstreamEffects.reduce((s, e) => s + e.match, 0) / (downstreamEffects.length || 1);
      return avgDownstream >= 0.5;
    }

    return results.every(r => r.match > 0.3);
  }

  private determineStatus(overallMatch: number, anomalies: CausalAnomaly[]): CausalPrediction['status'] {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    
    if (criticalAnomalies.length > 0) return 'failed';
    if (overallMatch >= 0.8) return 'verified';
    if (overallMatch >= 0.5) return 'partial';
    return 'failed';
  }

  private reverseDirection(direction: 'increase' | 'decrease' | 'stabilize'): 'increase' | 'decrease' | 'stabilize' {
    switch (direction) {
      case 'increase': return 'decrease';
      case 'decrease': return 'increase';
      default: return direction;
    }
  }

  private parseTimeframe(timeframe?: string): number {
    if (!timeframe) return 24 * 60 * 60 * 1000; // Default 24h
    
    const match = timeframe.match(/^(\d+)([hdwm])$/);
    if (!match) return 24 * 60 * 60 * 1000;

    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  getPrediction(id: string): CausalPrediction | undefined {
    return this.predictions.get(id);
  }

  getAllPredictions(): CausalPrediction[] {
    return Array.from(this.predictions.values());
  }

  getFeedbackLog(): FeedbackEntry[] {
    return [...this.feedbackLog];
  }

  getPendingAdjustments(): ModelAdjustment[] {
    return [...this.pendingAdjustments];
  }

  getModel(): CausalModel {
    return this.model;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createCausalVerificationLoop(
  model: CausalModel,
  config?: Partial<CausalLoopConfig>
): CausalVerificationLoop {
  return new CausalVerificationLoop(model, config);
}
