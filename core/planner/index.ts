/**
 * Reclapp Execution Planner
 * 
 * Builds execution graphs (DAGs) from validated AST.
 * Handles dependency resolution and parallel execution planning.
 */

import type { 
  Program, 
  EntityDeclaration, 
  PipelineDeclaration,
  AlertDeclaration,
  DashboardDeclaration,
  SemanticModel 
} from '../../dsl/ast/types';

// ============================================================================
// GRAPH TYPES
// ============================================================================

export interface ExecutionNode {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, any>;
  dependencies: string[];
  outputs: string[];
  status: NodeStatus;
}

export type NodeType = 
  | 'source'      // Data source (API, database, file)
  | 'transform'   // Data transformation
  | 'aggregate'   // Event aggregate
  | 'projection'  // CQRS projection
  | 'alert'       // Alert evaluation
  | 'dashboard'   // Dashboard update
  | 'device'      // Hardware output
  | 'notification'; // External notification

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ExecutionEdge {
  from: string;
  to: string;
  type: EdgeType;
  config?: Record<string, any>;
}

export type EdgeType = 
  | 'data'        // Data flow
  | 'event'       // Event trigger
  | 'dependency'  // Execution dependency
  | 'condition';  // Conditional flow

export interface ExecutionGraph {
  nodes: Map<string, ExecutionNode>;
  edges: ExecutionEdge[];
  entryPoints: string[];
  metadata: GraphMetadata;
}

export interface GraphMetadata {
  name: string;
  version: string;
  createdAt: Date;
  hash: string;
}

export interface ExecutionPlan {
  graph: ExecutionGraph;
  stages: ExecutionStage[];
  estimatedDuration?: number;
}

export interface ExecutionStage {
  order: number;
  nodes: string[];
  parallel: boolean;
}

// ============================================================================
// PLANNER CLASS
// ============================================================================

export class ExecutionPlanner {
  buildGraph(ast: Program): ExecutionGraph {
    const nodes = new Map<string, ExecutionNode>();
    const edges: ExecutionEdge[] = [];
    const entryPoints: string[] = [];

    for (const statement of ast.statements) {
      switch (statement.type) {
        case 'EntityDeclaration':
          this.processEntity(statement, nodes, edges);
          break;
        case 'PipelineDeclaration':
          this.processPipeline(statement, nodes, edges, entryPoints);
          break;
        case 'AlertDeclaration':
          this.processAlert(statement, nodes, edges);
          break;
        case 'DashboardDeclaration':
          this.processDashboard(statement, nodes, edges);
          break;
        case 'SourceDeclaration':
          this.processSource(statement, nodes, edges, entryPoints);
          break;
        case 'DeviceDeclaration':
          this.processDevice(statement, nodes, edges);
          break;
      }
    }

    this.resolveImplicitDependencies(nodes, edges);

    return {
      nodes,
      edges,
      entryPoints,
      metadata: {
        name: 'execution-graph',
        version: '1.0',
        createdAt: new Date(),
        hash: this.computeHash(nodes, edges)
      }
    };
  }

  createPlan(graph: ExecutionGraph): ExecutionPlan {
    const stages = this.topologicalSort(graph);
    return {
      graph,
      stages,
      estimatedDuration: this.estimateDuration(stages)
    };
  }

  private processEntity(
    entity: EntityDeclaration,
    nodes: Map<string, ExecutionNode>,
    edges: ExecutionEdge[]
  ): void {
    const nodeId = `entity:${entity.name}`;

    nodes.set(nodeId, {
      id: nodeId,
      type: 'aggregate',
      name: entity.name,
      config: {
        fields: entity.fields.map(f => ({
          name: f.name,
          type: f.fieldType.baseType,
          nullable: f.fieldType.nullable,
          annotations: f.annotations.map(a => a.name)
        }))
      },
      dependencies: [],
      outputs: [],
      status: 'pending'
    });

    const projectionId = `projection:${entity.name}`;
    nodes.set(projectionId, {
      id: projectionId,
      type: 'projection',
      name: `${entity.name}ReadModel`,
      config: { entityName: entity.name, fields: entity.fields.map(f => f.name) },
      dependencies: [nodeId],
      outputs: [],
      status: 'pending'
    });

    edges.push({ from: nodeId, to: projectionId, type: 'event' });
  }

