/**
 * Reclapp Verification Engine
 * 
 * Self-verification loop for comparing intent with results,
 * detecting anomalies, and generating recommendations.
 */

import { ExecutionPlan, ExecutionResult, NodeResult } from '../planner';
import { StoredEvent } from '../eventstore';

// ============================================================================
// TYPES
// ============================================================================

export interface Intent {
  id: string;
  description: string;
  type: IntentType;
  targets: string[];
  expectedOutcomes: ExpectedOutcome[];
  constraints: IntentConstraint[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export type IntentType = 
  | 'query'           // Information retrieval
  | 'create'          // Create new entity
  | 'update'          // Modify existing
  | 'delete'          // Remove entity
  | 'alert'           // Trigger notification
  | 'analyze'         // Run analysis
  | 'generate'        // Generate output
  | 'automate';       // Automated workflow

export interface ExpectedOutcome {
  type: string;
  target: string;
  condition: string;
  importance: number;   // 0-1
}

export interface IntentConstraint {
  type: 'must' | 'should' | 'must_not';
  condition: string;
}

export interface VerificationResult {
  executionId: string;
  timestamp: Date;
  
  // Core metrics
  intentMatch: number;           // 0-1: Does result match intent?
  stateConsistency: number;      // 0-1: Is state consistent?
  causalValidity: number;        // 0-1: Are causal relationships valid?
  
  // Detailed analysis
  outcomeResults: OutcomeResult[];
  constraintResults: ConstraintResult[];
  anomalies: Anomaly[];
  
  // Risk assessment
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  
  // Recommendations
  recommendations: Recommendation[];
  
  // Decision
  decision: VerificationDecision;
  reasoning: string;
}

export interface OutcomeResult {
  outcome: ExpectedOutcome;
  achieved: boolean;
  actualValue?: any;
  deviation?: number;
  explanation?: string;
}

export interface ConstraintResult {
  constraint: IntentConstraint;
  satisfied: boolean;
  violation?: string;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedNodes: string[];
  detectedAt: Date;
  evidence: string[];
}

export type AnomalyType =
  | 'unexpected_value'      // Value outside expected range
  | 'missing_data'          // Expected data not present
  | 'inconsistent_state'    // State contradictions
  | 'causal_violation'      // Breaks causal model
  | 'timing_anomaly'        // Unexpected timing
  | 'pattern_deviation';    // Deviates from learned patterns

export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
  factor: string;
  contribution: number;     // 0-1
  mitigationPossible: boolean;
  suggestedMitigation?: string;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: number;         // 1-10
  description: string;
  action: string;
  expectedImprovement: number;
  confidence: number;
}

export type RecommendationType =
  | 'adjust_threshold'      // Change alert/trigger thresholds
  | 'add_validation'        // Add more validation
  | 'retry_execution'       // Retry with adjustments
  | 'manual_review'         // Escalate to human
  | 'update_model'          // Update causal model
  | 'add_monitoring';       // Add more monitoring

export interface VerificationDecision {
  action: 'accept' | 'retry' | 'adjust' | 'escalate' | 'reject';
  confidence: number;
  adjustments?: Adjustment[];
  escalationReason?: string;
}

export interface Adjustment {
  type: 'parameter' | 'threshold' | 'model' | 'constraint';
  target: string;
  currentValue: any;
  suggestedValue: any;
  reason: string;
}

// ============================================================================
// EXECUTION FEEDBACK
// ============================================================================

export interface ExecutionFeedback {
  executionId: string;
  intent: Intent;
  plan: ExecutionPlan;
  result: ExecutionResult;
  verification: VerificationResult;
  humanFeedback?: HumanFeedback;
  timestamp: Date;
}

export interface HumanFeedback {
  correct: boolean;
  rating?: number;          // 1-5
  comments?: string;
  corrections?: Correction[];
}

export interface Correction {
  field: string;
  expectedValue: any;
  actualValue: any;
  importance: 'minor' | 'major' | 'critical';
}

// ============================================================================
// VERIFICATION ENGINE
// ============================================================================

export class VerificationEngine {
  private anomalyDetectors: AnomalyDetector[] = [];
  private patternStore: PatternStore;
  
  constructor() {
    this.patternStore = new InMemoryPatternStore();
    this.initializeDetectors();
  }
  
  private initializeDetectors(): void {
    this.anomalyDetectors = [
      new ValueRangeDetector(),
      new MissingDataDetector(),
      new StateConsistencyDetector(),
      new TimingAnomalyDetector()
    ];
  }
  
