/**
 * B2B Risk Monitoring API Server
 * Reclapp 2.1.0 Example
 */

import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  port: parseInt(process.env.PORT || '8080'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://reclapp:reclapp@localhost:5432/reclapp'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  eventstore: {
    url: process.env.EVENTSTORE_URL || 'esdb://localhost:2113?tls=false'
  },
  ai: {
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.7'),
    sandboxMode: process.env.AI_SANDBOX_MODE === 'true'
  }
};

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const pool = new Pool({
  connectionString: config.database.url
});

const redis = new Redis(config.redis.url);

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// CUSTOMER ENDPOINTS
// ============================================================================

// List customers
app.get('/api/v1/customers', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, nip, name, segment, risk_score, credit_limit, status, monitoring_level, last_assessment
      FROM customers
      ORDER BY risk_score DESC
    `);
    res.json({ customers: result.rows });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer details
app.get('/api/v1/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ customer: result.rows[0] });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer risk details
app.get('/api/v1/customers/:id/risk', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get customer
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Get recent assessments
    const assessmentsResult = await pool.query(`
      SELECT * FROM risk_assessments 
      WHERE entity_type = 'Customer' AND entity_id = $1
      ORDER BY assessment_date DESC
      LIMIT 10
    `, [id]);
    
    // Get recent interventions
    const interventionsResult = await pool.query(`
      SELECT * FROM interventions
      WHERE entity_type = 'Customer' AND entity_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [id]);
    
    res.json({
      customer: customerResult.rows[0],
      assessments: assessmentsResult.rows,
      interventions: interventionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching customer risk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// INTERVENTION ENDPOINTS
// ============================================================================

// Apply intervention
app.post('/api/v1/interventions', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, interventionType, parameters, confidence, sandbox } = req.body;
    
    // Validate confidence threshold
    if (confidence < config.ai.confidenceThreshold && !sandbox) {
      return res.status(400).json({ 
        error: 'Confidence below threshold',
        required: config.ai.confidenceThreshold,
        actual: confidence
      });
    }
    
    // Insert intervention
    const result = await pool.query(`
      INSERT INTO interventions (entity_type, entity_id, intervention_type, parameters, confidence, sandbox, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [entityType, entityId, interventionType, JSON.stringify(parameters), confidence, sandbox]);
    
    res.status(201).json({ intervention: result.rows[0] });
  } catch (error) {
    console.error('Error applying intervention:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

// Risk dashboard
app.get('/api/v1/dashboard/risk', async (req: Request, res: Response) => {
  try {
    // Get dashboard metrics
    const metricsResult = await pool.query(`
      SELECT * FROM mv_risk_dashboard
    `);
    
    // Get recent alerts
    const alertsResult = await pool.query(`
      SELECT * FROM alerts
      WHERE resolved = false
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Get recent anomalies
    const anomaliesResult = await pool.query(`
      SELECT * FROM anomalies
      WHERE resolved = false
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    res.json({
      metrics: metricsResult.rows,
      alerts: alertsResult.rows,
      anomalies: anomaliesResult.rows,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// MCP ENDPOINT
// ============================================================================

app.post('/mcp', async (req: Request, res: Response) => {
  const { jsonrpc, id, method, params } = req.body;
  
  // Basic MCP handler
  let result: any = null;
  let error: any = null;
  
  switch (method) {
    case 'initialize':
      result = {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'reclapp-risk-monitoring', version: '1.0.0' },
        capabilities: { resources: {}, tools: {}, prompts: {} }
      };
      break;
    
    case 'tools/list':
      result = {
        tools: [
          { name: 'query_risk', description: 'Query customer risk score' },
          { name: 'apply_intervention', description: 'Apply risk intervention' }
        ]
      };
      break;
    
    default:
      error = { code: -32601, message: `Method not found: ${method}` };
  }
  
  res.json({ jsonrpc: '2.0', id, result, error });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✓ Database connected');
    
    // Test Redis connection
    await redis.ping();
    console.log('✓ Redis connected');
    
    app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          B2B Risk Monitoring API - Reclapp 2.1.0              ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:        ${config.port}                                         ║
║  Environment: ${config.nodeEnv.padEnd(45)}║
║  AI Sandbox:  ${config.ai.sandboxMode}                                       ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
