# Reclapp: Praktyczny Przewodnik Testowania

**Data:** 1 Stycznia 2026  
**Wersja:** 2.4.1  
**Kategoria:** Testing Guide  
**Status:** ✅ VERIFIED

## 🎯 Jak System Powinien Działać

### Pełny Flow: Od Promptu do Działającej Aplikacji

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RECLAPP LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. INPUT                                                                │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  Prompt: "Stwórz system CRM z kontaktami i firmami"          │    │
│     │  LUB                                                          │    │
│     │  Contract: examples/contract-ai/crm-contract.ts              │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                           │
│  2. CONTRACT GENERATION                                                  │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  LLM (Ollama/llama3) generuje Contract AI:                   │    │
│     │  - Layer 1: Entities (Contact, Company, Deal)                │    │
│     │  - Layer 2: Generation Instructions                          │    │
│     │  - Layer 3: Validation Rules                                 │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                           │
│  3. CODE GENERATION                                                      │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  LLM generuje pliki:                                         │    │
│     │  - api/src/server.ts                                         │    │
│     │  - api/src/routes/*.ts                                       │    │
│     │  - api/src/validators/*.ts                                   │    │
│     │  - frontend/src/components/*.tsx                             │    │
│     │  - frontend/src/hooks/*.ts                                   │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                           │
│  4. VALIDATION (8 STAGES)                                               │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  Stage 1: Syntax      → TypeScript kompiluje się?            │    │
│     │  Stage 2: Schema      → ContractAI schema / typy OK?         │    │
│     │  Stage 3: Assertions  → Czy spełnia kontraktowe assercje?     │    │
│     │  Stage 4: Static      → ESLint-like rules OK?                 │    │
│     │  Stage 5: Tests       → Wygenerowane testy przechodzą?        │    │
│     │  Stage 6: Quality     → Coverage, complexity OK?              │    │
│     │  Stage 7: Security    → Brak SQL injection, secrets?          │    │
│     │  Stage 8: Runtime     → Docker + health check + CRUD?         │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                           │
│  5. OUTPUT                                                               │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  ✅ Działająca aplikacja w ./generated/                      │    │
│     │  ✅ Log w ./generated/logs/*.rcl.md                          │    │
│     │  ✅ Gotowe do docker-compose up                              │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start: Testowanie w 5 Minut

### Krok 1: Sprawdź Wymagania

```bash
cd ~/github/wronai/contract

# Jeśli widzisz "npm: command not found" (np. w CI lub w testach uruchamianych z powłoki),
# doładuj NVM przed użyciem npm:
source ~/.nvm/nvm.sh

# Sprawdź Node.js
node --version  # >= 18.0.0

# Sprawdź Python
python3 --version  # >= 3.10

# Sprawdź Ollama (opcjonalne, ale zalecane)
ollama --version
ollama list  # Powinien być llama3
```

### Krok 2: Uruchom Ollama (jeśli używasz)

```bash
# W osobnym terminalu
ollama serve

# Sprawdź czy działa
curl http://localhost:11434/api/tags
```

### Krok 3: Wygeneruj Aplikację

```bash
# Najprostsza komenda - z promptem
./bin/reclapp evolve -p "Create a simple task manager" -o ./output

# Lub z gotowym kontraktem (legacy generate-ai)
./bin/reclapp generate-ai examples/contract-ai/crm-contract.ts
```

### Krok 4: Sprawdź Wyniki

```bash
# Zobacz wygenerowane pliki
ls -la ./generated/

# Sprawdź logi
cat ./generated/logs/*.rcl.md | head -100
```

## 📋 Przykłady Testowania

### Przykład 1: CRM System (z pliku kontraktu)

```bash
./bin/reclapp evolve -p "Create a CRM system" -o ./crm
# Lub legacy: ./bin/reclapp generate-ai examples/contract-ai/crm-contract.ts
```

**Oczekiwany output:**
```
🤖 Reclapp Contract AI Generator v2.4.1

📄 Loading contract from: examples/contract-ai/crm-contract.ts
✅ Contract validated successfully

🔨 Generating code...
🤖 Using Ollama (llama3) for code generation
✅ Generated 21-23 files

🔍 Running validation pipeline...

🔍 Starting validation pipeline with 7 stages

   Running stage: syntax...
   ✅ syntax: PASSED

   Running stage: assertions...
   ✅ assertions: PASSED

   Running stage: static-analysis...
   ✅ static-analysis: PASSED

   Running stage: tests...
   ✅ tests: PASSED

   Running stage: quality...
   ✅ quality: PASSED

   Running stage: security...
   ✅ security: PASSED

   Running stage: runtime...
   ✅ runtime: PASSED

✅ All validation stages passed

📁 Writing files to: ./generated/
📝 Log saved: generated/logs/crm-system_*.rcl.md

══════════════════════════════════════════════════
✨ Generation complete!
══════════════════════════════════════════════════
```

## 🔧 Testowanie Poszczególnych Komponentów

### Test 1: Reclapp Contracts
    
```bash
# Generuj JSON Schema z Contract AI modeli
PYTHONPATH=reclapp-contracts:. python3 scripts/generate_schemas.py --output ./contracts/json

# Sprawdź wygenerowane pliki
ls contracts/json/
# contract-ai.json  definition.json  generation.json  validation.json
```

**Oczekiwany output:**
```
Generating schemas to contracts/json...
  ✓ contracts/json/contract-ai.json
  ✓ contracts/json/definition.json
  ✓ contracts/json/generation.json
  ✓ contracts/json/validation.json
Done!
```

### Test 2: Walidacja Python Models

```bash
python3 -c "
from reclapp.models import ContactAI, DefinitionLayer
from reclapp.llm import LLMResponse

# Test LLMResponse
resp = LLMResponse(content='test', model='gpt-4', provider='openai')
print('✓ LLMResponse:', resp.provider)

print('All tests passed!')
"
```

**Oczekiwany output:**
```
✓ Contact: John Doe
✓ Deal weighted_value: 25000.0
✓ LLMCodeOutput files: 1

All tests passed!
```

### Test 3: Unit Tests

```bash
npx jest tests/unit/contract-ai.test.ts --testTimeout=30000
```

**Oczekiwany output:**
```
PASS  tests/unit/contract-ai.test.ts
  Contract AI Types
    ✓ should create a valid empty contract
    ✓ should have valid metadata
    ✓ isValidContractAI should validate complete contract
    ...
  Contract Validator
    ✓ should validate a complete contract
    ✓ should detect missing definition layer
    ...
  Validation Pipeline
    ✓ should create default pipeline with stages
    ✓ should validate generated code
  SDK Generator
    ✓ should create SDK generator
    ✓ should generate SDK from contract
    ...

Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
```

### Test 4: Integration Tests

```bash
npx jest tests/integration/contract-ai-flow.test.ts --testTimeout=60000
```

**Oczekiwany output:**
```
PASS  tests/integration/contract-ai-flow.test.ts
  Contract AI Integration Flow
    ✓ should generate code from CRM contract
    ✓ should validate CRM contract structure
    ✓ should run validation pipeline on generated code
    ...
  Validation Stage Tests
    ✓ should have 7 stages registered
    ✓ should have stages in correct order
    ...

Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
```

## 🐳 Testowanie Wygenerowanej Aplikacji

### Uruchomienie API

```bash
cd ./generated/api

# Zainstaluj zależności
npm install

# Uruchom w trybie dev
npm run dev

# Lub zbuduj i uruchom
npm run build
npm start
```

**Oczekiwany output:**
```
> api@1.0.0 dev
> ts-node-dev src/server.ts

[INFO] Server starting...
[INFO] Routes registered:
  GET    /health
  GET    /api/contacts
  POST   /api/contacts
  GET    /api/contacts/:id
  PUT    /api/contacts/:id
  DELETE /api/contacts/:id
[INFO] Server listening on http://localhost:3000
```

### Testowanie Endpointów

```bash
# Health check
curl http://localhost:3000/health
# {"status":"ok","timestamp":"2026-01-01T20:00:00.000Z"}

# Create contact
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","firstName":"John","lastName":"Doe"}'

# Get all contacts
curl http://localhost:3000/api/contacts

# Get single contact
curl http://localhost:3000/api/contacts/uuid-123

# Update contact
curl -X PUT http://localhost:3000/api/contacts/uuid-123 \
  -H "Content-Type: application/json" \
  -d '{"phone":"+48123456789"}'

# Delete contact
curl -X DELETE http://localhost:3000/api/contacts/uuid-123
```

### Uruchomienie z Docker

```bash
cd ./generated

# Uruchom wszystko
docker-compose up -d

# Sprawdź status
docker-compose ps

# Logi
docker-compose logs -f api

# Zatrzymaj
docker-compose down
```

## 🔍 Testowanie Feedback Loop

### Symulacja Błędu i Korekcji

```bash
./bin/reclapp evolve \
  -p "Create a system with complex validation rules" \
  -o ./output --no-menu -v
```

**Scenariusz z feedback loop:**
```
🔧 Generating code (attempt 1/5)...
  ✅ Generated 15 files

🔍 Validation Pipeline:
  Stage 1/7: Syntax validation      ✅ PASSED
  Stage 2/7: Assertion validation   ❌ FAILED
    Error: Missing endpoint /api/items
    Error: Field 'price' should be positive

🔄 Feedback Loop activated...
  Generating feedback...
  Errors grouped: 2 files affected
  Suggestions generated: 3

🔧 Generating code (attempt 2/5)...
  Applying corrections...
  ✅ Generated 15 files (2 modified)

🔍 Validation Pipeline:
  Stage 1/7: Syntax validation      ✅ PASSED
  Stage 2/7: Assertion validation   ✅ PASSED
  ... (all stages pass)

✅ SUCCESS after 2 iterations!
```

## 📊 Sprawdzanie Logów

### Format Logu (.rcl.md)

```bash
cat ./generated/logs/crm-system_*.rcl.md
```

**Zawartość:**
```markdown
# Generation Log: CRM System

**Date:** 2026-01-01T20:00:00.000Z
**Contract:** examples/contract-ai/crm-contract.ts
**Status:** ✅ SUCCESS

## Contract Summary

- **Name:** CRM System
- **Version:** 1.0.0
- **Entities:** Contact, Company, Deal

## Validation Results

| Stage | Result | Time | Details |
|-------|--------|------|---------|
| 1. Syntax | ✅ PASSED | 2ms | 0 errors |
| 2. Assertions | ✅ PASSED | 1ms | passed |
| 3. Static | ✅ PASSED | 2ms | 0 warnings |
| 4. Tests | ✅ PASSED | 1ms | tests OK |
| 5. Quality | ✅ PASSED | 2ms | OK |
| 6. Security | ✅ PASSED | 3ms | 0 vulnerabilities |
| 7. Runtime | ✅ PASSED | 20ms | OK |
```

## ❌ Troubleshooting

### Problem: Pydantic nie jest zainstalowany

```bash
# Zainstaluj zależności
pip install -e reclapp-contracts/
pip install -e reclapp-llm/
```

### Problem: Ollama nie odpowiada

```bash
# Sprawdź czy Ollama działa
curl http://localhost:11434/api/tags

# Jeśli nie, uruchom
ollama serve

# Pobierz model jeśli brak
ollama pull llama3
```

### Problem: Testy nie przechodzą

```bash
# Sprawdź szczegóły błędów
npx jest tests/unit/contract-ai.test.ts --verbose 2>&1 | tee debug.log

# Przejrzyj log
grep -A5 "FAILED" debug.log
```

## ✅ Checklist Testowania

- [ ] Ollama działa (`curl localhost:11434/api/tags`)
- [ ] Python models i parsery przechodzą testy (`pytest tests/python/`)
- [ ] Unit testy przechodzą (`npx jest tests/unit/`)
- [ ] Integration testy przechodzą (`npx jest tests/integration/`)
- [ ] CLI generuje kod (`./bin/reclapp evolve -p "..." -o ./output`)
- [ ] 8/8 validation stages PASSED
- [ ] Wygenerowane API startuje (`cd generated/api && npm run dev`)
- [ ] Endpointy odpowiadają (`curl localhost:3000/health`)

---

**Reclapp 2.4.1 Testing Guide | 1 Lutego 2026**