  /**
   * Main verification method
   */
  async verify(
    intent: Intent,
    plan: ExecutionPlan,
    result: ExecutionResult
  ): Promise<VerificationResult> {
    const executionId = this.generateId();
    const timestamp = new Date();
    
    // 1. Compare intent to result
    const intentMatch = await this.calculateIntentMatch(intent, result);
    
    // 2. Check outcome achievements
    const outcomeResults = await this.checkOutcomes(intent.expectedOutcomes, result);
    
    // 3. Verify constraints
    const constraintResults = this.checkConstraints(intent.constraints, result);
    
    // 4. Check state consistency
    const stateConsistency = await this.checkStateConsistency(result);
    
    // 5. Validate causal relationships
    const causalValidity = await this.validateCausality(plan, result);
    
    // 6. Detect anomalies
    const anomalies = await this.detectAnomalies(intent, plan, result);
    
    // 7. Assess risk
    const { riskLevel, riskFactors } = this.assessRisk(
      intentMatch, 
      stateConsistency, 
      anomalies,
      constraintResults
    );
    
    // 8. Generate recommendations
    const recommendations = await this.generateRecommendations(
      intent, 
      result, 
      anomalies,
      outcomeResults
    );
    
    // 9. Make decision
    const decision = this.makeDecision(
      intentMatch,
      stateConsistency,
      causalValidity,
      anomalies,
      constraintResults
    );
    
    return {
      executionId,
      timestamp,
      intentMatch,
      stateConsistency,
      causalValidity,
      outcomeResults,
      constraintResults,
      anomalies,
      riskLevel,
      riskFactors,
      recommendations,
      decision,
      reasoning: this.generateReasoning(decision, anomalies, constraintResults)
    };
  }
  
  /**
   * Calculate how well result matches intent
   */
  private async calculateIntentMatch(
    intent: Intent, 
    result: ExecutionResult
  ): Promise<number> {
    let score = 0;
    let totalWeight = 0;
    
    // Check if execution was successful
    if (result.success) {
      score += 0.3;
    }
    totalWeight += 0.3;
    
    // Check error count
    const errorPenalty = Math.min(result.errors.length * 0.1, 0.3);
    score += (0.3 - errorPenalty);
    totalWeight += 0.3;
    
    // Check node completion rate
    const completedNodes = result.results.filter(r => r.status === 'completed').length;
    const totalNodes = result.results.length;
    if (totalNodes > 0) {
      score += (completedNodes / totalNodes) * 0.4;
    }
    totalWeight += 0.4;
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }
  
  /**
   * Check if expected outcomes were achieved
   */
  private async checkOutcomes(
    outcomes: ExpectedOutcome[],
    result: ExecutionResult
  ): Promise<OutcomeResult[]> {
    return outcomes.map(outcome => {
      // Simplified outcome checking
      const nodeResult = result.results.find(r => 
        r.nodeId.includes(outcome.target)
      );
      
      const achieved = nodeResult?.status === 'completed';
      
      return {
        outcome,
        achieved,
        actualValue: nodeResult?.data,
        deviation: achieved ? 0 : 1,
        explanation: achieved 
          ? `Outcome achieved for ${outcome.target}`
          : `Failed to achieve outcome for ${outcome.target}`
      };
    });
  }
  
  /**
   * Check constraint satisfaction
   */
  private checkConstraints(
    constraints: IntentConstraint[],
    result: ExecutionResult
  ): ConstraintResult[] {
    return constraints.map(constraint => {
      // Simplified constraint checking
      let satisfied = true;
      let violation: string | undefined;
      
      if (constraint.type === 'must_not' && result.errors.length > 0) {
        satisfied = false;
        violation = `Constraint violation: ${constraint.condition}`;
      }
      
      return { constraint, satisfied, violation };
    });
  }
  
  /**
   * Check state consistency
   */
  private async checkStateConsistency(
    result: ExecutionResult
  ): Promise<number> {
    // Check for contradictory states
    let consistencyScore = 1.0;
    
    // Penalize for failed nodes
    const failedNodes = result.results.filter(r => r.status === 'failed');
    consistencyScore -= failedNodes.length * 0.1;
    
    // Penalize for errors
    consistencyScore -= result.errors.length * 0.05;
    
    return Math.max(0, consistencyScore);
  }
  
  /**
   * Validate causal relationships
   */
  private async validateCausality(
    plan: ExecutionPlan,
    result: ExecutionResult
  ): Promise<number> {
    // Check that execution followed causal order
    let validityScore = 1.0;
    
    // For each completed node, check if dependencies were satisfied
    for (const nodeResult of result.results) {
      if (nodeResult.status === 'completed') {
        const node = plan.graph.nodes.get(nodeResult.nodeId);
        if (node) {
          for (const dep of node.dependencies) {
            const depResult = result.results.find(r => r.nodeId === dep);
            if (!depResult || depResult.status !== 'completed') {
              validityScore -= 0.1;
            }
          }
        }
      }
    }
    
    return Math.max(0, validityScore);
  }
  