  private processPipeline(
    pipeline: PipelineDeclaration,
    nodes: Map<string, ExecutionNode>,
    edges: ExecutionEdge[],
    entryPoints: string[]
  ): void {
    const pipelineId = `pipeline:${pipeline.name}`;
    const inputSource = pipeline.input?.raw || 'unknown';
    const sourceNodeId = this.findSourceNode(inputSource, nodes);

    let prevNodeId = sourceNodeId;
    const transforms = pipeline.transforms || [];

    for (let i = 0; i < transforms.length; i++) {
      const transformName = transforms[i];
      const transformId = `${pipelineId}:transform:${transformName}`;

      nodes.set(transformId, {
        id: transformId,
        type: 'transform',
        name: transformName,
        config: { pipelineName: pipeline.name, transformType: transformName, order: i },
        dependencies: prevNodeId ? [prevNodeId] : [],
        outputs: [],
        status: 'pending'
      });

      if (prevNodeId) {
        edges.push({ from: prevNodeId, to: transformId, type: 'data' });
      }
      prevNodeId = transformId;
    }

    const outputs = pipeline.outputs || [];
    for (const output of outputs) {
      const outputNodeId = this.resolveOutputNode(output, nodes);
      if (outputNodeId && prevNodeId) {
        edges.push({ from: prevNodeId, to: outputNodeId, type: 'data' });
        const outputNode = nodes.get(outputNodeId);
        if (outputNode && !outputNode.dependencies.includes(prevNodeId)) {
          outputNode.dependencies.push(prevNodeId);
        }
      }
    }

    if (pipeline.schedule && transforms.length > 0) {
      entryPoints.push(`${pipelineId}:transform:${transforms[0]}`);
    }
  }

  private processAlert(
    alert: AlertDeclaration,
    nodes: Map<string, ExecutionNode>,
    edges: ExecutionEdge[]
  ): void {
    const alertId = `alert:${alert.name.value}`;
    const entityType = alert.entity?.type;
    const sourceNodeId = entityType ? `projection:${entityType}` : undefined;

    nodes.set(alertId, {
      id: alertId,
      type: 'alert',
      name: alert.name.value,
      config: {
        entityType,
        condition: this.serializeCondition(alert.condition),
        severity: alert.severity || 'medium',
        throttle: alert.throttle?.value
      },
      dependencies: sourceNodeId ? [sourceNodeId] : [],
      outputs: [],
      status: 'pending'
    });

    if (sourceNodeId) {
      edges.push({ from: sourceNodeId, to: alertId, type: 'event' });
    }

    const targets = alert.targets || [];
    for (const target of targets) {
      const notificationId = `${alertId}:notify:${target.protocol}`;
      nodes.set(notificationId, {
        id: notificationId,
        type: 'notification',
        name: `${alert.name.value} - ${target.protocol}`,
        config: { protocol: target.protocol, path: target.path },
        dependencies: [alertId],
        outputs: [],
        status: 'pending'
      });
      edges.push({ from: alertId, to: notificationId, type: 'condition' });
    }
  }

  private processDashboard(
    dashboard: DashboardDeclaration,
    nodes: Map<string, ExecutionNode>,
    edges: ExecutionEdge[]
  ): void {
    const dashboardId = `dashboard:${dashboard.name.value}`;
    const entityType = dashboard.entity?.type;
    const sourceNodeId = entityType ? `projection:${entityType}` : undefined;

    nodes.set(dashboardId, {
      id: dashboardId,
      type: 'dashboard',
      name: dashboard.name.value,
      config: {
        entityType,
        metrics: dashboard.metrics || [],
        streamMode: dashboard.streamMode || 'manual',
        refreshInterval: dashboard.refreshInterval?.value
      },
      dependencies: sourceNodeId ? [sourceNodeId] : [],
      outputs: [],
      status: 'pending'
    });

    if (sourceNodeId) {
      edges.push({ from: sourceNodeId, to: dashboardId, type: 'data' });
    }
  }

