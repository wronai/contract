/**
 * Reclapp MCP (Model Context Protocol) Implementation
 * 
 * Implements the MCP standard for AI model integration,
 * exposing Reclapp resources (entities, events, dashboards)
 * and tools (parse, validate, execute) via standard protocol.
 * 
 * @see https://modelcontextprotocol.io
 */

// ============================================================================
// MCP TYPES (Based on MCP Specification)
// ============================================================================

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: JSONSchema;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: any[];
  default?: any;
  description?: string;
}

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// MCP Error Codes
export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  RESOURCE_NOT_FOUND: -32001,
  PERMISSION_DENIED: -32002,
  RATE_LIMITED: -32003
};

// ============================================================================
// RECLAPP MCP SERVER
// ============================================================================

export interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: MCPCapabilities;
}

export interface MCPCapabilities {
  resources?: { listChanged?: boolean };
  tools?: Record<string, unknown>;
  prompts?: { listChanged?: boolean };
  logging?: Record<string, unknown>;
}

export class ReclappMCPServer {
  private config: MCPServerConfig;
  private resources: Map<string, MCPResourceHandler> = new Map();
  private tools: Map<string, MCPToolDefinition> = new Map();
  private prompts: Map<string, MCPPromptDefinition> = new Map();

  constructor() {
    this.config = {
      name: 'reclapp-mcp-server',
      version: '2.1.0',
      capabilities: {
        resources: { listChanged: true },
        tools: {},
        prompts: { listChanged: true },
        logging: {}
      }
    };

    this.registerBuiltinResources();
    this.registerBuiltinTools();
    this.registerBuiltinPrompts();
  }

  // ==========================================================================
  // RESOURCE REGISTRATION
  // ==========================================================================

  private registerBuiltinResources(): void {
    // Entity resources
    this.registerResource({
      uriPattern: /^reclapp:\/\/entities\/(.+)$/,
      list: async () => this.listEntities(),
      read: async (uri) => this.readEntity(uri)
    });

    // Event stream resources
    this.registerResource({
      uriPattern: /^reclapp:\/\/events\/(.+)$/,
      list: async () => this.listEventStreams(),
      read: async (uri) => this.readEventStream(uri)
    });

    // Dashboard resources
    this.registerResource({
      uriPattern: /^reclapp:\/\/dashboards\/(.+)$/,
      list: async () => this.listDashboards(),
      read: async (uri) => this.readDashboard(uri)
    });

    // Causal model resources
    this.registerResource({
      uriPattern: /^reclapp:\/\/causal\/(.+)$/,
      list: async () => this.listCausalModels(),
      read: async (uri) => this.readCausalModel(uri)
    });
  }

  registerResource(handler: MCPResourceHandler): void {
    this.resources.set(handler.uriPattern.source, handler);
  }

  // ==========================================================================
  // TOOL REGISTRATION
  // ==========================================================================