  /**
   * Detect anomalies in execution
   */
  private async detectAnomalies(
    intent: Intent,
    plan: ExecutionPlan,
    result: ExecutionResult
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    for (const detector of this.anomalyDetectors) {
      const detected = await detector.detect(intent, plan, result);
      anomalies.push(...detected);
    }
    
    return anomalies;
  }
  
  /**
   * Assess overall risk
   */
  private assessRisk(
    intentMatch: number,
    stateConsistency: number,
    anomalies: Anomaly[],
    constraintResults: ConstraintResult[]
  ): { riskLevel: RiskLevel; riskFactors: RiskFactor[] } {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;
    
    // Intent match factor
    if (intentMatch < 0.5) {
      riskFactors.push({
        factor: 'Low intent match',
        contribution: 0.3,
        mitigationPossible: true,
        suggestedMitigation: 'Review and clarify intent'
      });
      riskScore += 0.3;
    }
    
    // State consistency factor
    if (stateConsistency < 0.7) {
      riskFactors.push({
        factor: 'Inconsistent state',
        contribution: 0.25,
        mitigationPossible: true,
        suggestedMitigation: 'Verify data integrity'
      });
      riskScore += 0.25;
    }
    
    // Anomaly factors
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      riskFactors.push({
        factor: 'Critical anomalies detected',
        contribution: 0.4,
        mitigationPossible: false
      });
      riskScore += 0.4;
    }
    
    // Constraint violations
    const violations = constraintResults.filter(c => !c.satisfied);
    if (violations.length > 0) {
      riskFactors.push({
        factor: 'Constraint violations',
        contribution: violations.length * 0.1,
        mitigationPossible: true,
        suggestedMitigation: 'Address constraint violations'
      });
      riskScore += violations.length * 0.1;
    }
    
    // Determine risk level
    let riskLevel: RiskLevel;
    if (riskScore < 0.1) riskLevel = 'minimal';
    else if (riskScore < 0.3) riskLevel = 'low';
    else if (riskScore < 0.5) riskLevel = 'medium';
    else if (riskScore < 0.7) riskLevel = 'high';
    else riskLevel = 'critical';
    
    return { riskLevel, riskFactors };
  }
  
  /**
   * Generate recommendations based on verification
   */
  private async generateRecommendations(
    intent: Intent,
    result: ExecutionResult,
    anomalies: Anomaly[],
    outcomeResults: OutcomeResult[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Recommend based on failed outcomes
    const failedOutcomes = outcomeResults.filter(o => !o.achieved);
    for (const failed of failedOutcomes) {
      recommendations.push({
        id: this.generateId(),
        type: 'retry_execution',
        priority: failed.outcome.importance * 10,
        description: `Retry execution for ${failed.outcome.target}`,
        action: `Re-execute with adjusted parameters`,
        expectedImprovement: 0.3,
        confidence: 0.6
      });
    }
    
    // Recommend based on anomalies
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        recommendations.push({
          id: this.generateId(),
          type: 'manual_review',
          priority: anomaly.severity === 'critical' ? 10 : 8,
          description: `Review anomaly: ${anomaly.description}`,
          action: 'Escalate to human review',
          expectedImprovement: 0.5,
          confidence: 0.8
        });
      }
    }
    
    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }
  
  /**
   * Make verification decision
   */
  private makeDecision(
    intentMatch: number,
    stateConsistency: number,
    causalValidity: number,
    anomalies: Anomaly[],
    constraintResults: ConstraintResult[]
  ): VerificationDecision {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    const mustViolations = constraintResults.filter(
      c => !c.satisfied && c.constraint.type === 'must'
    );
    
    // Critical failures -> reject or escalate
    if (criticalAnomalies.length > 0 || mustViolations.length > 0) {
      return {
        action: 'escalate',
        confidence: 0.9,
        escalationReason: criticalAnomalies.length > 0 
          ? 'Critical anomalies detected'
          : 'Must constraints violated'
      };
    }
    
    // Low match -> retry with adjustments
    if (intentMatch < 0.5) {
      return {
        action: 'retry',
        confidence: 0.7,
        adjustments: [{
          type: 'parameter',
          target: 'execution',
          currentValue: 'current',
          suggestedValue: 'adjusted',
          reason: 'Low intent match requires retry'
        }]
      };
    }
    
    // Moderate issues -> adjust
    if (intentMatch < 0.7 || stateConsistency < 0.7) {
      return {
        action: 'adjust',
        confidence: 0.6,
        adjustments: [{
          type: 'threshold',
          target: 'validation',
          currentValue: 'strict',
          suggestedValue: 'relaxed',
          reason: 'Moderate deviations detected'
        }]
      };
    }
    
    // Good enough -> accept
    return {
      action: 'accept',
      confidence: Math.min(intentMatch, stateConsistency, causalValidity)
    };
  }
  
  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    decision: VerificationDecision,
    anomalies: Anomaly[],
    constraintResults: ConstraintResult[]
  ): string {
    const parts: string[] = [];
    
    parts.push(`Decision: ${decision.action.toUpperCase()}`);
    parts.push(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    
    if (anomalies.length > 0) {
      parts.push(`Anomalies: ${anomalies.length} detected`);
    }
    
    const violations = constraintResults.filter(c => !c.satisfied);
    if (violations.length > 0) {
      parts.push(`Violations: ${violations.length} constraints`);
    }
    
    if (decision.escalationReason) {
      parts.push(`Escalation reason: ${decision.escalationReason}`);
    }
    
    return parts.join('. ');
  }
  
  private generateId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// ANOMALY DETECTORS
// ============================================================================

interface AnomalyDetector {
  detect(intent: Intent, plan: ExecutionPlan, result: ExecutionResult): Promise<Anomaly[]>;
}

class ValueRangeDetector implements AnomalyDetector {
  async detect(intent: Intent, plan: ExecutionPlan, result: ExecutionResult): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Check for unexpected values in results
    for (const nodeResult of result.results) {
      if (nodeResult.data && typeof nodeResult.data === 'object') {
        // Check for extreme values
        for (const [key, value] of Object.entries(nodeResult.data)) {
          if (typeof value === 'number' && (value < -1000000 || value > 1000000000)) {
            anomalies.push({
              id: `anomaly_${Date.now()}`,
              type: 'unexpected_value',
              severity: 'medium',
              description: `Extreme value detected: ${key} = ${value}`,
              affectedNodes: [nodeResult.nodeId],
              detectedAt: new Date(),
              evidence: [`Value ${value} is outside normal range`]
            });
          }
        }
      }
    }
    
    return anomalies;
  }
}