  private processSource(
    source: any,
    nodes: Map<string, ExecutionNode>,
    edges: ExecutionEdge[],
    entryPoints: string[]
  ): void {
    const sourceId = `source:${source.name}`;
    nodes.set(sourceId, {
      id: sourceId,
      type: 'source',
      name: source.name,
      config: {
        sourceType: source.sourceType,
        url: source.url?.value,
        auth: source.auth,
        mapping: source.mapping,
        cacheDuration: source.cacheDuration?.value
      },
      dependencies: [],
      outputs: [],
      status: 'pending'
    });
    entryPoints.push(sourceId);
  }

  private processDevice(
    device: any,
    nodes: Map<string, ExecutionNode>,
    edges: ExecutionEdge[]
  ): void {
    const deviceId = `device:${device.name.value}`;
    nodes.set(deviceId, {
      id: deviceId,
      type: 'device',
      name: device.name.value,
      config: {
        deviceType: device.deviceType,
        protocol: device.protocol,
        topic: device.topic?.value,
        subscribe: device.subscribe?.map((s: any) => s.raw) || [],
        publish: device.publish?.map((p: any) => p.raw) || []
      },
      dependencies: [],
      outputs: [],
      status: 'pending'
    });

    for (const subscription of device.subscribe || []) {
      const eventPath = subscription.raw;
      const [entityOrEvent] = eventPath.split('.');
      const possibleSources = [
        `projection:${entityOrEvent}`,
        `alert:${eventPath}`,
        `pipeline:${entityOrEvent}`
      ];
      for (const sourceId of possibleSources) {
        if (nodes.has(sourceId)) {
          edges.push({ from: sourceId, to: deviceId, type: 'event' });
          break;
        }
      }
    }
  }

  private findSourceNode(inputPath: string, nodes: Map<string, ExecutionNode>): string | undefined {
    const [root] = inputPath.split('.');
    const candidates = [`source:${root}`, `entity:${root}`, `projection:${root}`, `pipeline:${root}`];
    for (const candidate of candidates) {
      if (nodes.has(candidate)) return candidate;
    }
    return undefined;
  }

  private resolveOutputNode(output: string, nodes: Map<string, ExecutionNode>): string | undefined {
    const candidates = [`dashboard:${output}`, `device:${output}`, `alert:${output}`, output];
    for (const candidate of candidates) {
      if (nodes.has(candidate)) return candidate;
    }
    return undefined;
  }

  private resolveImplicitDependencies(nodes: Map<string, ExecutionNode>, edges: ExecutionEdge[]): void {
    for (const [nodeId, node] of nodes) {
      if (node.dependencies.length === 0 && node.type !== 'source') {
        const incomingEdges = edges.filter(e => e.to === nodeId);
        for (const edge of incomingEdges) {
          if (!node.dependencies.includes(edge.from)) {
            node.dependencies.push(edge.from);
          }
        }
      }
    }
  }

  private topologicalSort(graph: ExecutionGraph): ExecutionStage[] {
    const stages: ExecutionStage[] = [];
    const nodeToStage = new Map<string, number>();

    const calculateStage = (nodeId: string): number => {
      if (nodeToStage.has(nodeId)) return nodeToStage.get(nodeId)!;
      const node = graph.nodes.get(nodeId);
      if (!node) return 0;
      if (node.dependencies.length === 0) {
        nodeToStage.set(nodeId, 0);
        return 0;
      }
      let maxDependencyStage = -1;
      for (const depId of node.dependencies) {
        if (graph.nodes.has(depId)) {
          maxDependencyStage = Math.max(maxDependencyStage, calculateStage(depId));
        }
      }
      const stage = maxDependencyStage + 1;
      nodeToStage.set(nodeId, stage);
      return stage;
    };

    for (const nodeId of graph.nodes.keys()) calculateStage(nodeId);

    const stageGroups = new Map<number, string[]>();
    for (const [nodeId, stage] of nodeToStage) {
      if (!stageGroups.has(stage)) stageGroups.set(stage, []);
      stageGroups.get(stage)!.push(nodeId);
    }

    const sortedStages = Array.from(stageGroups.keys()).sort((a, b) => a - b);
    for (const stageNum of sortedStages) {
      const nodes = stageGroups.get(stageNum)!;
      stages.push({ order: stageNum, nodes, parallel: nodes.length > 1 });
    }

    return stages;
  }