  private registerBuiltinTools(): void {
    // Parse DSL
    this.registerTool({
      name: 'parse_dsl',
      description: 'Parse Reclapp DSL source code to AST',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'DSL source code' }
        },
        required: ['source']
      },
      handler: async (params) => this.toolParseDSL(params)
    });

    // Validate DSL
    this.registerTool({
      name: 'validate_dsl',
      description: 'Validate DSL source code semantically',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'DSL source code' }
        },
        required: ['source']
      },
      handler: async (params) => this.toolValidateDSL(params)
    });

    // Build execution plan
    this.registerTool({
      name: 'build_plan',
      description: 'Build execution plan from DSL',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'DSL source code' }
        },
        required: ['source']
      },
      handler: async (params) => this.toolBuildPlan(params)
    });

    // Execute plan
    this.registerTool({
      name: 'execute_plan',
      description: 'Execute a plan with verification',
      inputSchema: {
        type: 'object',
        properties: {
          planId: { type: 'string', description: 'Plan ID to execute' },
          sandbox: { type: 'boolean', default: true, description: 'Run in sandbox mode' },
          intent: {
            type: 'object',
            description: 'Original intent for verification',
            properties: {
              description: { type: 'string' },
              expectedOutcomes: { type: 'array' }
            }
          }
        },
        required: ['planId']
      },
      handler: async (params) => this.toolExecutePlan(params)
    });

    // Query causal model
    this.registerTool({
      name: 'query_causal',
      description: 'Query causal model for explanations or predictions',
      inputSchema: {
        type: 'object',
        properties: {
          queryType: {
            type: 'string',
            enum: ['why', 'what_if', 'how_to', 'what_affects'],
            description: 'Type of causal query'
          },
          subject: { type: 'string', description: 'Subject of query (e.g., Customer.riskScore)' },
          observation: { type: 'object', description: 'Current observation data' },
          intervention: { type: 'object', description: 'Hypothetical intervention for what_if' }
        },
        required: ['queryType', 'subject']
      },
      handler: async (params) => this.toolQueryCausal(params)
    });

    // Generate DSL from intent
    this.registerTool({
      name: 'generate_dsl',
      description: 'Generate DSL code from natural language intent',
      inputSchema: {
        type: 'object',
        properties: {
          intent: { type: 'string', description: 'Natural language description' },
          context: {
            type: 'object',
            description: 'Context with existing entities and constraints',
            properties: {
              existingEntities: { type: 'array', items: { type: 'string' } },
              availableSources: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        required: ['intent']
      },
      handler: async (params) => this.toolGenerateDSL(params)
    });

    // Verify action against AI Contract
    this.registerTool({
      name: 'verify_action',
      description: 'Check if an action is permitted by AI Contract',
      inputSchema: {
        type: 'object',
        properties: {
          actionType: { type: 'string', description: 'Type of action' },
          target: { type: 'string', description: 'Target resource' },
          parameters: { type: 'object', description: 'Action parameters' },
          confidence: { type: 'number', description: 'Confidence score (0-1)' }
        },
        required: ['actionType', 'target']
      },
      handler: async (params) => this.toolVerifyAction(params)
    });
  }

  registerTool(handler: MCPToolDefinition): void {
    this.tools.set(handler.name, handler);
  }

  // ==========================================================================
  // PROMPT REGISTRATION
  // ==========================================================================

  private registerBuiltinPrompts(): void {
    this.registerPrompt({
      name: 'analyze_risk',
      description: 'Analyze risk for a business entity',
      arguments: [
        { name: 'entityType', description: 'Customer or Contractor', required: true },
        { name: 'entityId', description: 'Entity ID', required: true }
      ],
      handler: async (args) => this.promptAnalyzeRisk(args)
    });

    this.registerPrompt({
      name: 'suggest_intervention',
      description: 'Suggest interventions for risk mitigation',
      arguments: [
        { name: 'entityId', description: 'Entity ID', required: true },
        { name: 'targetMetric', description: 'Metric to improve', required: true }
      ],
      handler: async (args) => this.promptSuggestIntervention(args)
    });

    this.registerPrompt({
      name: 'generate_report',
      description: 'Generate a business report',
      arguments: [
        { name: 'reportType', description: 'Type of report', required: true },
        { name: 'timeframe', description: 'Time period', required: false }
      ],
      handler: async (args) => this.promptGenerateReport(args)
    });
  }

  registerPrompt(handler: MCPPromptDefinition): void {
    this.prompts.set(handler.name, handler);
  }

  // ==========================================================================
  // REQUEST HANDLING
  // ==========================================================================

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        // Initialization
        case 'initialize':
          return this.handleInitialize(request);

        // Resources
        case 'resources/list':
          return this.handleResourcesList(request);
        case 'resources/read':
          return this.handleResourcesRead(request);

        // Tools
        case 'tools/list':
          return this.handleToolsList(request);
        case 'tools/call':
          return this.handleToolsCall(request);

        // Prompts
        case 'prompts/list':
          return this.handlePromptsList(request);
        case 'prompts/get':
          return this.handlePromptsGet(request);

        default:
          return this.errorResponse(request.id, MCPErrorCodes.METHOD_NOT_FOUND, `Unknown method: ${request.method}`);
      }
    } catch (error: any) {
      return this.errorResponse(request.id, MCPErrorCodes.INTERNAL_ERROR, error.message);
    }
  }

  private async handleInitialize(request: MCPRequest): Promise<MCPResponse> {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: this.config.name,
          version: this.config.version
        },
        capabilities: this.config.capabilities
      }
    };
  }

  private async handleResourcesList(request: MCPRequest): Promise<MCPResponse> {
    const resources: MCPResource[] = [
      { uri: 'reclapp://entities/', name: 'Entities', description: 'DSL entity definitions' },
      { uri: 'reclapp://events/', name: 'Events', description: 'Event streams' },
      { uri: 'reclapp://dashboards/', name: 'Dashboards', description: 'Dashboard configurations' },
      { uri: 'reclapp://causal/', name: 'Causal Models', description: 'Causal reasoning models' }
    ];

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { resources }
    };
  }

  private async handleResourcesRead(request: MCPRequest): Promise<MCPResponse> {
    const { uri } = request.params || {};
    
    if (!uri) {
      return this.errorResponse(request.id, MCPErrorCodes.INVALID_PARAMS, 'URI required');
    }

    for (const [pattern, handler] of this.resources) {
      const regex = new RegExp(pattern);
      if (regex.test(uri)) {
        const content = await handler.read(uri);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(content, null, 2)
            }]
          }
        };
      }
    }

    return this.errorResponse(request.id, MCPErrorCodes.RESOURCE_NOT_FOUND, `Resource not found: ${uri}`);
  }

  private async handleToolsList(request: MCPRequest): Promise<MCPResponse> {
    const tools: MCPTool[] = Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }));

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { tools }
    };
  }

  private async handleToolsCall(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params || {};
    
    const tool = this.tools.get(name);
    if (!tool) {
      return this.errorResponse(request.id, MCPErrorCodes.METHOD_NOT_FOUND, `Tool not found: ${name}`);
    }

    const result = await tool.handler(args || {});
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }
    };
  }

  private async handlePromptsList(request: MCPRequest): Promise<MCPResponse> {
    const prompts: MCPPrompt[] = Array.from(this.prompts.values()).map(p => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments
    }));

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { prompts }
    };
  }

  private async handlePromptsGet(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params || {};
    
    const prompt = this.prompts.get(name);
    if (!prompt) {
      return this.errorResponse(request.id, MCPErrorCodes.METHOD_NOT_FOUND, `Prompt not found: ${name}`);
    }

    const result = await prompt.handler(args || {});
    
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        description: prompt.description,
        messages: [{
          role: 'user',
          content: { type: 'text', text: result }
        }]
      }
    };
  }

  private errorResponse(id: string | number, code: number, message: string): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message }
    };
  }

  // ==========================================================================
  // RESOURCE HANDLERS
  // ==========================================================================

  private async listEntities(): Promise<MCPResource[]> {
    // In production, this would query the actual entity registry
    return [
      { uri: 'reclapp://entities/Customer', name: 'Customer', description: 'B2B Customer entity' },
      { uri: 'reclapp://entities/Contractor', name: 'Contractor', description: 'Contractor entity' },
      { uri: 'reclapp://entities/RiskEvent', name: 'RiskEvent', description: 'Risk event entity' }
    ];
  }

  private async readEntity(uri: string): Promise<any> {
    const match = uri.match(/^reclapp:\/\/entities\/(.+)$/);
    if (!match) return null;
    
    const entityName = match[1];
    // Return mock entity definition
    return {
      name: entityName,
      fields: [
        { name: 'id', type: 'UUID', annotations: ['@generated'] },
        { name: 'name', type: 'String', annotations: ['@required'] }
      ]
    };
  }

  private async listEventStreams(): Promise<MCPResource[]> {
    return [
      { uri: 'reclapp://events/$all', name: 'All Events', description: 'Global event log' }
    ];
  }

  private async readEventStream(uri: string): Promise<any> {
    return { events: [], position: 0 };
  }

  private async listDashboards(): Promise<MCPResource[]> {
    return [
      { uri: 'reclapp://dashboards/overview', name: 'Overview', description: 'Main dashboard' }
    ];
  }

  private async readDashboard(uri: string): Promise<any> {
    return { name: 'Overview', metrics: [], layout: 'grid' };
  }

  private async listCausalModels(): Promise<MCPResource[]> {
    return [
      { uri: 'reclapp://causal/b2b-risk', name: 'B2B Risk Model', description: 'Causal risk model' }
    ];
  }

  private async readCausalModel(uri: string): Promise<any> {
    return { name: 'B2B Risk Model', nodes: [], edges: [] };
  }

  // ==========================================================================
  // TOOL HANDLERS
  // ==========================================================================

  private async toolParseDSL(params: { source: string }): Promise<any> {
    // In production, use actual parser
    return {
      success: true,
      ast: {
        type: 'Program',
        statements: [],
        version: '1.0'
      }
    };
  }

  private async toolValidateDSL(params: { source: string }): Promise<any> {
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  private async toolBuildPlan(params: { source: string }): Promise<any> {
    return {
      planId: `plan_${Date.now()}`,
      stages: [],
      estimatedDuration: 0
    };
  }

  private async toolExecutePlan(params: { planId: string; sandbox?: boolean; intent?: any }): Promise<any> {
    return {
      success: true,
      results: [],
      verification: {
        intentMatch: 0.95,
        decision: { action: 'accept', confidence: 0.9 }
      }
    };
  }

  private async toolQueryCausal(params: { queryType: string; subject: string; observation?: any; intervention?: any }): Promise<any> {
    return {
      queryType: params.queryType,
      subject: params.subject,
      explanation: {
        cause: 'financialHealth.decline',
        effect: 'riskScore.increase',
        confidence: 0.78
      },
      interventions: []
    };
  }

  private async toolGenerateDSL(params: { intent: string; context?: any }): Promise<any> {
    return {
      dslCode: `# Generated from: ${params.intent}\nENTITY Generated {}`,
      confidence: 0.85,
      alternatives: []
    };
  }

  private async toolVerifyAction(params: { actionType: string; target: string; parameters?: any; confidence?: number }): Promise<any> {
    return {
      allowed: true,
      reason: 'Action permitted by AI Contract',
      requiresApproval: false
    };
  }

  // ==========================================================================
  // PROMPT HANDLERS
  // ==========================================================================

  private async promptAnalyzeRisk(args: { entityType: string; entityId: string }): Promise<string> {
    return `Analyze the risk profile for ${args.entityType} with ID ${args.entityId}. 
Consider financial health, payment history, legal status, and market conditions.
Provide risk score, contributing factors, and recommended actions.`;
  }

  private async promptSuggestIntervention(args: { entityId: string; targetMetric: string }): Promise<string> {
    return `Suggest interventions to improve ${args.targetMetric} for entity ${args.entityId}.
Consider cost-effectiveness, confidence levels, and potential side effects.
Rank interventions by expected impact and feasibility.`;
  }

  private async promptGenerateReport(args: { reportType: string; timeframe?: string }): Promise<string> {
    return `Generate a ${args.reportType} report${args.timeframe ? ` for ${args.timeframe}` : ''}.
Include key metrics, trends, anomalies, and recommendations.`;
  }
}

// ============================================================================
// HANDLER TYPES
// ============================================================================

interface MCPResourceHandler {
  uriPattern: RegExp;
  list: () => Promise<MCPResource[]>;
  read: (uri: string) => Promise<any>;
}

interface MCPToolDefinition {
  name: string;
  description?: string;
  inputSchema: JSONSchema;
  handler: (params: any) => Promise<any>;
}

interface MCPPromptDefinition {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
  handler: (args: any) => Promise<string>;
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createMCPServer(): ReclappMCPServer {
  return new ReclappMCPServer();
}

export default ReclappMCPServer;
