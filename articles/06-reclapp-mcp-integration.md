# Reclapp 2.1: MCP Integration - Model Context Protocol dla AI Agentów

**Status:** ✅ Zaimplementowane | **Wersja:** 2.4.1 | **Data:** Grudzień 2024

## Wprowadzenie

Reclapp 2.1 implementuje **Model Context Protocol (MCP)** - otwarty standard wprowadzony pod koniec 2024 roku, który stał się kluczowy dla integracji AI z zewnętrznymi systemami. MCP pozwala na:

- Bezpieczne połączenie AI z repozytoriami danych
- Standaryzowany dostęp do narzędzi biznesowych
- Interoperacyjność między różnymi systemami AI
- Zgodność z AGENTS.md i innymi standardami agentic workflow

## Architektura MCP w Reclapp

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP CLIENT (LLM)                            │
│  Claude, GPT, Llama, etc.                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ JSON-RPC 2.0
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RECLAPP MCP SERVER                             │
├─────────────────────────────────────────────────────────────────┤
│  RESOURCES              │  TOOLS                │  PROMPTS       │
│  ─────────────────────  │  ──────────────────── │  ───────────── │
│  reclapp://entities/*   │  parse_dsl           │  analyze_risk  │
│  reclapp://events/*     │  validate_dsl        │  suggest_int.  │
│  reclapp://dashboards/* │  build_plan          │  generate_rep. │
│  reclapp://causal/*     │  execute_plan        │                │
│                         │  query_causal        │                │
│                         │  generate_dsl        │                │
│                         │  verify_action       │                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RECLAPP CORE                                  │
│  Event Store │ CQRS │ Planner │ Contracts │ Causal Loop         │
└─────────────────────────────────────────────────────────────────┘
```

## MCP Resources

Reclapp eksponuje następujące zasoby przez MCP:

### Entities
```
URI: reclapp://entities/{name}
```

```json
{
  "uri": "reclapp://entities/Customer",
  "name": "Customer",
  "mimeType": "application/json",
  "contents": {
    "name": "Customer",
    "fields": [
      { "name": "id", "type": "UUID", "annotations": ["@generated"] },
      { "name": "riskScore", "type": "Int", "min": 0, "max": 100 }
    ],
    "causalInfluences": [...],
    "interventions": [...]
  }
}
```

### Event Streams
```
URI: reclapp://events/{streamId}
```

```json
{
  "uri": "reclapp://events/customer-123",
  "events": [
    { "type": "CustomerCreated", "data": {...}, "timestamp": "2024-12-31T..." },
    { "type": "RiskScoreUpdated", "data": { "newScore": 75 }, "timestamp": "..." }
  ],
  "position": 42
}
```

### Dashboards
```
URI: reclapp://dashboards/{name}
```

### Causal Models
```
URI: reclapp://causal/{modelName}
```

```json
{
  "uri": "reclapp://causal/b2b-risk",
  "name": "B2B Risk Model",
  "nodes": [
    { "id": "financialHealth", "type": "observable" },
    { "id": "riskScore", "type": "outcome" }
  ],
  "edges": [
    { "from": "financialHealth", "to": "riskScore", "strength": -0.3 }
  ],
  "interventions": [...]
}
```

## MCP Tools

### parse_dsl
Parsuje kod DSL do AST.

```json
{
  "name": "parse_dsl",
  "input": { "source": "ENTITY Customer { FIELD id: UUID }" },
  "output": {
    "success": true,
    "ast": { "type": "Program", "statements": [...] }
  }
}
```

### validate_dsl
Waliduje DSL semantycznie.

```json
{
  "name": "validate_dsl",
  "input": { "source": "ENTITY Customer {...}" },
  "output": {
    "valid": true,
    "errors": [],
    "warnings": [{ "code": "W101", "message": "Missing ID field" }]
  }
}
```

### build_plan
Buduje plan wykonania z DSL.

```json
{
  "name": "build_plan",
  "input": { "source": "PIPELINE RiskAnalysis {...}" },
  "output": {
    "planId": "plan_1735654321_abc123",
    "stages": [
      { "order": 0, "nodes": ["fetch"], "parallel": false },
      { "order": 1, "nodes": ["transform", "enrich"], "parallel": true }
    ],
    "estimatedDuration": 5000
  }
}
```

### execute_plan
Wykonuje plan z weryfikacją.

```json
{
  "name": "execute_plan",
  "input": {
    "planId": "plan_1735654321_abc123",
    "sandbox": true,
    "intent": {
      "description": "Analyze customer risk",
      "expectedOutcomes": [{ "type": "data", "target": "riskScore" }]
    }
  },
  "output": {
    "success": true,
    "results": [...],
    "verification": {
      "intentMatch": 0.95,
      "decision": { "action": "accept", "confidence": 0.9 }
    }
  }
}
```

### query_causal
Odpytuje model przyczynowy.

```json
{
  "name": "query_causal",
  "input": {
    "queryType": "why",
    "subject": "Customer.riskScore",
    "observation": {
      "customerId": "cust-123",
      "riskScore": 85,
      "previousRiskScore": 45
    }
  },
  "output": {
    "explanation": {
      "cause": "financialHealth.decline",
      "effect": "riskScore.increase",
      "mechanism": "Profit margin dropped by 40%",
      "path": ["financialHealth", "paymentCapability", "riskScore"],
      "confidence": 0.78
    },
    "interventions": [
      {
        "name": "requestBankGuarantee",
        "expectedEffect": { "riskScore": -25 },
        "confidence": 0.85
      }
    ]
  }
}
```

### generate_dsl
Generuje DSL z intencji w języku naturalnym.

```json
{
  "name": "generate_dsl",
  "input": {
    "intent": "Monitor contractor risk and alert when score exceeds 80",
    "context": {
      "existingEntities": ["Contractor"],
      "availableSources": ["financialData", "legalRegistry"]
    }
  },
  "output": {
    "dslCode": "ALERT \"High Risk Contractor\" {\n  ENTITY Contractor\n  CONDITION riskScore > 80\n  TARGET email, slack\n  SEVERITY high\n}",
    "confidence": 0.92,
    "alternatives": []
  }
}
```

### verify_action
Sprawdza czy akcja jest dozwolona przez AI Contract.

```json
{
  "name": "verify_action",
  "input": {
    "actionType": "modify_entity",
    "target": "customers",
    "parameters": { "action": "update_credit_limit" },
    "confidence": 0.85
  },
  "output": {
    "allowed": true,
    "requiresApproval": true,
    "reason": "Action requires human approval per AI Contract"
  }
}
```

## MCP Prompts

### analyze_risk
```json
{
  "name": "analyze_risk",
  "arguments": [
    { "name": "entityType", "value": "Customer" },
    { "name": "entityId", "value": "cust-123" }
  ],
  "result": {
    "messages": [{
      "role": "user",
      "content": "Analyze the risk profile for Customer with ID cust-123. Consider financial health, payment history, legal status, and market conditions. Provide risk score, contributing factors, and recommended actions."
    }]
  }
}
```

### suggest_intervention
```json
{
  "name": "suggest_intervention",
  "arguments": [
    { "name": "entityId", "value": "cust-123" },
    { "name": "targetMetric", "value": "riskScore" }
  ]
}
```

### generate_report
```json
{
  "name": "generate_report",
  "arguments": [
    { "name": "reportType", "value": "monthly_risk_summary" },
    { "name": "timeframe", "value": "2024-12" }
  ]
}
```

## Implementacja Serwera MCP

```typescript
import { ReclappMCPServer, createMCPServer } from '@reclapp/core/mcp';

