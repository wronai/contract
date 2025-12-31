/**
 * Customer Agent
 * Handles customer relationship management and analysis
 */

import { BaseAgent, AgentMessage, Request, Response } from '../../src/server';

interface CustomerProfile {
  entityId: string;
  segment: string;
  lifetime_value: number;
  engagement_score: number;
  satisfaction_score: number;
  churn_risk: number;
  recommendations: string[];
}

class CustomerAgent extends BaseAgent {
  protected getCapabilities(): string[] {
    return ['customer_profiling', 'segmentation', 'churn_prediction', 'ltv_calculation', 'recommendation'];
  }

  protected setupAgentRoutes(): void {
    // Get customer profile
    this.app.get('/api/v1/profile/:entityId', async (req: Request, res: Response) => {
      const profile = await this.getCustomerProfile(req.params.entityId);
      res.json({ profile });
    });

    // Analyze customer
    this.app.post('/api/v1/analyze', async (req: Request, res: Response) => {
      const { entityId, data } = req.body;
      const analysis = await this.analyzeCustomer(entityId, data);
      res.json({ analysis });
    });

    // Get recommendations
    this.app.get('/api/v1/recommendations/:entityId', async (req: Request, res: Response) => {
      const recommendations = await this.getRecommendations(req.params.entityId);
      res.json({ recommendations });
    });
  }

  protected async handleTask(msg: AgentMessage): Promise<any> {
    const { entityType, entityId, data } = msg.payload;
    
    // Perform customer analysis
    const analysis = await this.analyzeCustomer(entityId, data);
    
    return {
      agentName: this.agentName,
      taskType: 'customer_analysis',
      analysis,
      recommendation: this.getStrategicRecommendation(analysis),
      confidence: analysis.confidence,
      timestamp: new Date().toISOString()
    };
  }

  private async analyzeCustomer(entityId: string, data: any): Promise<any> {
    // Calculate customer metrics
    const lifetimeValue = this.calculateLTV(data);
    const engagementScore = this.calculateEngagement(data);
    const satisfactionScore = this.calculateSatisfaction(data);
    const churnRisk = this.predictChurnRisk(data);
    const segment = this.determineSegment(lifetimeValue, engagementScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      segment,
      lifetimeValue,
      engagementScore,
      satisfactionScore,
      churnRisk
    });

    // Calculate confidence based on data availability
    const dataPoints = [
      data?.transactions?.length > 0,
      data?.interactions?.length > 0,
      data?.feedback?.length > 0,
      data?.profile !== undefined
    ];
    const confidence = dataPoints.filter(Boolean).length / dataPoints.length;

