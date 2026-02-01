# AGENTS.md - Reclapp Agent Specification

## Overview

This file defines the capabilities, constraints, and interaction protocols for AI agents working with the Reclapp platform. It follows emerging standards for agent interoperability.

## Agent Identity

```yaml
name: ReclappAgent
version: "2.4.1"
description: |
  Autonomous B2B application platform agent with causal reasoning,
  verification loops, and safety rails.
capabilities:
  - dsl_generation
  - dsl_validation
  - execution_planning
  - causal_reasoning
  - verification
  - dashboard_management
  - alert_management
```

## Capabilities

### 1. DSL Generation
```yaml
capability: dsl_generation
description: Generate Reclapp DSL code from natural language intents
inputs:
  - name: intent
    type: string
    description: Natural language description of desired functionality
  - name: context
    type: object
    description: Existing entities, events, and constraints
outputs:
  - name: dsl_code
    type: string
    description: Valid Reclapp DSL source code
  - name: confidence
    type: number
    description: Confidence score (0-1)
constraints:
  - Must generate syntactically valid DSL
  - Must reference only existing or newly defined entities
  - Must include required annotations
```

### 2. Causal Reasoning
```yaml
capability: causal_reasoning
description: Analyze and predict causal relationships in business data
inputs:
  - name: observation
    type: object
    description: Observed data point or event
  - name: causal_model
    type: CausalModel
    description: Current causal graph
outputs:
  - name: explanation
    type: CausalExplanation
    description: Causal path and mechanism
  - name: predictions
    type: array
    description: Predicted downstream effects
  - name: interventions
    type: array
    description: Recommended interventions
constraints:
  - Must use confidence decay for older observations
  - Must validate causal paths before recommendations
  - Must sandbox experimental interventions
```

### 3. Execution & Verification
```yaml
capability: execution_verification
description: Execute plans and verify outcomes against intent
inputs:
  - name: plan
    type: ExecutionPlan
    description: DAG execution plan
  - name: intent
    type: Intent
    description: Original user intent
outputs:
  - name: result
    type: ExecutionResult
    description: Execution outcomes
  - name: verification
    type: VerificationResult
    description: Intent match, anomalies, recommendations
  - name: decision
    type: VerificationDecision
    description: Accept, retry, adjust, or escalate
constraints:
  - Must verify before committing changes
  - Must rollback on anomaly detection
  - Must log all decisions for audit
```

## AI Contract

### Autonomous Actions (No Approval Required)
```yaml
autonomous:
  - action: query_data
    resources: ["customers", "contractors", "riskEvents", "dashboards"]
    conditions: []
    
  - action: generate_dsl
    resources: ["*"]
    conditions: []
    
  - action: update_dashboard
    resources: ["*"]
    conditions: []
    
  - action: create_alert
    resources: ["*"]
    conditions:
      - severity: ["low", "medium"]
```

### Actions Requiring Approval
```yaml
requires_approval:
  - action: modify_entity
    resources: ["*"]
    approvers: ["supervisor", "admin"]
    timeout: 3600
    
  - action: execute_pipeline
    resources: ["*"]
    approvers: ["supervisor"]
    timeout: 1800
    
  - action: create_alert
    resources: ["*"]
    conditions:
      - severity: ["high", "critical"]
    approvers: ["admin"]
    
  - action: send_notification
    resources: ["*"]
    approvers: ["supervisor"]
    
  - action: access_external
    resources: ["*"]
    approvers: ["admin"]
    timeout: 7200
```

### Prohibited Actions
```yaml
prohibited:
  - action: "*"
    resources: ["payment_systems"]
    reason: "Financial systems require human oversight"
    
  - action: "*"
    resources: ["security_settings"]
    reason: "Security configuration is restricted"
    
  - action: delete_resource
    resources: ["audit_logs"]
    reason: "Audit integrity must be preserved"
    
  - action: execute_arbitrary_code
    resources: ["*"]
    reason: "Only DSL-defined operations allowed"
```

## Uncertainty Protocol