// Tworzenie serwera
const server = createMCPServer();

// Obsługa request (JSON-RPC 2.0)
async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  return server.handleRequest(request);
}

// Przykład: HTTP endpoint
app.post('/mcp', async (req, res) => {
  const response = await handleRequest(req.body);
  res.json(response);
});

// Przykład: WebSocket
ws.on('message', async (data) => {
  const request = JSON.parse(data);
  const response = await handleRequest(request);
  ws.send(JSON.stringify(response));
});
```

## Rozszerzanie Serwera MCP

### Dodawanie własnych narzędzi

```typescript
server.registerTool({
  name: 'custom_analysis',
  description: 'Run custom risk analysis',
  inputSchema: {
    type: 'object',
    properties: {
      entityId: { type: 'string' },
      analysisType: { type: 'string', enum: ['quick', 'deep'] }
    },
    required: ['entityId']
  },
  handler: async (params) => {
    // Implementacja
    return { score: 75, factors: [...] };
  }
});
```

### Dodawanie własnych zasobów

```typescript
server.registerResource({
  uriPattern: /^reclapp:\/\/custom\/(.+)$/,
  list: async () => [...],
  read: async (uri) => {...}
});
```

## AGENTS.md Integration

Reclapp zawiera plik `AGENTS.md` definiujący capabilities dla innych systemów:

```yaml
# AGENTS.md - Reclapp Agent Specification