class MissingDataDetector implements AnomalyDetector {
  async detect(intent: Intent, plan: ExecutionPlan, result: ExecutionResult): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Check for nodes that should have data but don't
    for (const nodeResult of result.results) {
      if (nodeResult.status === 'completed' && !nodeResult.data) {
        anomalies.push({
          id: `anomaly_${Date.now()}`,
          type: 'missing_data',
          severity: 'low',
          description: `Node ${nodeResult.nodeId} completed without data`,
          affectedNodes: [nodeResult.nodeId],
          detectedAt: new Date(),
          evidence: ['Completed node has no output data']
        });
      }
    }
    
    return anomalies;
  }
}

class StateConsistencyDetector implements AnomalyDetector {
  async detect(intent: Intent, plan: ExecutionPlan, result: ExecutionResult): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Check for inconsistent completion states
    const completed = new Set(
      result.results.filter(r => r.status === 'completed').map(r => r.nodeId)
    );
    
    for (const nodeResult of result.results) {
      if (nodeResult.status === 'completed') {
        const node = plan.graph.nodes.get(nodeResult.nodeId);
        if (node) {
          for (const dep of node.dependencies) {
            if (!completed.has(dep)) {
              anomalies.push({
                id: `anomaly_${Date.now()}`,
                type: 'inconsistent_state',
                severity: 'high',
                description: `Node ${nodeResult.nodeId} completed before dependency ${dep}`,
                affectedNodes: [nodeResult.nodeId, dep],
                detectedAt: new Date(),
                evidence: ['Dependency ordering violation']
              });
            }
          }
        }
      }
    }
    
    return anomalies;
  }
}

class TimingAnomalyDetector implements AnomalyDetector {
  async detect(intent: Intent, plan: ExecutionPlan, result: ExecutionResult): Promise<Anomaly[]> {
    // Simplified timing check
    return [];
  }
}

// ============================================================================
// PATTERN STORE
// ============================================================================

interface PatternStore {
  store(pattern: ExecutionPattern): void;
  findSimilar(intent: Intent): ExecutionPattern[];
}

interface ExecutionPattern {
  intentType: IntentType;
  successRate: number;
  avgIntentMatch: number;
  commonAnomalies: string[];
}

class InMemoryPatternStore implements PatternStore {
  private patterns: ExecutionPattern[] = [];
  
  store(pattern: ExecutionPattern): void {
    this.patterns.push(pattern);
  }
  
  findSimilar(intent: Intent): ExecutionPattern[] {
    return this.patterns.filter(p => p.intentType === intent.type);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createVerificationEngine(): VerificationEngine {
  return new VerificationEngine();
}
