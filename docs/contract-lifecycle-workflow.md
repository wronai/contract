# Contract AI Lifecycle Workflow

## Overview

This document describes the complete lifecycle of a contract-driven application, from initial prompt through code generation, validation, deployment, and ongoing maintenance.

## 🔄 Full Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTRACT AI LIFECYCLE v2.2                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PROMPT     │────▶│   CONTRACT   │────▶│   CODE GEN   │────▶│  VALIDATION  │
│              │     │   GENERATE   │     │   (LLM)      │     │  PIPELINE    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                       │
                     ┌─────────────────────────────────────────────────┤
                     │                                                 ▼
              ┌──────┴───────┐                              ┌──────────────────┐
              │   FEEDBACK   │◀─────────────────────────────│  8 STAGES        │
              │     LOOP     │      (if validation fails)   │                  │
              └──────┬───────┘                              │  1. Syntax       │
                     │                                      │  2. Schema       │
                     ▼                                      │  3. Assertions   │
              ┌──────────────┐                              │  4. Static       │
              │    CODE      │                              │  5. Tests        │
              │  CORRECTOR   │────────────────────────────▶ │  6. Quality      │
              └──────────────┘                              │  7. Security     │
                                                            │  8. Runtime      │
                                                            └────────┬─────────┘
                                                                     │
                     ┌───────────────────────────────────────────────┘
                     │  (all stages passed)
                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   DEPLOY     │────▶│   RUNTIME    │────▶│  MONITORING  │────▶│    SDK       │
│   (Docker)   │     │   SERVICE    │     │  & HEALTH    │     │  GENERATION  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
                                                                       ▼
                                          ┌──────────────┐     ┌──────────────┐
                                          │   CI/CD      │◀────│  FRONTEND    │
                                          │   PIPELINE   │     │  SYNC        │
                                          └──────────────┘     └──────────────┘
```

## 📋 Stage Details

### 1. Prompt → Contract Generation

```
User Prompt ──▶ ContractGenerator ──▶ ContractAI (3 layers)
                     │
                     ├── Definition Layer (entities, fields, relations)
                     ├── Generation Layer (instructions, templates)
                     └── Validation Layer (assertions, rules)
```

**Files:**
- `src/core/contract-ai/generator/contract-generator.ts`
- `src/core/contract-ai/types.ts`

### 2. Contract → Code Generation (LLM)

```
ContractAI ──▶ LLMCodeGenerator ──▶ GeneratedCode
                     │
                     ├── OllamaClient (real LLM)
                     └── Simulation (fallback)
```

**Output:**
- `api/src/server.ts`
- `api/src/routes/*.ts`
- `api/src/types/*.ts`
- `api/package.json`
- `docker/Dockerfile`
- `frontend/src/**/*`

**Files:**
- `src/core/contract-ai/code-generator/llm-generator.ts`
- `src/core/contract-ai/llm/ollama-client.ts`

### 3. Validation Pipeline (8 Stages)

```
GeneratedCode ──▶ ValidationPipeline ──▶ PipelineResult
                        │
                        ├── Stage 1: Syntax Validator
                        ├── Stage 2: Schema Validator
                        ├── Stage 3: Assertion Validator  
                        ├── Stage 4: Static Analyzer
                        ├── Stage 5: Test Runner (Jest)
                        ├── Stage 6: Quality Checker
                        ├── Stage 7: Security Scanner
                        └── Stage 8: Runtime Validator (Docker)