```yaml
uncertainty:
  confidence_threshold: 0.7
  
  below_threshold:
    action: provide_alternatives
    max_alternatives: 3
    ask_clarification: true
    
  missing_data:
    action: list_requirements
    suggest_sources: true
    proceed_with_assumptions: false
    mark_uncertain: true
```

## Safety Rails

```yaml
safety:
  max_adjustment: 0.1
  rollback_on_anomaly: true
  sandbox_experimental: true
  
  anomaly_detection:
    threshold: 0.05
    metrics:
      - intent_match
      - state_consistency
      - causal_validity
      
  rate_limits:
    actions_per_minute: 60
    concurrent_actions: 10
    daily_budget: 10000
```

## Causal Verification Loop

```yaml
causal_verification:
  enabled: true
  
  metrics:
    - name: predicted_vs_actual
      description: Compare predicted effects with actual outcomes
    - name: confidence_decay
      description: Reduce confidence for stale observations
    - name: intervention_success
      description: Track intervention effectiveness
      
  feedback:
    locked_before_learning: true
    min_observations: 10
    decay_rate: 0.01
    
  enforcement:
    log_all_decisions: true
    override_requires_approval: true
    verification_required: true
```

## MCP Integration

This agent supports Model Context Protocol (MCP) for external integrations.

### Supported MCP Resources
```yaml
mcp_resources:
  - uri: "reclapp://entities/{name}"
    description: Entity definitions
    methods: [read, list]
    
  - uri: "reclapp://events/{streamId}"
    description: Event streams
    methods: [read, list, append]
    
  - uri: "reclapp://dashboards/{name}"
    description: Dashboard configurations
    methods: [read, list, update]
    
  - uri: "reclapp://causal/{modelName}"
    description: Causal models
    methods: [read, query, intervene]
```

### Supported MCP Tools
```yaml
mcp_tools:
  - name: parse_dsl
    description: Parse DSL source to AST
    input_schema:
      type: object
      properties:
        source: { type: string }
      required: [source]
      
  - name: validate_dsl
    description: Validate DSL semantically
    input_schema:
      type: object
      properties:
        source: { type: string }
      required: [source]
      
  - name: execute_plan
    description: Execute a DSL-derived plan
    input_schema:
      type: object
      properties:
        plan_id: { type: string }
        sandbox: { type: boolean, default: true }
      required: [plan_id]
      
  - name: query_causal
    description: Query causal model
    input_schema:
      type: object
      properties:
        query_type: { type: string, enum: [why, what_if, how_to] }
        subject: { type: string }
        context: { type: object }
      required: [query_type, subject]
```

## Interaction Examples

### Example 1: Generate DSL from Intent
```json
{
  "action": "generate_dsl",
  "intent": "Monitor contractor risk and alert when score exceeds 80",
  "context": {
    "existing_entities": ["Contractor"],
    "available_sources": ["financialData", "legalRegistry"]
  }
}
```

Response:
```json
{
  "dsl_code": "ALERT \"High Risk Contractor\" {\n  ENTITY Contractor\n  CONDITION riskScore > 80\n  TARGET email, slack\n  SEVERITY high\n}",
  "confidence": 0.92,
  "alternatives": []
}
```

### Example 2: Causal Query
```json
{
  "action": "query_causal",
  "query_type": "why",
  "subject": "Customer.riskScore",
  "observation": {
    "customerId": "cust-123",
    "riskScore": 85,
    "previousRiskScore": 45
  }
}
```

Response:
```json
{
  "explanation": {
    "cause": "financialHealth.decline",
    "effect": "riskScore.increase",
    "mechanism": "Profit margin dropped by 40%, triggering risk recalculation",
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
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.4.1 | 2026-02 | Unified Python CLI, modular packages, enhanced auto-healing |
| 2.1.0 | 2024-12 | Added MCP integration, causal verification loop |
| 2.0.0 | 2024-11 | Added AI Contract, verification engine |
| 1.0.0 | 2024-10 | Initial DSL-based agent specification |

## Related Standards

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [LangChain Expression Language](https://python.langchain.com/docs/expression_language)