name: ReclappAgent
version: "2.4.1"
capabilities:
  - dsl_generation
  - dsl_validation
  - execution_planning
  - causal_reasoning
  - verification

mcp_resources:
  - uri: "reclapp://entities/{name}"
    methods: [read, list]
  - uri: "reclapp://events/{streamId}"
    methods: [read, list, append]
  - uri: "reclapp://causal/{modelName}"
    methods: [read, query, intervene]

mcp_tools:
  - name: parse_dsl
  - name: validate_dsl
  - name: execute_plan
  - name: query_causal
  - name: verify_action
```

## Bezpieczeństwo

### Rate Limiting
```typescript
// Konfiguracja w kontrakcie
rateLimits: {
  actionsPerMinute: 60,
  actionsPerHour: 1000,
  concurrentActions: 10
}
```

### Permission Checking
Każde wywołanie tool/resource jest weryfikowane przez AI Contract:

```typescript
// Przed wykonaniem narzędzia
const permitted = await contractEnforcer.evaluateAction({
  action: 'query_data',
  target: resource,
  confidence: 0.9
});

if (!permitted.allowed) {
  return { error: 'Permission denied' };
}
```

### Audit Logging
```typescript
// Każda operacja MCP jest logowana
auditLog.push({
  timestamp: new Date(),
  method: request.method,
  params: request.params,
  result: response.result,
  clientId: clientContext.id
});
```

## Kompatybilność

Reclapp MCP Server jest kompatybilny z:

- **Claude Desktop** - pełna integracja
- **OpenAI Assistants** - przez adapter
- **LangChain** - przez MCP provider
- **Dify** - natywna integracja
- **Inne systemy** - JSON-RPC 2.0 standard

## Przykład: Pełny Flow

```
1. Claude: "Przeanalizuj ryzyko klienta ABC"

2. MCP Request:
   { "method": "tools/call", "params": { "name": "query_causal", ... } }

3. Reclapp Server:
   - Sprawdza uprawnienia (AI Contract)
   - Wykonuje query na modelu przyczynowym
   - Loguje do audytu
   - Zwraca wynik

4. MCP Response:
   {
     "explanation": { "cause": "paymentDelays", "effect": "riskIncrease" },
     "interventions": [{ "name": "shortenTerms", "confidence": 0.8 }]
   }

5. Claude: "Ryzyko wzrosło z powodu opóźnień płatniczych. 
            Rekomenduję skrócenie terminów płatności."
```

## Uruchomienie

```bash
# Standalone MCP server
npm run mcp:server

# Zintegrowany z API
npm run dev
# MCP endpoint: http://localhost:8080/mcp
```

## Następne Kroki

- [ ] MCP over stdio (dla Claude Desktop)
- [ ] MCP discovery endpoint
- [ ] Subscription support (real-time updates)
- [ ] Multi-tenant MCP
- [ ] MCP authentication (OAuth2)

---

**Reclapp MCP Integration** zapewnia standardowy, bezpieczny i rozszerzalny interfejs dla AI agentów, łącząc możliwości platformy z ekosystemem narzędzi AI.