```

**Files:**
- `src/core/contract-ai/validation/pipeline-orchestrator.ts`
- `src/core/contract-ai/validation/stages/*.ts`

### 4. Feedback Loop (if validation fails)

```
PipelineResult ──▶ FeedbackGenerator ──▶ Feedback
      │                                      │
      │                                      ▼
      │                              CodeCorrector
      │                                      │
      │                                      ▼
      └──────────────────────────── IterationManager
                                         │
                                         ▼
                                   (retry validation)
```

**Files:**
- `src/core/contract-ai/feedback/feedback-generator.ts`
- `src/core/contract-ai/feedback/code-corrector.ts`
- `src/core/contract-ai/feedback/iteration-manager.ts`

### 5. Deploy & Runtime

```
GeneratedCode ──▶ Docker Build ──▶ Container ──▶ Health Check
                                        │
                                        ├── GET /health
                                        ├── CRUD endpoints
                                        └── Runtime validation
```

### 6. SDK Generation & Frontend Sync

```
ContractAI ──▶ JSON Schema ──▶ TypeScript Types ──▶ Frontend SDK
                  │                                      │
                  └──────────────────────────────────────┤
                                                         ▼
                                                  React Components
                                                  API Client
                                                  Type Definitions
```

### 7. CI/CD Integration

```
Git Commit ──▶ CI Pipeline ──▶ Contract Validation ──▶ Code Gen ──▶ Tests ──▶ Deploy
                    │
                    ├── Validate contract changes
                    ├── Regenerate code if contract changed
                    ├── Run all 7 validation stages
                    ├── Build & push Docker images
                    ├── Generate SDK
                    └── Update frontend types
```

## 🔧 Current Implementation Status

| Component | Status | Description |
|-----------|--------|-------------|
| Contract Generator | ✅ | Generates ContractAI from prompt |
| LLM Code Generator | ✅ | Generates code with Ollama/simulation |
| Validation Pipeline | ✅ | 7/7 stages implemented |
| Feedback Loop | ✅ | FeedbackGenerator + CodeCorrector |
| Iteration Manager | ✅ | Retry loop with max iterations |
| Ollama Integration | ✅ | Auto-detection, fallback to simulation |
| Docker Runtime | ✅ | Build, run, health check, cleanup |
| .rcl.md Logs | ✅ | Generation logs with metadata |
| SDK Generation | ⏳ | Planned |
| CI/CD Integration | ⏳ | Planned |

## 📁 Key Files

```
src/core/contract-ai/
├── types.ts                    # ContractAI types (3 layers)
├── index.ts                    # Main exports
├── generator/
│   └── contract-generator.ts   # Prompt → Contract
├── code-generator/
│   └── llm-generator.ts        # Contract → Code
├── llm/
│   ├── ollama-client.ts        # Ollama LLM client
│   └── index.ts
├── validation/
│   ├── pipeline-orchestrator.ts # 7-stage pipeline
│   └── stages/
│       ├── syntax-validator.ts
│       ├── assertion-validator.ts
│       ├── static-analyzer.ts
│       ├── test-runner.ts
│       ├── quality-checker.ts
│       ├── security-scanner.ts
│       └── runtime-validator.ts
└── feedback/
    ├── feedback-generator.ts
    ├── code-corrector.ts
    ├── iteration-manager.ts
    └── generation-log.ts       # .rcl.md log writer
```

## 🚀 CLI Commands

```bash
# Generate code from contract
./bin/reclapp generate-ai examples/contract-ai/crm-contract.ts

# Generate with custom output
./bin/reclapp generate-ai contract.ts -o ./output

# Generate from prompt
./bin/reclapp generate-ai --prompt "Create a blog API with posts and comments"

# Dry run (preview contract without generating)
./bin/reclapp generate-ai --dry-run --prompt "Create a task manager"
```

## 🔄 Contract as Single Source of Truth

The contract controls the entire service lifecycle:

1. **Specification** - Contract defines entities, fields, constraints
2. **Generation** - LLM generates code following contract instructions
3. **Validation** - Pipeline verifies code matches contract assertions
4. **Correction** - Feedback loop fixes code to meet contract
5. **Runtime** - Docker validates running service matches contract
6. **SDK** - TypeScript types generated from contract schema
7. **CI/CD** - Every commit validated against contract

## 📊 Metrics & Monitoring

```yaml
contract_lifecycle:
  generation:
    - time_to_generate
    - llm_model_used
    - files_generated
    - tokens_used
  
  validation:
    - stages_passed
    - stages_failed
    - errors_count
    - warnings_count
    - time_per_stage
  
  feedback:
    - iterations_needed
    - corrections_made
    - final_success
  
  runtime:
    - health_check_status
    - endpoints_tested
    - docker_build_time
```

---

*Last updated: 2026-01-01*
*Version: 2.2.0*
