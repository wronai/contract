# Reclapp 2.1.0 - AI-Native Declarative Platform

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/softreck/reclapp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

> **AI-Native Declarative Platform** for building autonomous B2B applications with causal reasoning, verification loops, and production-ready safety rails.

## 🌟 Key Features

- **TypeScript AI Contracts** - Fully typed, compile-time validated contracts for AI agents
- **Causal Verification Loop** - Closed-loop decision making with confidence decay
- **MCP Protocol** - Model Context Protocol integration for AI interoperability
- **Declarative DSL** - Stack-agnostic domain-specific language
- **Event Sourcing + CQRS** - Full audit trail and temporal queries
- **Safety Rails** - Sandbox, rollback, rate limiting, freeze protection

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (optional)
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/softreck/reclapp.git
cd reclapp

# Install dependencies
make install
# or
npm install

# Start development server
make dev
# or
npm run dev
```

### Using Docker

```bash
# Start all services
make docker-up

# View logs
make docker-logs

# Stop services
make docker-down
```

## 📁 Project Structure

```
reclapp/
├── contracts/           # TypeScript AI Contracts System
│   ├── types.ts         # Type definitions (450+ types)
│   ├── validator.ts     # Zod validation schemas
│   ├── executor.ts      # Runtime contract executor
│   └── examples/        # Example contracts
│
├── core/                # Core Engine
│   ├── ai-contract/     # AI Contract Enforcer
│   ├── causal/          # Causal Verification Loop
│   ├── cqrs/            # CQRS Infrastructure
│   ├── eventstore/      # Event Sourcing
│   ├── mcp/             # MCP Protocol Server
│   ├── ontology/        # Semantic-Causal Ontology
│   ├── planner/         # Execution DAG Planner
│   └── verification/    # Verification Engine
│
├── dsl/                 # DSL Parser & Validator
│   ├── grammar/         # Peggy grammar
│   ├── parser/          # Parser implementation
│   ├── ast/             # AST types
│   └── validator/       # Semantic validator
│
├── tests/               # Test Suite
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
│
├── articles/            # Documentation (WordPress-ready)
├── docker/              # Docker configurations
├── examples/            # DSL examples
├── AGENTS.md            # MCP/Agent specification
├── Makefile             # Build automation
└── package.json
```

## 🎯 TypeScript AI Contracts

Define type-safe contracts for AI agents:

```typescript
import { defineContract, createEntity, createWorkflow } from '@reclapp/contracts';

// Define entity with causal influences
const CustomerEntity = createEntity({
  name: 'Customer',
  fields: [
    { name: 'riskScore', type: 'number', min: 0, max: 100 }
  ],
  causalInfluences: [
    { field: 'profitMargin', weight: -0.3, decay: 0.01 }
  ],
  interventions: [
    {
      name: 'improveTerms',
      adjust: { paymentTerms: 14 },
      expectedEffect: { riskScore: -10 },
      confidence: 0.75,
      sandbox: true
    }
  ]
});

// Build contract
const agent = defineContract('RiskAgent', '1.0.0')
  .description('Autonomous risk monitoring agent')
  .addEntity(CustomerEntity)
  .workflow(RiskWorkflow)
  .verification(RiskVerification)
  .canDo({ action: 'query_data', resources: ['*'], riskLevel: 'low' })
  .needsApproval({ action: 'modify_entity', resources: ['*'], riskLevel: 'high' })
  .cannotDo({ action: '*', resources: ['payment_systems'], riskLevel: 'critical' })
  .safetyRails({ maxAdjustmentPerCycle: 0.1, rollbackOnAnomaly: true })
  .build();

// Execute
const executor = createExecutor(agent);
const result = await executor.execute();
```

## 📜 Declarative DSL

```reclapp
ENTITY Customer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD riskScore: Int @min(0) @max(100) = 50
  
  RISK_SCORE INFLUENCED_BY {
    financialHealth.profitMargin WITH weight(-0.3, decay=0.01)
    paymentHistory.delayDays WITH weight(0.4, decay=0.02)
  }
}

