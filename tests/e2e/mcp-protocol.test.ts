/**
 * E2E Test: MCP Protocol Integration
 * 
 * Tests the Model Context Protocol implementation:
 * - Server initialization
 * - Resource listing and reading
 * - Tool execution
 * - Prompt handling
 * - Error handling
 */

import {
  ReclappMCPServer,
  createMCPServer,
  MCPRequest,
  MCPResponse,
  MCPResource,
  MCPTool,
  MCPErrorCodes
} from '../../core/mcp';

// ============================================================================
// MCP SERVER CREATION TESTS
// ============================================================================

describe('E2E: MCP Protocol', () => {
  let server: ReclappMCPServer;

  beforeEach(() => {
    server = createMCPServer();
  });

  describe('Server Initialization', () => {
    it('should create MCP server', () => {
      expect(server).toBeDefined();
    });

    it('should handle initialize request', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      };

      const response = await server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.result.protocolVersion).toBeDefined();
      expect(response.result.serverInfo).toBeDefined();
      expect(response.result.serverInfo.name).toBe('reclapp-mcp-server');
      expect(response.result.capabilities).toBeDefined();
    });

    it('should return server capabilities', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      };

      const response = await server.handleRequest(request);

      expect(response.result.capabilities.resources).toBeDefined();
      expect(response.result.capabilities.tools).toBeDefined();
      expect(response.result.capabilities.prompts).toBeDefined();
    });
  });

  // ==========================================================================
  // RESOURCE TESTS
  // ==========================================================================

  describe('Resources', () => {
    describe('resources/list', () => {
      it('should list available resources', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'resources/list',
          params: {}
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.resources).toBeDefined();
        expect(Array.isArray(response.result.resources)).toBe(true);
        expect(response.result.resources.length).toBeGreaterThan(0);
      });

      it('should include entity resources', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 3,
          method: 'resources/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const resources: MCPResource[] = response.result.resources;

        const entityResource = resources.find(r => r.uri.includes('entities'));
        expect(entityResource).toBeDefined();
      });

      it('should include event resources', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 4,
          method: 'resources/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const resources: MCPResource[] = response.result.resources;

        const eventResource = resources.find(r => r.uri.includes('events'));
        expect(eventResource).toBeDefined();
      });

      it('should include dashboard resources', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 5,
          method: 'resources/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const resources: MCPResource[] = response.result.resources;

        const dashboardResource = resources.find(r => r.uri.includes('dashboards'));
        expect(dashboardResource).toBeDefined();
      });

      it('should include causal model resources', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 6,
          method: 'resources/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const resources: MCPResource[] = response.result.resources;

        const causalResource = resources.find(r => r.uri.includes('causal'));
        expect(causalResource).toBeDefined();
      });
    });

    describe('resources/read', () => {
      it('should read entity resource', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 7,
          method: 'resources/read',
          params: { uri: 'reclapp://entities/Customer' }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.contents).toBeDefined();
        expect(Array.isArray(response.result.contents)).toBe(true);
      });

      it('should return error for missing URI', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 8,
          method: 'resources/read',
          params: {}
        };

        const response = await server.handleRequest(request);

        expect(response.error).toBeDefined();
        expect(response.error?.code).toBe(MCPErrorCodes.INVALID_PARAMS);
      });

      it('should return error for unknown resource', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 9,
          method: 'resources/read',
          params: { uri: 'reclapp://unknown/resource' }
        };

        const response = await server.handleRequest(request);

        expect(response.error).toBeDefined();
        expect(response.error?.code).toBe(MCPErrorCodes.RESOURCE_NOT_FOUND);
      });
    });
  });

  // ==========================================================================
  // TOOL TESTS
  // ==========================================================================

  describe('Tools', () => {
    describe('tools/list', () => {
      it('should list available tools', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/list',
          params: {}
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.tools).toBeDefined();
        expect(Array.isArray(response.result.tools)).toBe(true);
        expect(response.result.tools.length).toBeGreaterThan(0);
      });

      it('should include parse_dsl tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const tools: MCPTool[] = response.result.tools;

        const parseTool = tools.find(t => t.name === 'parse_dsl');
        expect(parseTool).toBeDefined();
        expect(parseTool?.inputSchema).toBeDefined();
      });

      it('should include validate_dsl tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 12,
          method: 'tools/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const tools: MCPTool[] = response.result.tools;

        const validateTool = tools.find(t => t.name === 'validate_dsl');
        expect(validateTool).toBeDefined();
      });

      it('should include execute_plan tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 13,
          method: 'tools/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const tools: MCPTool[] = response.result.tools;

        const executeTool = tools.find(t => t.name === 'execute_plan');
        expect(executeTool).toBeDefined();
      });

      it('should include query_causal tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 14,
          method: 'tools/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const tools: MCPTool[] = response.result.tools;

        const causalTool = tools.find(t => t.name === 'query_causal');
        expect(causalTool).toBeDefined();
      });

      it('should include verify_action tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 15,
          method: 'tools/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const tools: MCPTool[] = response.result.tools;

        const verifyTool = tools.find(t => t.name === 'verify_action');
        expect(verifyTool).toBeDefined();
      });
    });

    describe('tools/call', () => {
      it('should call parse_dsl tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 16,
          method: 'tools/call',
          params: {
            name: 'parse_dsl',
            arguments: { source: 'ENTITY Customer { FIELD id: UUID }' }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
        expect(Array.isArray(response.result.content)).toBe(true);
      });

      it('should call validate_dsl tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 17,
          method: 'tools/call',
          params: {
            name: 'validate_dsl',
            arguments: { source: 'ENTITY Customer { FIELD id: UUID }' }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
      });

      it('should call build_plan tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 18,
          method: 'tools/call',
          params: {
            name: 'build_plan',
            arguments: { source: 'PIPELINE Test { INPUT data OUTPUT result }' }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
      });

      it('should call execute_plan tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 19,
          method: 'tools/call',
          params: {
            name: 'execute_plan',
            arguments: { planId: 'test-plan-1', sandbox: true }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
      });

      it('should call query_causal tool with why query', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 20,
          method: 'tools/call',
          params: {
            name: 'query_causal',
            arguments: {
              queryType: 'why',
              subject: 'Customer.riskScore',
              observation: { riskScore: 85, previousRiskScore: 45 }
            }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
      });

      it('should call query_causal tool with what_if query', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 21,
          method: 'tools/call',
          params: {
            name: 'query_causal',
            arguments: {
              queryType: 'what_if',
              subject: 'Customer.riskScore',
              intervention: { creditLimit: -5000 }
            }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
      });

      it('should call generate_dsl tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 22,
          method: 'tools/call',
          params: {
            name: 'generate_dsl',
            arguments: {
              intent: 'Monitor customer risk and alert when score exceeds 80',
              context: { existingEntities: ['Customer'] }
            }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
      });

      it('should call verify_action tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 23,
          method: 'tools/call',
          params: {
            name: 'verify_action',
            arguments: {
              actionType: 'modify_entity',
              target: 'customers',
              parameters: { action: 'update' },
              confidence: 0.85
            }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
      });

      it('should return error for unknown tool', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 24,
          method: 'tools/call',
          params: {
            name: 'nonexistent_tool',
            arguments: {}
          }
        };

        const response = await server.handleRequest(request);

        expect(response.error).toBeDefined();
        expect(response.error?.code).toBe(MCPErrorCodes.METHOD_NOT_FOUND);
      });
    });
  });

  // ==========================================================================
  // PROMPT TESTS
  // ==========================================================================

  describe('Prompts', () => {
    describe('prompts/list', () => {
      it('should list available prompts', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 25,
          method: 'prompts/list',
          params: {}
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.prompts).toBeDefined();
        expect(Array.isArray(response.result.prompts)).toBe(true);
      });

      it('should include analyze_risk prompt', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 26,
          method: 'prompts/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const prompts = response.result.prompts;

        const analyzePrompt = prompts.find((p: any) => p.name === 'analyze_risk');
        expect(analyzePrompt).toBeDefined();
        expect(analyzePrompt.arguments).toBeDefined();
      });

      it('should include suggest_intervention prompt', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 27,
          method: 'prompts/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const prompts = response.result.prompts;

        const suggestPrompt = prompts.find((p: any) => p.name === 'suggest_intervention');
        expect(suggestPrompt).toBeDefined();
      });

      it('should include generate_report prompt', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 28,
          method: 'prompts/list',
          params: {}
        };

        const response = await server.handleRequest(request);
        const prompts = response.result.prompts;

        const reportPrompt = prompts.find((p: any) => p.name === 'generate_report');
        expect(reportPrompt).toBeDefined();
      });
    });

    describe('prompts/get', () => {
      it('should get analyze_risk prompt', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 29,
          method: 'prompts/get',
          params: {
            name: 'analyze_risk',
            arguments: { entityType: 'Customer', entityId: 'cust-123' }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.messages).toBeDefined();
        expect(Array.isArray(response.result.messages)).toBe(true);
      });

      it('should get suggest_intervention prompt', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 30,
          method: 'prompts/get',
          params: {
            name: 'suggest_intervention',
            arguments: { entityId: 'cust-123', targetMetric: 'riskScore' }
          }
        };

        const response = await server.handleRequest(request);

        expect(response.result).toBeDefined();
        expect(response.result.messages).toBeDefined();
      });

      it('should return error for unknown prompt', async () => {
        const request: MCPRequest = {
          jsonrpc: '2.0',
          id: 31,
          method: 'prompts/get',
          params: {
            name: 'nonexistent_prompt',
            arguments: {}
          }
        };

        const response = await server.handleRequest(request);

        expect(response.error).toBeDefined();
        expect(response.error?.code).toBe(MCPErrorCodes.METHOD_NOT_FOUND);
      });
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle unknown method', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 32,
        method: 'unknown/method',
        params: {}
      };

      const response = await server.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(MCPErrorCodes.METHOD_NOT_FOUND);
      expect(response.error?.message).toContain('unknown/method');
    });

    it('should preserve request ID in response', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'custom-id-123',
        method: 'initialize',
        params: {}
      };

      const response = await server.handleRequest(request);

      expect(response.id).toBe('custom-id-123');
    });

    it('should return JSON-RPC 2.0 format', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 33,
        method: 'initialize',
        params: {}
      };

      const response = await server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
    });
  });

  // ==========================================================================
  // INTEGRATION TEST
  // ==========================================================================

  describe('Full Integration', () => {
    it('should complete full MCP workflow', async () => {
      // 1. Initialize
      const initResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 100,
        method: 'initialize',
        params: {}
      });
      expect(initResponse.result.serverInfo.name).toBe('reclapp-mcp-server');

      // 2. List resources
      const resourcesResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 101,
        method: 'resources/list',
        params: {}
      });
      expect(resourcesResponse.result.resources.length).toBeGreaterThan(0);

      // 3. List tools
      const toolsResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 102,
        method: 'tools/list',
        params: {}
      });
      expect(toolsResponse.result.tools.length).toBeGreaterThan(0);

      // 4. Call a tool
      const toolCallResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 103,
        method: 'tools/call',
        params: {
          name: 'verify_action',
          arguments: {
            actionType: 'query_data',
            target: 'customers',
            confidence: 0.9
          }
        }
      });
      expect(toolCallResponse.result).toBeDefined();

      // 5. Get a prompt
      const promptResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 104,
        method: 'prompts/get',
        params: {
          name: 'analyze_risk',
          arguments: { entityType: 'Customer', entityId: 'test-123' }
        }
      });
      expect(promptResponse.result.messages).toBeDefined();
    });
  });
});
