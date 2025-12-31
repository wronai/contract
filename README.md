# Reclapp - Declarative Application Platform

**Reclapp** is a stack-agnostic declarative DSL platform that generates complete applications for desktop, mobile, and web from simple declarations.

## 🎯 Core Features

- **Declarative DSL** - Describe *what* you want, not *how* to build it
- **Stack-Agnostic** - JSON AST interchange enables any language to consume the DSL
- **Event Sourcing & CQRS** - Full audit trail and temporal queries
- **Multi-Platform** - Generate web, mobile, and desktop applications
- **Hardware Integration** - MQTT/CoAP support for IoT and monitoring
- **LLM-Ready** - Structured documentation for AI-assisted generation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DSL Programs                              │
│                    (Declarative Definitions)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DSL Parser (Peggy)                          │
│                     JSON AST Generation                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Semantic Validator                            │
│              Type Checking & Business Rules                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Execution Planner                             │
│              DAG Construction & Dependency Resolution            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Event Store    │ │   Generators    │ │  Hardware/Edge  │
│  (EventStoreDB) │ │  (Multi-target) │ │  (MQTT/CoAP)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
              │               │               │
              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Output Targets                               │
│         Dashboards │ APIs │ Reports │ Alerts │ Devices          │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
reclapp/
├── dsl/                    # DSL Grammar & Parser
│   ├── grammar/            # Peggy grammar files
│   ├── parser/             # Parser implementation
│   ├── ast/                # AST type definitions
│   └── validator/          # Semantic validation
│
├── core/                   # Core Platform Services
│   ├── planner/            # Execution graph builder
│   ├── eventstore/         # Event sourcing integration
│   ├── cqrs/               # Command/Query separation
│   └── pipeline/           # Data transformation pipeline
│
├── modules/                # Data Source Modules
│   ├── krs/                # Polish Company Registry
│   ├── ceidg/              # Business Registry
│   ├── financial/          # Financial data APIs
│   └── mock/               # Mock data generators
│
├── generators/             # Platform Generators
│   ├── web/                # React/Vue/HTML generators
│   ├── mobile/             # React Native/Flutter
│   ├── desktop/            # Electron generators
│   └── api/                # REST/GraphQL API gen
│
├── hardware/               # Hardware Integration
│   ├── mqtt/               # MQTT client
│   ├── coap/               # CoAP support
│   └── devices/            # Device definitions
│
├── frontend/               # Dashboard UI
│   ├── components/         # React components
│   ├── dashboards/         # Dashboard templates
│   └── streaming/          # Real-time updates
│
├── examples/               # Example DSL Programs
│   ├── b2b-onboarding/     # B2B onboarding flow
│   ├── monitoring/         # Contractor monitoring
│   └── reporting/          # Analytics & reports
│
├── docker/                 # Docker configurations
│   ├── docker-compose.yml  # Main compose file
│   └── services/           # Service Dockerfiles
│
└── docs/                   # Documentation
    ├── dsl-reference.md    # DSL Language Reference
    ├── api.md              # API Documentation
    └── examples.md         # Usage Examples
```

## 🚀 Quick Start

```bash
# Start the platform
docker compose up -d

# Parse a DSL program
curl -X POST http://localhost:8080/api/parse \
  -H "Content-Type: application/json" \
  -d '{"source": "ENTITY Customer { ... }"}'

# Open the dashboard
open http://localhost:3000
```

## 📖 DSL Syntax Overview

```reclapp
# Define a business entity
ENTITY Customer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD email: Email @unique
  FIELD taxId: String @pattern("[0-9]{10}")
  FIELD status: Status = "pending"
}

# Define events for event sourcing
EVENT CustomerOnboarded {
  customerId: UUID
  companyName: String
  verifiedAt: DateTime
}

# Define a monitoring pipeline
PIPELINE ContractorMonitoring {
  INPUT customers.active
  TRANSFORM validate, enrich
  OUTPUT dashboard, alerts
}

# Configure alerts
ALERT HighRisk {
  ENTITY Customer
  CONDITION riskScore > 80
  TARGET email, slack, mqtt:devices/display-01
}

# Define a dashboard
DASHBOARD CustomerOverview {
  ENTITY Customer
  METRICS totalCount, activeCount, riskDistribution
  STREAM real_time
}
```

## 🔧 MVP Features (Docker)

### MVP 1: Core DSL + Parser
- [x] Peggy grammar for Reclapp DSL
- [x] JSON AST generation
- [x] Semantic validation
- [x] REST API for parsing

### MVP 2: Event Sourcing + Dashboards
- [x] EventStoreDB integration
- [x] CQRS read models
- [x] Real-time dashboard
- [x] Mock data generators

## 📄 License

MIT License - See LICENSE file for details.