PIPELINE RiskMonitoring {
  INPUT customers.active
  TRANSFORM fetchFinancials, calculateRisk
  OUTPUT alerts, dashboard
  SCHEDULE "0 6 * * *"
}

ALERT "High Risk Customer" {
  ENTITY Customer
  CONDITION riskScore > 80
  TARGET email, slack
  SEVERITY high
}
```

## 🔄 Causal Verification Loop

```
Intent → Predict → Execute → Observe → Verify → Adapt
   ↑                                              │
   └──────────────── Feedback Loop ───────────────┘
```

**Key concepts:**
- **Confidence Decay** - Older observations have reduced influence
- **Anomaly Detection** - Automatic detection of unexpected effects
- **Safety Rails** - Max adjustment limits, rollback, sandbox
- **Learning** - Controlled model adaptation with human approval

## 🔌 MCP Integration

Reclapp implements [Model Context Protocol](https://modelcontextprotocol.io) for AI integration:

```typescript
// MCP Resources
reclapp://entities/{name}
reclapp://events/{streamId}
reclapp://dashboards/{name}
reclapp://causal/{modelName}

// MCP Tools
parse_dsl, validate_dsl, build_plan, execute_plan,
query_causal, generate_dsl, verify_action
```

## 🧪 Testing

```bash
# Run all tests
make test

# Run specific test suites
make test-unit
make test-integration
make test-e2e

# Run with coverage
make test-coverage

# Watch mode
make test-watch
```

## 📊 Available Commands

```bash
make help              # Show all commands

# Development
make install           # Install dependencies
make dev               # Start dev server
make build             # Build project

# Testing
make test              # Run all tests
make test-coverage     # Run with coverage
make lint              # Run linter
make typecheck         # Type checking

# Docker
make docker-up         # Start services
make docker-down       # Stop services
make docker-logs       # View logs

# Publishing
make publish-check     # Check if ready
make publish-npm       # Publish to npm

# Release
make version-patch     # Bump patch version
make release           # Create release
```

## 📚 Documentation

| Article | Description |
|---------|-------------|
| [Overview](articles/01-reclapp-overview.md) | Platform introduction |
| [DSL Reference](articles/02-reclapp-dsl-reference.md) | DSL syntax guide |
| [Docker Guide](articles/03-reclapp-mvp-docker.md) | Deployment guide |
| [AI-Native Roadmap](articles/04-reclapp-ai-native-roadmap.md) | Architecture & roadmap |
| [TypeScript Contracts](articles/05-reclapp-typescript-ai-contracts.md) | Contract system |
| [MCP Integration](articles/06-reclapp-mcp-integration.md) | Protocol integration |
| [Causal Loop](articles/07-reclapp-causal-verification-loop.md) | Verification loop |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI AGENT / LLM                           │
└────────────────────────────┬────────────────────────────────┘
                             │ MCP Protocol
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    RECLAPP PLATFORM                          │
├─────────────────────────────────────────────────────────────┤
│  Intent Layer     │  Contract Layer  │  Verification Layer  │
│  (NL → DSL)       │  (TypeScript)    │  (Causal Loop)       │
├─────────────────────────────────────────────────────────────┤
│  DSL Layer        │  Execution Layer │  Adaptation Layer    │
│  (Parser/AST)     │  (DAG Planner)   │  (Learning)          │
├─────────────────────────────────────────────────────────────┤
│                    Event Store (CQRS)                        │
└─────────────────────────────────────────────────────────────┘
```

## 🛡️ Safety Features

| Feature | Description |
|---------|-------------|
| **Sandbox Mode** | Test interventions before production |
| **Rollback** | Automatic rollback on anomaly |
| **Rate Limits** | Per-minute/hour/day action limits |
| **Confidence Threshold** | Require approval below threshold |
| **Freeze Protection** | System freeze on critical issues |
| **Audit Log** | Complete decision trail |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [Documentation](https://docs.reclapp.io)
- [GitHub](https://github.com/softreck/reclapp)
- [npm Package](https://www.npmjs.com/package/reclapp)
- [Discord](https://discord.gg/reclapp)

---

**Reclapp** - *AI-Native Declarative Platform for Autonomous B2B Applications*

Made with ❤️ by [Softreck](https://softreck.com)
