/**
 * Risk Agent
 * Handles risk assessment and monitoring
 */

import { BaseAgent, AgentMessage, Request, Response } from '../../src/server';

class RiskAgent extends BaseAgent {
  protected getCapabilities(): string[] {
    return ['risk_assessment', 'risk_scoring', 'causal_analysis', 'intervention_suggestion'];
  }

  protected setupAgentRoutes(): void {
    // Assess risk for entity
    this.app.post('/api/v1/assess', async (req: Request, res: Response) => {
      const { entityType, entityId, data } = req.body;
      const assessment = await this.assessRisk(entityType, entityId, data);
      res.json({ assessment });
    });

    // Get risk factors
    this.app.get('/api/v1/factors/:entityId', async (req: Request, res: Response) => {
      const factors = await this.getRiskFactors(req.params.entityId);
      res.json({ factors });
    });
  }

  protected async handleTask(msg: AgentMessage): Promise<any> {
    const { entityType, entityId, data } = msg.payload;
    
    // Perform risk assessment
    const assessment = await this.assessRisk(entityType, entityId, data);
    
    return {
      agentName: this.agentName,
      taskType: 'risk_assessment',
      assessment,
      recommendation: assessment.riskScore > 70 ? 'reduce_exposure' : 'maintain_current',
      confidence: assessment.confidence,
      timestamp: new Date().toISOString()
    };
  }

  private async assessRisk(entityType: string, entityId: string, data: any): Promise<any> {
    // Simulate risk calculation with causal factors
    const baseScore = 50;
    let riskScore = baseScore;
    const factors: any[] = [];

    // Financial health factor
    if (data?.financialHealth) {
      const financialImpact = (100 - (data.financialHealth.profitMargin || 50)) * 0.3;
      riskScore += financialImpact;
      factors.push({
        name: 'financial_health',
        impact: financialImpact,
        weight: 0.3,
        description: 'Based on profit margin analysis'
      });
    }

    // Payment history factor
    if (data?.paymentHistory) {
      const delayImpact = (data.paymentHistory.avgDelayDays || 0) * 0.5;
      riskScore += delayImpact;
      factors.push({
        name: 'payment_delays',
        impact: delayImpact,
        weight: 0.4,
        description: 'Based on payment delay patterns'
      });
    }

    // Legal status factor
    if (data?.legalStatus?.activeCases) {
      const legalImpact = data.legalStatus.activeCases * 10;
      riskScore += legalImpact;
      factors.push({
        name: 'legal_issues',
        impact: legalImpact,
        weight: 0.35,
        description: 'Active legal cases detected'
      });
    }

    // Normalize score
    riskScore = Math.max(0, Math.min(100, riskScore));

    // Calculate confidence based on data completeness
    const dataCompleteness = [
      data?.financialHealth ? 1 : 0,
      data?.paymentHistory ? 1 : 0,
      data?.legalStatus ? 1 : 0
    ].reduce((a, b) => a + b, 0) / 3;

    const confidence = 0.5 + (dataCompleteness * 0.4);

    return {
      entityType,
      entityId,
      riskScore: Math.round(riskScore),
      riskLevel: this.getRiskLevel(riskScore),
      factors,
      confidence: Math.round(confidence * 100) / 100,
      assessedAt: new Date().toISOString(),
      suggestedInterventions: this.suggestInterventions(riskScore)
    };
  }

  private getRiskLevel(score: number): string {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private suggestInterventions(riskScore: number): string[] {
    const interventions: string[] = [];
    
    if (riskScore >= 85) {
      interventions.push('suspend_account', 'require_bank_guarantee', 'intensive_monitoring');
    } else if (riskScore >= 70) {
      interventions.push('reduce_credit_limit', 'shorten_payment_terms', 'enhanced_monitoring');
    } else if (riskScore >= 50) {
      interventions.push('standard_monitoring', 'review_terms');
    }
    
    return interventions;
  }

  private async getRiskFactors(entityId: string): Promise<any[]> {
    // Return cached or computed risk factors
    const cached = await this.state.get(`risk:factors:${entityId}`);
    return cached || [];
  }
}

// Start agent
const agent = new RiskAgent();
agent.start();
