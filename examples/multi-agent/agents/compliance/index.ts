/**
 * Compliance Agent
 * Handles regulatory compliance checks (GDPR, AML, KYC)
 */

import { BaseAgent, AgentMessage, Request, Response } from '../../src/server';

interface ComplianceCheck {
  regulation: string;
  status: 'compliant' | 'non_compliant' | 'review_required' | 'unknown';
  issues: string[];
  lastChecked: string;
}

class ComplianceAgent extends BaseAgent {
  private regulations: string[] = (process.env.REGULATIONS || 'GDPR,AML,KYC').split(',');

  protected getCapabilities(): string[] {
    return ['compliance_check', 'kyc_verification', 'aml_screening', 'gdpr_audit', 'regulatory_reporting'];
  }

  protected setupAgentRoutes(): void {
    // Run compliance check
    this.app.post('/api/v1/check', async (req: Request, res: Response) => {
      const { entityType, entityId, data, regulations } = req.body;
      const result = await this.runComplianceCheck(entityType, entityId, data, regulations);
      res.json({ result });
    });

    // Get compliance status
    this.app.get('/api/v1/status/:entityId', async (req: Request, res: Response) => {
      const status = await this.getComplianceStatus(req.params.entityId);
      res.json({ status });
    });

    // List regulations
    this.app.get('/api/v1/regulations', (req: Request, res: Response) => {
      res.json({ regulations: this.regulations });
    });
  }

  protected async handleTask(msg: AgentMessage): Promise<any> {
    const { entityType, entityId, data } = msg.payload;
    
    // Run full compliance check
    const result = await this.runComplianceCheck(entityType, entityId, data, this.regulations);
    
    return {
      agentName: this.agentName,
      taskType: 'compliance_check',
      result,
      recommendation: result.overallStatus === 'compliant' ? 'approve' : 'review_required',
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    };
  }

  private async runComplianceCheck(
    entityType: string, 
    entityId: string, 
    data: any, 
    regulations: string[]
  ): Promise<any> {
    const checks: ComplianceCheck[] = [];
    const regsToCheck = regulations || this.regulations;

    for (const regulation of regsToCheck) {
      const check = await this.checkRegulation(regulation, entityType, entityId, data);
      checks.push(check);
    }

    // Calculate overall status
    const hasNonCompliant = checks.some(c => c.status === 'non_compliant');
    const hasReviewRequired = checks.some(c => c.status === 'review_required');
    const allCompliant = checks.every(c => c.status === 'compliant');

    let overallStatus: string;
    if (hasNonCompliant) {
      overallStatus = 'non_compliant';
    } else if (hasReviewRequired) {
      overallStatus = 'review_required';
    } else if (allCompliant) {
      overallStatus = 'compliant';
    } else {
      overallStatus = 'unknown';
    }

    // Calculate confidence
    const knownChecks = checks.filter(c => c.status !== 'unknown').length;
    const confidence = knownChecks / checks.length;

    // Collect all issues
    const allIssues = checks.flatMap(c => c.issues);

    return {
      entityType,
      entityId,
      overallStatus,
      checks,
      issues: allIssues,
      confidence: Math.round(confidence * 100) / 100,
      checkedAt: new Date().toISOString(),
      nextReviewDate: this.calculateNextReview(overallStatus)
    };
  }

  private async checkRegulation(
    regulation: string, 
    entityType: string, 
    entityId: string, 
    data: any
  ): Promise<ComplianceCheck> {
    const issues: string[] = [];
    let status: ComplianceCheck['status'] = 'compliant';

    switch (regulation.toUpperCase()) {
      case 'GDPR':
        // Check GDPR compliance
        if (!data?.gdpr?.consentGiven) {
          issues.push('Missing data processing consent');
          status = 'non_compliant';
        }
        if (!data?.gdpr?.dataRetentionPolicy) {
          issues.push('No data retention policy defined');
          status = status === 'compliant' ? 'review_required' : status;
        }
        if (!data?.gdpr?.privacyNoticeAccepted) {
          issues.push('Privacy notice not accepted');
          status = 'non_compliant';
        }
        break;

      case 'AML':
        // Check AML compliance
        if (!data?.aml?.pepScreening) {
          issues.push('PEP screening not performed');
          status = 'non_compliant';
        }
        if (!data?.aml?.sanctionsCheck) {
          issues.push('Sanctions list check not performed');
          status = 'non_compliant';
        }
        if (data?.aml?.riskRating === 'high' && !data?.aml?.enhancedDueDiligence) {
          issues.push('Enhanced due diligence required for high-risk entity');
          status = 'review_required';
        }
        break;

      case 'KYC':
        // Check KYC compliance
        if (!data?.kyc?.identityVerified) {
          issues.push('Identity not verified');
          status = 'non_compliant';
        }
        if (!data?.kyc?.documentVerified) {
          issues.push('Documents not verified');
          status = 'non_compliant';
        }
        if (!data?.kyc?.addressVerified) {
          issues.push('Address not verified');
          status = status === 'compliant' ? 'review_required' : status;
        }
        if (data?.kyc?.lastVerification) {
          const lastCheck = new Date(data.kyc.lastVerification);
          const daysSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCheck > 365) {
            issues.push('KYC verification expired (>365 days)');
            status = 'review_required';
          }
        }
        break;

      default:
        status = 'unknown';
        issues.push(`Unknown regulation: ${regulation}`);
    }

    return {
      regulation,
      status,
      issues,
      lastChecked: new Date().toISOString()
    };
  }

  private calculateNextReview(status: string): string {
    const now = new Date();
    let daysToAdd: number;

    switch (status) {
      case 'non_compliant':
        daysToAdd = 7; // Review in 1 week
        break;
      case 'review_required':
        daysToAdd = 30; // Review in 1 month
        break;
      case 'compliant':
        daysToAdd = 180; // Review in 6 months
        break;
      default:
        daysToAdd = 14; // Review in 2 weeks
    }

    const nextReview = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return nextReview.toISOString();
  }

  private async getComplianceStatus(entityId: string): Promise<any> {
    const cached = await this.state.get(`compliance:status:${entityId}`);
    return cached || { status: 'unknown', message: 'No compliance check performed' };
  }
}

// Start agent
const agent = new ComplianceAgent();
agent.start();
