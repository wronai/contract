/**
 * SaaS Starter API Server
 * Multi-tenant SaaS application with subscriptions, billing, and user management
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// In-memory data stores
const organizations: Map<string, any> = new Map();
const users: Map<string, any> = new Map();
const subscriptions: Map<string, any> = new Map();
const invoices: Map<string, any> = new Map();
const usage: Map<string, any> = new Map();
const auditLogs: any[] = [];

// Initialize sample data
function initSampleData() {
  // Sample organizations
  const org1 = {
    id: randomUUID(),
    name: 'TechStartup Inc.',
    slug: 'techstartup',
    plan: 'pro',
    status: 'active',
    ownerId: 'user-001',
    createdAt: new Date().toISOString()
  };
  organizations.set(org1.id, org1);

  const org2 = {
    id: randomUUID(),
    name: 'Enterprise Corp',
    slug: 'enterprise-corp',
    plan: 'enterprise',
    status: 'active',
    ownerId: 'user-002',
    createdAt: new Date().toISOString()
  };
  organizations.set(org2.id, org2);

  // Sample users
  const user1 = {
    id: 'user-001',
    email: 'admin@techstartup.com',
    name: 'Jan Kowalski',
    role: 'admin',
    organizationId: org1.id,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  users.set(user1.id, user1);

  const user2 = {
    id: 'user-002',
    email: 'ceo@enterprise.com',
    name: 'Anna Nowak',
    role: 'owner',
    organizationId: org2.id,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  users.set(user2.id, user2);

  // Sample subscriptions
  const sub1 = {
    id: randomUUID(),
    organizationId: org1.id,
    stripeSubscriptionId: 'sub_' + randomUUID().slice(0, 8),
    plan: 'pro',
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    quantity: 5
  };
  subscriptions.set(sub1.id, sub1);

  // Sample usage
  usage.set(org1.id, {
    organizationId: org1.id,
    apiCalls: 4500,
    storage: 2.5,
    users: 5,
    period: '2025-01'
  });

  console.log('✓ Sample data initialized');
}

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'saas-starter-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Organizations API
app.get('/api/v1/organizations', (req: Request, res: Response) => {
  res.json({
    organizations: Array.from(organizations.values()),
    total: organizations.size
  });
});

app.get('/api/v1/organizations/:id', (req: Request, res: Response) => {
  const org = organizations.get(req.params.id);
  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }
  res.json(org);
});

app.post('/api/v1/organizations', (req: Request, res: Response) => {
  const org = {
    id: randomUUID(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  organizations.set(org.id, org);
  
  auditLogs.push({
    action: 'organization.created',
    resourceId: org.id,
    timestamp: new Date().toISOString()
  });
  
  res.status(201).json(org);
});

// Users API
app.get('/api/v1/users', (req: Request, res: Response) => {
  const { organizationId } = req.query;
  let result = Array.from(users.values());
  
  if (organizationId) {
    result = result.filter(u => u.organizationId === organizationId);
  }
  
  res.json({
    users: result,
    total: result.length
  });
});

app.get('/api/v1/users/:id', (req: Request, res: Response) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.post('/api/v1/users', (req: Request, res: Response) => {
  const user = {
    id: randomUUID(),
    ...req.body,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  users.set(user.id, user);
  
  auditLogs.push({
    action: 'user.created',
    resourceId: user.id,
    timestamp: new Date().toISOString()
  });
  
  res.status(201).json(user);
});

// Subscriptions API
app.get('/api/v1/subscriptions', (req: Request, res: Response) => {
  const { organizationId } = req.query;
  let result = Array.from(subscriptions.values());
  
  if (organizationId) {
    result = result.filter(s => s.organizationId === organizationId);
  }
  
  res.json({
    subscriptions: result,
    total: result.length
  });
});

app.get('/api/v1/subscriptions/:id', (req: Request, res: Response) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }
  res.json(sub);
});

// Invoices API
app.get('/api/v1/invoices', (req: Request, res: Response) => {
  const { organizationId } = req.query;
  let result = Array.from(invoices.values());
  
  if (organizationId) {
    result = result.filter(i => i.organizationId === organizationId);
  }
  
  res.json({
    invoices: result,
    total: result.length
  });
});

// Usage API
app.get('/api/v1/usage', (req: Request, res: Response) => {
  res.json({
    usage: Array.from(usage.values()),
    total: usage.size
  });
});

app.get('/api/v1/usage/:organizationId', (req: Request, res: Response) => {
  const orgUsage = usage.get(req.params.organizationId);
  if (!orgUsage) {
    return res.status(404).json({ error: 'Usage data not found' });
  }
  res.json(orgUsage);
});

// Audit Logs API
app.get('/api/v1/audit-logs', (req: Request, res: Response) => {
  const { organizationId, limit = 100 } = req.query;
  let result = auditLogs;
  
  if (organizationId) {
    result = result.filter(l => l.organizationId === organizationId);
  }
  
  res.json({
    logs: result.slice(0, Number(limit)),
    total: result.length
  });
});

// Dashboard metrics
app.get('/api/v1/metrics', (req: Request, res: Response) => {
  const totalOrgs = organizations.size;
  const activeOrgs = Array.from(organizations.values()).filter(o => o.status === 'active').length;
  const totalUsers = users.size;
  const activeUsers = Array.from(users.values()).filter(u => u.isActive).length;
  
  const mrr = Array.from(subscriptions.values()).reduce((sum, sub) => {
    const planPrices: Record<string, number> = {
      'free': 0,
      'starter': 29,
      'pro': 99,
      'enterprise': 299
    };
    return sum + (planPrices[sub.plan] || 0) * (sub.quantity || 1);
  }, 0);

  res.json({
    mrr,
    arr: mrr * 12,
    totalOrganizations: totalOrgs,
    activeOrganizations: activeOrgs,
    totalUsers,
    activeUsers,
    churnRate: 2.5,
    trialConversions: 35,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
initSampleData();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           SaaS Starter API - Reclapp Example                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                  ║
║  Health: http://localhost:${PORT}/health                         ║
║  API: http://localhost:${PORT}/api/v1/                           ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
