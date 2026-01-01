/**
 * CRM System API Server
 * Customer Relationship Management with contacts, deals, and activities
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// In-memory data stores
const contacts: Map<string, any> = new Map();
const companies: Map<string, any> = new Map();
const deals: Map<string, any> = new Map();
const activities: Map<string, any> = new Map();
const tasks: Map<string, any> = new Map();
const pipelines: Map<string, any> = new Map();

// Initialize sample data
function initSampleData() {
  // Default pipeline
  const pipeline = {
    id: randomUUID(),
    name: 'Sales Pipeline',
    stages: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    defaultStage: 'Lead',
    isDefault: true,
    createdAt: new Date().toISOString()
  };
  pipelines.set(pipeline.id, pipeline);

  // Companies
  const company1 = {
    id: randomUUID(),
    name: 'TechCorp Sp. z o.o.',
    domain: 'techcorp.pl',
    industry: 'Technology',
    size: '50-200',
    status: 'customer',
    ownerId: 'user-001',
    createdAt: new Date().toISOString()
  };
  companies.set(company1.id, company1);

  const company2 = {
    id: randomUUID(),
    name: 'GlobalTrade S.A.',
    domain: 'globaltrade.com',
    industry: 'Trading',
    size: '200-500',
    status: 'prospect',
    ownerId: 'user-001',
    createdAt: new Date().toISOString()
  };
  companies.set(company2.id, company2);

  // Contacts
  const contacts_data = [
    { firstName: 'Jan', lastName: 'Kowalski', email: 'jan.kowalski@techcorp.pl', company: 'TechCorp Sp. z o.o.', jobTitle: 'CTO', companyId: company1.id },
    { firstName: 'Anna', lastName: 'Nowak', email: 'anna.nowak@techcorp.pl', company: 'TechCorp Sp. z o.o.', jobTitle: 'CEO', companyId: company1.id },
    { firstName: 'Piotr', lastName: 'Wiśniewski', email: 'piotr@globaltrade.com', company: 'GlobalTrade S.A.', jobTitle: 'Procurement Manager', companyId: company2.id },
  ];

  contacts_data.forEach(c => {
    const contact = {
      id: randomUUID(),
      ...c,
      source: 'website',
      status: 'active',
      ownerId: 'user-001',
      leadScore: Math.floor(Math.random() * 100),
      createdAt: new Date().toISOString()
    };
    contacts.set(contact.id, contact);
  });

  // Deals
  const contactIds = Array.from(contacts.keys());
  const deals_data = [
    { name: 'Enterprise License Deal', amount: 150000, stage: 'Proposal', probability: 60 },
    { name: 'Consulting Project', amount: 45000, stage: 'Negotiation', probability: 75 },
    { name: 'Support Contract Renewal', amount: 25000, stage: 'Qualified', probability: 40 },
    { name: 'New Implementation', amount: 80000, stage: 'Lead', probability: 20 },
  ];

  deals_data.forEach((d, i) => {
    const deal = {
      id: randomUUID(),
      ...d,
      companyId: i % 2 === 0 ? company1.id : company2.id,
      contactId: contactIds[i % contactIds.length],
      ownerId: 'user-001',
      currency: 'PLN',
      expectedCloseDate: new Date(Date.now() + (30 + i * 15) * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    deals.set(deal.id, deal);
  });

  // Activities
  const activity1 = {
    id: randomUUID(),
    type: 'call',
    subject: 'Discovery Call',
    contactId: contactIds[0],
    ownerId: 'user-001',
    completedAt: new Date().toISOString(),
    outcome: 'interested',
    createdAt: new Date().toISOString()
  };
  activities.set(activity1.id, activity1);

  // Tasks
  const task1 = {
    id: randomUUID(),
    title: 'Send proposal to TechCorp',
    assignedTo: 'user-001',
    dealId: Array.from(deals.keys())[0],
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  tasks.set(task1.id, task1);

  console.log('✓ Sample data initialized');
}

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'crm-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Contacts API
app.get('/api/v1/contacts', (req: Request, res: Response) => {
  const { companyId, status } = req.query;
  let result = Array.from(contacts.values());
  
  if (companyId) result = result.filter(c => c.companyId === companyId);
  if (status) result = result.filter(c => c.status === status);
  
  res.json({ contacts: result, total: result.length });
});

app.get('/api/v1/contacts/:id', (req: Request, res: Response) => {
  const contact = contacts.get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

app.post('/api/v1/contacts', (req: Request, res: Response) => {
  const contact = {
    id: randomUUID(),
    ...req.body,
    leadScore: 0,
    createdAt: new Date().toISOString()
  };
  contacts.set(contact.id, contact);
  res.status(201).json(contact);
});

// Companies API
app.get('/api/v1/companies', (req: Request, res: Response) => {
  res.json({
    companies: Array.from(companies.values()),
    total: companies.size
  });
});

app.get('/api/v1/companies/:id', (req: Request, res: Response) => {
  const company = companies.get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  
  const companyContacts = Array.from(contacts.values()).filter(c => c.companyId === company.id);
  const companyDeals = Array.from(deals.values()).filter(d => d.companyId === company.id);
  
  res.json({ ...company, contacts: companyContacts, deals: companyDeals });
});

// Deals API
app.get('/api/v1/deals', (req: Request, res: Response) => {
  const { stage, ownerId } = req.query;
  let result = Array.from(deals.values());
  
  if (stage) result = result.filter(d => d.stage === stage);
  if (ownerId) result = result.filter(d => d.ownerId === ownerId);
  
  res.json({ deals: result, total: result.length });
});

app.get('/api/v1/deals/:id', (req: Request, res: Response) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  res.json(deal);
});

app.post('/api/v1/deals', (req: Request, res: Response) => {
  const deal = {
    id: randomUUID(),
    ...req.body,
    stage: req.body.stage || 'Lead',
    probability: req.body.probability || 10,
    createdAt: new Date().toISOString()
  };
  deals.set(deal.id, deal);
  res.status(201).json(deal);
});

app.patch('/api/v1/deals/:id/stage', (req: Request, res: Response) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  
  const previousStage = deal.stage;
  deal.stage = req.body.stage;
  deals.set(deal.id, deal);
  
  res.json({ ...deal, previousStage });
});

// Pipeline API
app.get('/api/v1/pipeline', (req: Request, res: Response) => {
  const pipeline = Array.from(pipelines.values()).find(p => p.isDefault);
  const allDeals = Array.from(deals.values());
  
  const stages = pipeline?.stages.map((stage: string) => ({
    name: stage,
    deals: allDeals.filter(d => d.stage === stage),
    totalValue: allDeals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.amount, 0)
  }));
  
  res.json({ pipeline, stages });
});

// Activities API
app.get('/api/v1/activities', (req: Request, res: Response) => {
  const { contactId, type } = req.query;
  let result = Array.from(activities.values());
  
  if (contactId) result = result.filter(a => a.contactId === contactId);
  if (type) result = result.filter(a => a.type === type);
  
  res.json({ activities: result, total: result.length });
});

app.post('/api/v1/activities', (req: Request, res: Response) => {
  const activity = {
    id: randomUUID(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  activities.set(activity.id, activity);
  res.status(201).json(activity);
});

// Tasks API
app.get('/api/v1/tasks', (req: Request, res: Response) => {
  const { assignedTo, status } = req.query;
  let result = Array.from(tasks.values());
  
  if (assignedTo) result = result.filter(t => t.assignedTo === assignedTo);
  if (status) result = result.filter(t => t.status === status);
  
  res.json({ tasks: result, total: result.length });
});

app.post('/api/v1/tasks', (req: Request, res: Response) => {
  const task = {
    id: randomUUID(),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  tasks.set(task.id, task);
  res.status(201).json(task);
});

app.patch('/api/v1/tasks/:id/complete', (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  
  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  tasks.set(task.id, task);
  
  res.json(task);
});

// Dashboard metrics
app.get('/api/v1/metrics', (req: Request, res: Response) => {
  const allDeals = Array.from(deals.values());
  const wonDeals = allDeals.filter(d => d.stage === 'Closed Won');
  const lostDeals = allDeals.filter(d => d.stage === 'Closed Lost');
  const openDeals = allDeals.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage));
  
  const pipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
  const weightedPipeline = openDeals.reduce((sum, d) => sum + (d.amount * d.probability / 100), 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + d.amount, 0);
  
  const winRate = allDeals.length > 0 
    ? (wonDeals.length / (wonDeals.length + lostDeals.length) * 100) || 0
    : 0;

  res.json({
    totalContacts: contacts.size,
    totalCompanies: companies.size,
    totalDeals: deals.size,
    openDeals: openDeals.length,
    pipelineValue,
    weightedPipeline,
    wonValue,
    winRate: Math.round(winRate),
    avgDealSize: openDeals.length > 0 ? Math.round(pipelineValue / openDeals.length) : 0,
    pendingTasks: Array.from(tasks.values()).filter(t => t.status === 'pending').length,
    activitiesThisWeek: activities.size,
    timestamp: new Date().toISOString()
  });
});

// Forecast API
app.get('/api/v1/forecast', (req: Request, res: Response) => {
  const openDeals = Array.from(deals.values()).filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage));
  
  const committed = openDeals.filter(d => d.probability >= 80).reduce((sum, d) => sum + d.amount, 0);
  const bestCase = openDeals.filter(d => d.probability >= 50).reduce((sum, d) => sum + d.amount, 0);
  const pipeline = openDeals.reduce((sum, d) => sum + d.amount, 0);
  const weighted = openDeals.reduce((sum, d) => sum + (d.amount * d.probability / 100), 0);

  res.json({
    committed,
    bestCase,
    pipeline,
    weighted: Math.round(weighted),
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
║              CRM System API - Reclapp Example                 ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                  ║
║  Health: http://localhost:${PORT}/health                         ║
║  API: http://localhost:${PORT}/api/v1/                           ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