  private serializeCondition(condition: any): string {
    if (!condition) return '';
    switch (condition.type) {
      case 'BinaryExpression':
        return `${this.serializeCondition(condition.left)} ${condition.operator} ${this.serializeCondition(condition.right)}`;
      case 'DotPath':
        return condition.raw;
      case 'NumberLiteral':
        return String(condition.value);
      case 'StringLiteral':
        return `"${condition.value}"`;
      case 'BooleanLiteral':
        return String(condition.value);
      default:
        return JSON.stringify(condition);
    }
  }

  private computeHash(nodes: Map<string, ExecutionNode>, edges: ExecutionEdge[]): string {
    const data = JSON.stringify({ nodes: Array.from(nodes.entries()), edges });
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private estimateDuration(stages: ExecutionStage[]): number {
    return stages.length * 100;
  }
}

// ============================================================================
// GRAPH EXECUTOR
// ============================================================================

export type NodeExecutor = (node: ExecutionNode, context: ExecutionContext) => Promise<{ data?: any }>;

export interface ExecutionContext {
  data: Map<string, any>;
  errors: { nodeId: string; error: string }[];
}

export interface ExecutionResult {
  success: boolean;
  results: NodeResult[];
  errors: { nodeId: string; error: string }[];
}

export interface NodeResult {
  nodeId: string;
  status: NodeStatus;
  data?: any;
  error?: string;
}

export class GraphExecutor {
  private handlers: Map<NodeType, NodeExecutor> = new Map();

  registerHandler(type: NodeType, executor: NodeExecutor): void {
    this.handlers.set(type, executor);
  }

  async execute(plan: ExecutionPlan): Promise<ExecutionResult> {
    const results: NodeResult[] = [];
    const context: ExecutionContext = { data: new Map(), errors: [] };

    for (const stage of plan.stages) {
      const stageResults = await this.executeStage(stage, plan.graph, context);
      results.push(...stageResults);
      if (stageResults.some(r => r.status === 'failed')) break;
    }

    return { success: context.errors.length === 0, results, errors: context.errors };
  }

  private async executeStage(stage: ExecutionStage, graph: ExecutionGraph, context: ExecutionContext): Promise<NodeResult[]> {
    if (stage.parallel) {
      return Promise.all(stage.nodes.map(nodeId => this.executeNode(nodeId, graph, context)));
    }
    const results: NodeResult[] = [];
    for (const nodeId of stage.nodes) {
      results.push(await this.executeNode(nodeId, graph, context));
    }
    return results;
  }

  private async executeNode(nodeId: string, graph: ExecutionGraph, context: ExecutionContext): Promise<NodeResult> {
    const node = graph.nodes.get(nodeId);
    if (!node) return { nodeId, status: 'failed', error: 'Node not found' };

    const handler = this.handlers.get(node.type);
    if (!handler) return { nodeId, status: 'failed', error: `No handler for type: ${node.type}` };

    try {
      node.status = 'running';
      const result = await handler(node, context);
      node.status = 'completed';
      if (result.data) context.data.set(nodeId, result.data);
      return { nodeId, status: 'completed', data: result.data };
    } catch (error: any) {
      node.status = 'failed';
      context.errors.push({ nodeId, error: error.message });
      return { nodeId, status: 'failed', error: error.message };
    }
  }
}

export function createPlanner(): ExecutionPlanner {
  return new ExecutionPlanner();
}

export function createExecutor(): GraphExecutor {
  return new GraphExecutor();
}
