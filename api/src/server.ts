/**
 * Reclapp API Server
 * 
 * REST API for DSL parsing, validation, and execution.
 * Provides endpoints for dashboards, events, and real-time streaming.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';

import { parse, parseFile, formatAST } from '../../dsl/parser';
import { validate } from '../../dsl/validator';
import { createEventStore, InMemoryEventStore } from '../../core/eventstore';
import { CQRSContainer, InMemoryReadModel } from '../../core/cqrs';
import { ExecutionPlanner, GraphExecutor } from '../../core/planner';
import { 
  generateSeedData, 
  customerToEvents, 
  riskEventToDomainEvent,
  Customer,
  Contractor,
  RiskEvent 
} from '../../modules/mock';

// ============================================================================
// TYPES
// ============================================================================

interface AppState {
  eventStore: InMemoryEventStore;
  cqrs: CQRSContainer;
  planner: ExecutionPlanner;
  executor: GraphExecutor;
  readModels: {
    customers: InMemoryReadModel<Customer>;
    contractors: InMemoryReadModel<Contractor>;
    riskEvents: InMemoryReadModel<RiskEvent>;
  };
  wsClients: Set<WebSocket>;
}

// ============================================================================
// SERVER SETUP
// ============================================================================

export function createServer(port: number = 8080): { app: express.Application; start: () => void } {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Initialize state
  const state = initializeState();

  // Setup WebSocket
  setupWebSocket(wss, state);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.static(path.join(__dirname, '../../frontend/public')));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });

  // ============================================================================
  // DSL ENDPOINTS
  // ============================================================================

  // Parse DSL source
  app.post('/api/parse', (req: Request, res: Response) => {
    try {
      const { source } = req.body;

      if (!source) {
        return res.status(400).json({ error: 'Missing source code' });
      }

      const result = parse(source);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors
        });
      }

      return res.json({
        success: true,
        ast: result.ast
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Validate DSL source
  app.post('/api/validate', (req: Request, res: Response) => {
    try {
      const { source } = req.body;

      if (!source) {
        return res.status(400).json({ error: 'Missing source code' });
      }

      const parseResult = parse(source);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          parseErrors: parseResult.errors
        });
      }

      const validationResult = validate(parseResult.ast!);

      return res.json({
        success: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Build execution graph
  app.post('/api/plan', (req: Request, res: Response) => {
    try {
      const { source } = req.body;

      if (!source) {
        return res.status(400).json({ error: 'Missing source code' });
      }

      const parseResult = parse(source);
      if (!parseResult.success) {
        return res.status(400).json({ success: false, errors: parseResult.errors });
      }

      const validationResult = validate(parseResult.ast!);
      if (!validationResult.valid) {
        return res.status(400).json({ success: false, errors: validationResult.errors });
      }

      const graph = state.planner.buildGraph(parseResult.ast!);
      const plan = state.planner.createPlan(graph);

      // Convert Map to object for JSON serialization
      const nodesObj: Record<string, any> = {};
      graph.nodes.forEach((node, key) => {
        nodesObj[key] = node;
      });

      return res.json({
        success: true,
        plan: {
          ...plan,
          graph: {
            ...plan.graph,
            nodes: nodesObj
          }
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // DATA ENDPOINTS
  // ============================================================================

  // Get all customers
  app.get('/api/customers', async (req: Request, res: Response) => {
    try {
      const customers = await state.readModels.customers.getAll();
      return res.json({ success: true, data: customers, count: customers.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get customer by ID
  app.get('/api/customers/:id', async (req: Request, res: Response) => {
    try {
      const customer = await state.readModels.customers.get(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      return res.json({ success: true, data: customer });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get all contractors
  app.get('/api/contractors', async (req: Request, res: Response) => {
    try {
      const contractors = await state.readModels.contractors.getAll();
      return res.json({ success: true, data: contractors, count: contractors.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get contractor by ID
  app.get('/api/contractors/:id', async (req: Request, res: Response) => {
    try {
      const contractor = await state.readModels.contractors.get(req.params.id);
      if (!contractor) {
        return res.status(404).json({ error: 'Contractor not found' });
      }
      return res.json({ success: true, data: contractor });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get risk events
  app.get('/api/risk-events', async (req: Request, res: Response) => {
    try {
      const events = await state.readModels.riskEvents.getAll();
      
      // Apply filters
      let filtered = events;
      if (req.query.severity) {
        filtered = filtered.filter(e => e.severity === req.query.severity);
      }
      if (req.query.entityType) {
        filtered = filtered.filter(e => e.entityType === req.query.entityType);
      }
      if (req.query.resolved !== undefined) {
        const resolved = req.query.resolved === 'true';
        filtered = filtered.filter(e => e.resolved === resolved);
      }

      // Sort by timestamp descending
      filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return res.json({ success: true, data: filtered, count: filtered.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // DASHBOARD ENDPOINTS
  // ============================================================================

  // Get dashboard summary
  app.get('/api/dashboard/summary', async (req: Request, res: Response) => {
    try {
      const customers = await state.readModels.customers.getAll();
      const contractors = await state.readModels.contractors.getAll();
      const riskEvents = await state.readModels.riskEvents.getAll();

      const summary = {
        customers: {
          total: customers.length,
          verified: customers.filter(c => c.onboardingStatus === 'verified').length,
          pending: customers.filter(c => c.onboardingStatus === 'pending').length,
          rejected: customers.filter(c => c.onboardingStatus === 'rejected').length,
          bySegment: {
            enterprise: customers.filter(c => c.segment === 'enterprise').length,
            sme: customers.filter(c => c.segment === 'sme').length,
            startup: customers.filter(c => c.segment === 'startup').length
          }
        },
        contractors: {
          total: contractors.length,
          active: contractors.filter(c => c.status === 'active').length,
          avgRating: contractors.reduce((sum, c) => sum + c.rating, 0) / contractors.length || 0,
          totalValue: contractors.reduce((sum, c) => sum + c.totalValue, 0)
        },
        riskEvents: {
          total: riskEvents.length,
          unresolved: riskEvents.filter(e => !e.resolved).length,
          bySeverity: {
            critical: riskEvents.filter(e => e.severity === 'critical').length,
            high: riskEvents.filter(e => e.severity === 'high').length,
            medium: riskEvents.filter(e => e.severity === 'medium').length,
            low: riskEvents.filter(e => e.severity === 'low').length
          }
        },
        lastUpdated: new Date()
      };

      return res.json({ success: true, data: summary });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // EVENT SOURCING ENDPOINTS
  // ============================================================================

  // Get events from stream
  app.get('/api/events/:streamId', async (req: Request, res: Response) => {
    try {
      const { streamId } = req.params;
      const fromVersion = parseInt(req.query.from as string) || 0;
      const count = parseInt(req.query.count as string) || 100;

      const result = await state.eventStore.read(streamId, fromVersion, count);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get all events
  app.get('/api/events', async (req: Request, res: Response) => {
    try {
      const fromPosition = parseInt(req.query.from as string) || 0;
      const count = parseInt(req.query.count as string) || 100;

      const result = await state.eventStore.readAll(fromPosition, count);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // SSE ENDPOINT
  // ============================================================================

  app.get('/api/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send heartbeat
    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 30000);

    // Subscribe to events
    const unsubscribe = state.eventStore.subscribe('*', async (event) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  // Reseed data
  app.post('/api/admin/reseed', async (req: Request, res: Response) => {
    try {
      const options = req.body || {};
      await seedData(state, options);
      return res.json({ success: true, message: 'Data reseeded' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    return res.json({
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0'
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  });

  return {
    app,
    start: () => {
      // Seed initial data
      seedData(state).then(() => {
        server.listen(port, () => {
          console.log(`🚀 Reclapp API Server running on port ${port}`);
          console.log(`   REST API: http://localhost:${port}/api`);
          console.log(`   WebSocket: ws://localhost:${port}/ws`);
          console.log(`   SSE Stream: http://localhost:${port}/api/stream`);
        });
      });
    }
  };
}

// ============================================================================
// STATE INITIALIZATION
// ============================================================================

function initializeState(): AppState {
  const eventStore = new InMemoryEventStore();
  const cqrs = new CQRSContainer(eventStore);
  const planner = new ExecutionPlanner();
  const executor = new GraphExecutor();

  const readModels = {
    customers: new InMemoryReadModel<Customer>('customers'),
    contractors: new InMemoryReadModel<Contractor>('contractors'),
    riskEvents: new InMemoryReadModel<RiskEvent>('riskEvents')
  };

  cqrs.readModels.register(readModels.customers);
  cqrs.readModels.register(readModels.contractors);
  cqrs.readModels.register(readModels.riskEvents);

  return {
    eventStore,
    cqrs,
    planner,
    executor,
    readModels,
    wsClients: new Set()
  };
}

// ============================================================================
// WEBSOCKET SETUP
// ============================================================================

function setupWebSocket(wss: WebSocketServer, state: AppState): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    state.wsClients.add(ws);

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe') {
          // Subscribe to specific event types or streams
          console.log(`Client subscribed to: ${data.pattern || '*'}`);
        }

        if (data.type === 'parse') {
          const result = parse(data.source);
          ws.send(JSON.stringify({ type: 'parseResult', data: result }));
        }
      } catch (error: any) {
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      state.wsClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      state.wsClients.delete(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date() }));
  });

  // Broadcast events to all connected clients
  state.eventStore.subscribe('*', async (event) => {
    const message = JSON.stringify({ type: 'event', data: event });
    state.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
}

// ============================================================================
// DATA SEEDING
// ============================================================================

async function seedData(state: AppState, options?: { customers?: number; contractors?: number }): Promise<void> {
  console.log('Seeding mock data...');

  // Generate seed data
  const seedData = generateSeedData({
    customers: options?.customers || 20,
    contractors: options?.contractors || 15
  });

  // Store in read models
  for (const customer of seedData.customers) {
    await state.readModels.customers.set(customer.customerId, customer);
    
    // Store events
    const events = customerToEvents(customer);
    for (const event of events) {
      await state.eventStore.append(`customer-${customer.customerId}`, [{
        streamId: `customer-${customer.customerId}`,
        type: event.type,
        data: event.data,
        metadata: { source: 'seed' }
      }]);
    }
  }

  for (const contractor of seedData.contractors) {
    await state.readModels.contractors.set(contractor.contractorId, contractor);
  }

  for (const riskEvent of seedData.riskEvents) {
    await state.readModels.riskEvents.set(riskEvent.id, riskEvent);
    
    const domainEvent = riskEventToDomainEvent(riskEvent);
    await state.eventStore.append(`risk-${riskEvent.entityId}`, [{
      streamId: `risk-${riskEvent.entityId}`,
      type: domainEvent.type,
      data: domainEvent.data,
      metadata: { source: 'seed' }
    }]);
  }

  console.log(`Seeded: ${seedData.customers.length} customers, ${seedData.contractors.length} contractors, ${seedData.riskEvents.length} risk events`);
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  const port = parseInt(process.env.PORT || '8080');
  const { start } = createServer(port);
  start();
}
