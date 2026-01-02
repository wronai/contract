# Reclapp TypeScript → Python Refactoring Plan

## Overview

Migracja kodu z TypeScript (`src/core/contract-ai/`) do Python (`src/python/reclapp/`).

## Current TypeScript Structure

```
src/core/contract-ai/
├── types/           # Typy i interfejsy (ContractAI, Entity, Event, etc.)
├── parser/          # Parsery kontraktów (.rcl, .contract.md)
├── generator/       # Główny generator kontraktów
├── code-generator/  # Generowanie kodu (backend, frontend)
├── validation/      # Pipeline walidacji (syntax, schema, tests)
├── llm/             # Integracja z LLM (Ollama, OpenRouter, etc.)
├── evolution/       # Evolution mode (auto-healing, task queue)
├── cli/             # CLI runner, shell renderer
├── setup/           # Dependency checker, setup tasks
├── analysis/        # Analiza kodu, refactoring
├── feedback/        # Feedback loop dla LLM
├── converter/       # Konwersja między formatami
├── templates/       # Szablony kodu
├── sdk/             # SDK dla zewnętrznych integracji
└── reports/         # Generowanie raportów
```

## Target Python Structure

```
src/python/reclapp/
├── __init__.py
├── models/          # Pydantic models (replacing types/)
│   ├── __init__.py
│   ├── contract.py  # ContractAI, ContractDefinition
│   ├── entity.py    # Entity, Field, Relation
│   ├── event.py     # Event, EventField
│   ├── api.py       # Endpoint, Route
│   └── generation.py # TechStack, GenerationConfig
├── parser/          # Contract parsers
│   ├── __init__.py
│   ├── rcl_parser.py      # Mini-DSL parser
│   ├── markdown_parser.py # Contract Markdown parser
│   └── typescript_parser.py # .reclapp.ts parser
├── generator/       # Code generation
│   ├── __init__.py
│   ├── contract_generator.py # Main generator
│   ├── backend/     # Backend code generation
│   └── frontend/    # Frontend code generation
├── validation/      # Validation pipeline
│   ├── __init__.py
│   ├── pipeline.py  # ValidationPipeline
│   ├── stages/      # Validation stages
│   └── assertions.py
├── llm/             # LLM integration
│   ├── __init__.py
│   ├── provider.py  # LLMProvider base
│   ├── ollama.py    # Ollama client
│   ├── openrouter.py
│   └── manager.py   # LLMManager
├── evolution/       # Evolution mode
│   ├── __init__.py
│   ├── manager.py   # EvolutionManager
│   ├── task_queue.py
│   └── shell_renderer.py
├── cli/             # CLI components
│   ├── __init__.py
│   ├── runner.py    # CLIRunner
│   └── commands/    # CLI commands
├── setup/           # Setup & dependencies
│   ├── __init__.py
│   └── checker.py   # DependencyChecker
└── utils/           # Utilities
    ├── __init__.py
    └── helpers.py
```

## Migration Phases

### Phase 1: Models & Types (Priority: HIGH)
**Goal:** Create Pydantic models matching TypeScript interfaces

1. [ ] `models/contract.py` - ContractAI, ContractDefinition
2. [ ] `models/entity.py` - Entity, Field, FieldType, Relation
3. [ ] `models/event.py` - Event, EventField
4. [ ] `models/api.py` - Endpoint, Route, Method
5. [ ] `models/generation.py` - TechStack, GenerationConfig

**Tests:**
- TypeScript: `tests/types.test.ts`
- Python: `tests/python/test_models.py`

### Phase 2: Parsers (Priority: HIGH)
**Goal:** Parse contract files into models

1. [ ] `parser/rcl_parser.py` - Mini-DSL (.reclapp.rcl)
2. [ ] `parser/markdown_parser.py` - Contract Markdown (.contract.md)
3. [ ] `parser/typescript_parser.py` - TypeScript contracts

**Tests:**
- TypeScript: `tests/parser.test.ts`
- Python: `tests/python/test_parser.py`

### Phase 3: LLM Integration (Priority: HIGH)
**Goal:** Connect to LLM providers

1. [ ] `llm/provider.py` - Base LLMProvider class
2. [ ] `llm/ollama.py` - Ollama client
3. [ ] `llm/openrouter.py` - OpenRouter client
4. [ ] `llm/manager.py` - Multi-provider manager

**Tests:**
- TypeScript: `tests/llm.test.ts`
- Python: `tests/python/test_llm.py`

### Phase 4: Validation Pipeline (Priority: MEDIUM)
**Goal:** Validate generated code

1. [ ] `validation/pipeline.py` - ValidationPipeline
2. [ ] `validation/stages/` - Individual stages
3. [ ] `validation/assertions.py` - Contract assertions

**Tests:**
- TypeScript: `tests/validation.test.ts`
- Python: `tests/python/test_validation.py`

### Phase 5: Code Generator (Priority: MEDIUM)
**Goal:** Generate code from contracts

1. [ ] `generator/contract_generator.py` - Main generator
2. [ ] `generator/backend/` - Backend templates
3. [ ] `generator/frontend/` - Frontend templates

**Tests:**
- TypeScript: `tests/generator.test.ts`
- Python: `tests/python/test_generator.py`

### Phase 6: Evolution Mode (Priority: LOW)
**Goal:** Auto-healing code generation

1. [ ] `evolution/manager.py` - EvolutionManager
2. [ ] `evolution/task_queue.py` - TaskQueue
3. [ ] `evolution/shell_renderer.py` - Terminal output

**Tests:**
- TypeScript: `tests/evolution.test.ts`
- Python: `tests/python/test_evolution.py`

## Testing Strategy

### 1. TypeScript Tests First
```bash
# Run existing TypeScript tests
npm test -- --grep "contract-ai"

# Create missing tests
npm test -- tests/types.test.ts
```

### 2. Python Tests Mirror TypeScript
```bash
# Run Python tests
pytest tests/python/ -v

# Compare outputs
./scripts/compare-outputs.sh
```

### 3. Feature Parity Verification
```bash
# Generate with TypeScript
./bin/reclapp generate-ai contract.rcl -o /tmp/ts-output

# Generate with Python
python -m reclapp.cli generate contract.rcl -o /tmp/py-output

# Compare
diff -r /tmp/ts-output /tmp/py-output
```

## Migration Checklist

- [x] Phase 1: Models complete + tests pass (46/46 tests) ✅ 2026-01-02
- [x] Phase 2: Parsers complete + tests pass (43/43 tests) ✅ 2026-01-02
- [x] Phase 3: LLM integration complete + tests pass (19/19 tests) ✅ 2026-01-02
- [x] Phase 4: Validation complete + tests pass (36/36 tests) ✅ 2026-01-02
- [x] Phase 5: Generator complete + tests pass (36/36 tests) ✅ 2026-01-02
- [x] Phase 6: Evolution complete + tests pass (35/35 tests) ✅ 2026-01-02
- [ ] Full integration tests pass
- [ ] Performance benchmarks acceptable
- [ ] Documentation updated

## Test Summary

**Total: 215 passed, 2 skipped** ✅

| Module | Tests | Status |
|--------|-------|--------|
| Models | 46 | ✅ Pass |
| Parser | 43 | ✅ Pass |
| LLM | 19 | ✅ Pass |
| Validation | 36 | ✅ Pass |
| Generator | 36 | ✅ Pass |
| Evolution | 35 | ✅ Pass |

## Notes

- Keep TypeScript code working during migration
- Use feature flags to switch between implementations
- Maintain backward compatibility with existing contracts
- Python version should be drop-in replacement
