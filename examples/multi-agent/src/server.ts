/**
 * Multi-Agent Orchestration - Shared Server Utilities
 * Reclapp 2.1.0 Example
 */

import express, { Request, Response, NextFunction } from 'express';
import amqplib, { Connection, Channel } from 'amqplib';
import Redis from 'ioredis';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const config = {
  port: parseInt(process.env.PORT || '8080'),
  nodeEnv: process.env.NODE_ENV || 'development',
  agentName: process.env.AGENT_NAME || 'unknown',
  agentRole: process.env.AGENT_ROLE || 'unknown',
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://reclapp:reclapp@localhost:5672'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  eventstore: {
    url: process.env.EVENTSTORE_URL || 'esdb://localhost:2113?tls=false'
  },
  orchestrator: {
    url: process.env.ORCHESTRATOR_URL || 'http://localhost:8080'
  }
};

// ============================================================================
// MESSAGE QUEUE
// ============================================================================

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'task' | 'result' | 'query' | 'response' | 'heartbeat';
  payload: any;
  timestamp: string;
  correlationId?: string;
}

export class MessageQueue {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private handlers: Map<string, (msg: AgentMessage) => Promise<void>> = new Map();

  async connect(): Promise<void> {
    this.connection = await amqplib.connect(config.rabbitmq.url);
    this.channel = await this.connection.createChannel();
    
    // Declare exchanges
    await this.channel.assertExchange('agents', 'topic', { durable: true });
    await this.channel.assertExchange('tasks', 'direct', { durable: true });
    
    console.log('✓ RabbitMQ connected');
  }

  async subscribe(queue: string, routingKey: string, handler: (msg: AgentMessage) => Promise<void>): Promise<void> {
    if (!this.channel) throw new Error('Not connected');
    
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, 'agents', routingKey);
    
    this.handlers.set(queue, handler);
    
    this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content: AgentMessage = JSON.parse(msg.content.toString());
          await handler(content);
          this.channel?.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          this.channel?.nack(msg, false, false);
        }
      }
    });
  }

  async publish(routingKey: string, message: AgentMessage): Promise<void> {
    if (!this.channel) throw new Error('Not connected');
    
    this.channel.publish(
      'agents',
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}

// ============================================================================
// SHARED STATE (Redis)
// ============================================================================

export class SharedState {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(config.redis.url);
  }

  async get(key: string): Promise<any> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async publish(channel: string, message: any): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, handler: (message: any) => void): Promise<void> {
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        handler(JSON.parse(msg));
      }
    });
  }
}

// ============================================================================
// BASE AGENT
// ============================================================================

export abstract class BaseAgent {
  protected app: express.Application;
  protected mq: MessageQueue;
  protected state: SharedState;
  protected agentName: string;
  protected agentRole: string;

  constructor() {
    this.app = express();
    this.mq = new MessageQueue();
    this.state = new SharedState();
    this.agentName = config.agentName;
    this.agentRole = config.agentRole;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        agent: this.agentName,
        role: this.agentRole,
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/info', (req: Request, res: Response) => {
      res.json({
        name: this.agentName,
        role: this.agentRole,
        capabilities: this.getCapabilities(),
        version: '1.0.0'
      });
    });

    // Override in subclasses
    this.setupAgentRoutes();
  }

  protected abstract setupAgentRoutes(): void;
  protected abstract getCapabilities(): string[];
  protected abstract handleTask(task: AgentMessage): Promise<any>;

  async start(): Promise<void> {
    try {
      await this.mq.connect();
      
      // Subscribe to agent-specific queue
      await this.mq.subscribe(
        `agent.${this.agentName}`,
        `agent.${this.agentName}`,
        async (msg) => {
          if (msg.type === 'task') {
            const result = await this.handleTask(msg);
            await this.sendResult(msg, result);
          }
        }
      );
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.app.listen(config.port, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          ${this.agentName.padEnd(20)} - Reclapp Multi-Agent       ║
╠═══════════════════════════════════════════════════════════════╣
║  Role:        ${this.agentRole.padEnd(45)}║
║  Port:        ${config.port}                                         ║
╚═══════════════════════════════════════════════════════════════╝
        `);
      });
    } catch (error) {
      console.error('Failed to start agent:', error);
      process.exit(1);
    }
  }

  private async sendResult(originalMessage: AgentMessage, result: any): Promise<void> {
    const response: AgentMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: this.agentName,
      to: originalMessage.from,
      type: 'result',
      payload: result,
      timestamp: new Date().toISOString(),
      correlationId: originalMessage.id
    };
    
    await this.mq.publish(`agent.${originalMessage.from}`, response);
  }

  private startHeartbeat(): void {
    setInterval(async () => {
      await this.state.set(`agent:${this.agentName}:heartbeat`, {
        name: this.agentName,
        role: this.agentRole,
        status: 'online',
        timestamp: new Date().toISOString()
      }, 30);
    }, 10000);
  }
}

// Export for agents to use
export { express, Request, Response, NextFunction };
