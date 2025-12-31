/**
 * Orchestrator Agent
 * Coordinates task distribution and conflict resolution
 */

import { BaseAgent, AgentMessage, config, express, Request, Response } from '../../src/server';

interface Task {
  id: string;
  type: string;
  priority: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  assignedAgents: string[];
  payload: any;
  results: Map<string, any>;
  createdAt: Date;
}

class OrchestratorAgent extends BaseAgent {
  private tasks: Map<string, Task> = new Map();
  private registeredAgents: Map<string, any> = new Map();

  protected getCapabilities(): string[] {
    return ['task_distribution', 'conflict_resolution', 'result_aggregation', 'agent_coordination'];
  }

  protected setupAgentRoutes(): void {
    // Create task
    this.app.post('/api/v1/tasks', async (req: Request, res: Response) => {
      const { type, priority = 5, payload } = req.body;
      
      const task: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        priority,
        status: 'pending',
        assignedAgents: [],
        payload,
        results: new Map(),
        createdAt: new Date()
      };
      
      this.tasks.set(task.id, task);
      
      // Distribute task
      await this.distributeTask(task);
      
      res.status(201).json({ task: { ...task, results: Object.fromEntries(task.results) } });
    });

    // Get task status
    this.app.get('/api/v1/tasks/:taskId', (req: Request, res: Response) => {
      const task = this.tasks.get(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ task: { ...task, results: Object.fromEntries(task.results) } });
    });

    // List tasks
    this.app.get('/api/v1/tasks', (req: Request, res: Response) => {
      const tasks = Array.from(this.tasks.values()).map(t => ({
        ...t,
        results: Object.fromEntries(t.results)
      }));
      res.json({ tasks });
    });

    // Get registered agents
    this.app.get('/api/v1/agents', async (req: Request, res: Response) => {
      const agents: any[] = [];
      
      // Check heartbeats in Redis
      for (const [name, info] of this.registeredAgents) {
        const heartbeat = await this.state.get(`agent:${name}:heartbeat`);
        agents.push({
          ...info,
          status: heartbeat ? 'online' : 'offline',
          lastSeen: heartbeat?.timestamp
        });
      }
      
      res.json({ agents });
    });
  }

  protected async handleTask(msg: AgentMessage): Promise<any> {
    // Handle results from other agents
    if (msg.type === 'result' && msg.correlationId) {
      const task = this.tasks.get(msg.correlationId);
      if (task) {
        task.results.set(msg.from, msg.payload);
        
        // Check if all agents responded
        if (task.results.size >= task.assignedAgents.length) {
          await this.aggregateResults(task);
        }
      }
    }
    
    return { received: true };
  }

  private async distributeTask(task: Task): Promise<void> {
    // Select appropriate agents based on task type
    const agents = this.selectAgents(task);
    task.assignedAgents = agents;
    task.status = 'assigned';
    
    // Send task to each agent
    for (const agentName of agents) {
      const message: AgentMessage = {
        id: task.id,
        from: this.agentName,
        to: agentName,
        type: 'task',
        payload: task.payload,
        timestamp: new Date().toISOString()
      };
      
      await this.mq.publish(`agent.${agentName}`, message);
    }
    
    task.status = 'in_progress';
  }

  private selectAgents(task: Task): string[] {
    // Simple agent selection based on task type
    const agentMapping: Record<string, string[]> = {
      'full_customer_analysis': ['risk-agent', 'compliance-agent', 'customer-agent'],
      'risk_assessment': ['risk-agent'],
      'compliance_check': ['compliance-agent'],
      'customer_profile': ['customer-agent'],
      'default': ['risk-agent']
    };
    
    return agentMapping[task.type] || agentMapping['default'];
  }

  private async aggregateResults(task: Task): Promise<void> {
    // Check for conflicts
    const results = Array.from(task.results.values());
    const hasConflict = this.detectConflict(results);
    
    if (hasConflict) {
      const resolved = await this.resolveConflict(task);
      task.results.set('_aggregated', resolved);
    } else {
      // Merge results
      const merged = results.reduce((acc, r) => ({ ...acc, ...r }), {});
      task.results.set('_aggregated', merged);
    }
    
    task.status = 'completed';
    
    // Store final result
    await this.state.set(`task:${task.id}:result`, {
      taskId: task.id,
      status: task.status,
      results: Object.fromEntries(task.results),
      completedAt: new Date().toISOString()
    });
  }

  private detectConflict(results: any[]): boolean {
    // Simple conflict detection - check if recommendations differ
    const recommendations = results
      .filter(r => r.recommendation)
      .map(r => r.recommendation);
    
    if (recommendations.length <= 1) return false;
    
    // Check if all recommendations are the same
    return !recommendations.every(r => r === recommendations[0]);
  }

  private async resolveConflict(task: Task): Promise<any> {
    // Weighted voting conflict resolution
    const results = Array.from(task.results.entries());
    const weights: Record<string, number> = {
      'risk-agent': 0.4,
      'compliance-agent': 0.35,
      'customer-agent': 0.25
    };
    
    let bestResult: any = null;
    let bestScore = -1;
    
    for (const [agent, result] of results) {
      const weight = weights[agent] || 0.2;
      const confidence = result.confidence || 0.5;
      const score = weight * confidence;
      
      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }
    
    return {
      ...bestResult,
      resolvedBy: 'weighted_voting',
      conflictResolution: true
    };
  }
}

// Start agent
const agent = new OrchestratorAgent();
agent.start();