    return {
      entityId,
      segment,
      metrics: {
        lifetimeValue: Math.round(lifetimeValue),
        engagementScore: Math.round(engagementScore * 100) / 100,
        satisfactionScore: Math.round(satisfactionScore * 100) / 100,
        churnRisk: Math.round(churnRisk * 100) / 100
      },
      recommendations,
      confidence: Math.round(confidence * 100) / 100,
      analyzedAt: new Date().toISOString()
    };
  }

  private calculateLTV(data: any): number {
    if (!data?.transactions) return 0;
    
    const transactions = data.transactions;
    const totalValue = transactions.reduce((sum: number, t: any) => sum + (t.value || 0), 0);
    const avgTransactionValue = totalValue / (transactions.length || 1);
    const transactionsPerYear = (transactions.length / this.getCustomerAgeYears(data)) || 1;
    const expectedLifespan = 5; // years
    
    return avgTransactionValue * transactionsPerYear * expectedLifespan;
  }

  private getCustomerAgeYears(data: any): number {
    if (!data?.profile?.createdAt) return 1;
    const created = new Date(data.profile.createdAt);
    const now = new Date();
    const years = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return Math.max(years, 0.1);
  }

  private calculateEngagement(data: any): number {
    if (!data?.interactions) return 0.5;
    
    const interactions = data.interactions;
    const recentInteractions = interactions.filter((i: any) => {
      const date = new Date(i.date);
      const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 90;
    });
    
    // Score based on interaction frequency and recency
    const frequencyScore = Math.min(recentInteractions.length / 10, 1);
    const recencyScore = recentInteractions.length > 0 ? 1 : 0.3;
    
    return (frequencyScore * 0.6 + recencyScore * 0.4);
  }

  private calculateSatisfaction(data: any): number {
    if (!data?.feedback) return 0.7; // Default neutral
    
    const feedback = data.feedback;
    const avgRating = feedback.reduce((sum: number, f: any) => sum + (f.rating || 5), 0) / (feedback.length || 1);
    
    return avgRating / 10; // Normalize to 0-1
  }

  private predictChurnRisk(data: any): number {
    let risk = 0.3; // Base risk
    
    // Increase risk if no recent activity
    if (data?.lastActivity) {
      const daysSinceActivity = (Date.now() - new Date(data.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 90) risk += 0.3;
      else if (daysSinceActivity > 30) risk += 0.1;
    } else {
      risk += 0.2;
    }
    
    // Increase risk if satisfaction is low
    const satisfaction = this.calculateSatisfaction(data);
    if (satisfaction < 0.5) risk += 0.2;
    
    // Increase risk if engagement is low
    const engagement = this.calculateEngagement(data);
    if (engagement < 0.3) risk += 0.15;
    
    // Decrease risk for high LTV customers (more invested)
    const ltv = this.calculateLTV(data);
    if (ltv > 100000) risk -= 0.1;
    
    return Math.max(0, Math.min(1, risk));
  }

  private determineSegment(ltv: number, engagement: number): string {
    if (ltv > 100000 && engagement > 0.7) return 'champion';
    if (ltv > 100000 && engagement <= 0.7) return 'at_risk_high_value';
    if (ltv > 50000 && engagement > 0.5) return 'loyal';
    if (ltv > 50000 && engagement <= 0.5) return 'needs_attention';
    if (ltv > 10000) return 'promising';
    if (engagement > 0.5) return 'engaged_low_value';
    return 'dormant';
  }

  private generateRecommendations(profile: any): string[] {
    const recommendations: string[] = [];
    
    switch (profile.segment) {
      case 'champion':
        recommendations.push('Offer VIP benefits', 'Request referrals', 'Early access to new products');
        break;
      case 'at_risk_high_value':
        recommendations.push('Personal outreach', 'Retention offer', 'Feedback survey');
        break;
      case 'loyal':
        recommendations.push('Loyalty rewards', 'Cross-sell opportunities', 'Engagement program');
        break;
      case 'needs_attention':
        recommendations.push('Re-engagement campaign', 'Special discount', 'Customer success call');
        break;
      case 'promising':
        recommendations.push('Nurture campaign', 'Product education', 'Upsell opportunity');
        break;
      case 'engaged_low_value':
        recommendations.push('Value proposition review', 'Product fit assessment', 'Upgrade path');
        break;
      case 'dormant':
        recommendations.push('Win-back campaign', 'Feedback request', 'Exit survey');
        break;
    }
    
    // Add churn prevention if risk is high
    if (profile.churnRisk > 0.6) {
      recommendations.unshift('URGENT: Churn prevention intervention');
    }
    
    return recommendations;
  }

  private getStrategicRecommendation(analysis: any): string {
    const { segment, metrics } = analysis;
    
    if (metrics.churnRisk > 0.7) {
      return 'immediate_intervention';
    }
    if (segment === 'champion' || segment === 'loyal') {
      return 'maintain_relationship';
    }
    if (segment === 'at_risk_high_value' || segment === 'needs_attention') {
      return 'prioritize_engagement';
    }
    if (metrics.lifetimeValue > 50000) {
      return 'growth_opportunity';
    }
    return 'standard_service';
  }

  private async getCustomerProfile(entityId: string): Promise<CustomerProfile | null> {
    const cached = await this.state.get(`customer:profile:${entityId}`);
    return cached || null;
  }

  private async getRecommendations(entityId: string): Promise<string[]> {
    const profile = await this.getCustomerProfile(entityId);
    if (!profile) return ['Perform customer analysis first'];
    return profile.recommendations;
  }
}

// Start agent
const agent = new CustomerAgent();
agent.start();
