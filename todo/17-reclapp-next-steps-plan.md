# Reclapp 2.2: Plan Następnych Kroków

**Data:** 1 Stycznia 2026  
**Status:** W trakcie implementacji  
**Postęp:** ~45% Complete

---

## 🎯 Aktualny Stan Projektu

### ✅ Co Już Działa

```
✅ Contract AI Types (Layer 1, 2, 3)
   └─ src/core/contract-ai/types/
      ├─ definition.ts    ✅ Entities, Fields, Relations
      ├─ generation.ts    ✅ Instructions, Patterns, Constraints
      ├─ validation.ts    ✅ Assertions, Tests, QualityGates
      └─ index.ts         ✅ ContractAI interface

✅ Contract Generator
   └─ src/core/contract-ai/generator/
      ├─ contract-generator.ts  ✅ Generuje Contract AI z promptu
      ├─ contract-validator.ts  ✅ Waliduje 3 warstwy
      └─ prompt-builder.ts      ✅ Buduje prompty

✅ LLM Code Generator
   └─ src/core/contract-ai/code-generator/
      ├─ llm-generator.ts       ✅ Generuje kod (symulacja)
      └─ prompt-templates/
         ├─ api.ts              ✅ Szablon dla API
         └─ frontend.ts         ✅ Szablon dla Frontend

✅ Validation Pipeline (5/7 stages)
   └─ src/core/contract-ai/validation/
      ├─ pipeline-orchestrator.ts  ✅ Orchestrator
      └─ stages/
         ├─ syntax-validator.ts    ✅ Stage 1
         ├─ assertion-validator.ts ✅ Stage 2
         ├─ static-analyzer.ts     ✅ Stage 3
         ├─ quality-checker.ts     ✅ Stage 5
         └─ security-scanner.ts    ✅ Stage 6

✅ CLI Integration
   └─ bin/reclapp generate-ai     ✅ Działa!

✅ Example Contract
   └─ examples/contract-ai/crm-contract.ts  ✅ Kompletny przykład
```

### ⏳ Co Brakuje

```
❌ Validation Pipeline (2/7 stages brakuje)
   ├─ test-runner.ts        ❌ Stage 4 - generowanie i uruchamianie testów
   └─ runtime-validator.ts  ❌ Stage 7 - Docker deploy + API test

❌ Feedback Loop
   └─ src/core/contract-ai/feedback/
      ├─ feedback-generator.ts   ⚠️ Stub (wymaga pełnej implementacji)
      └─ iteration-manager.ts    ⚠️ Stub (wymaga pełnej implementacji)

❌ Prawdziwa integracja LLM
   └─ Obecnie: symulacja w llm-generator.ts
   └─ Docelowo: Ollama / OpenAI / Anthropic

❌ Code Corrector
   └─ Poprawianie kodu na podstawie feedback

❌ Testy jednostkowe i integracyjne
   └─ tests/unit/contract-ai.test.ts  ⚠️ Podstawowe
```

---

## 📋 Plan Następnych Kroków

### FAZA A: Dokończenie Validation Pipeline (2-3 dni)

#### A1. Test Runner (Stage 4)

**Plik:** `src/core/contract-ai/validation/stages/test-runner.ts`

```
PROMPT:
─────────────────────────────────────────────────────────────────────
Stwórz TestRunner - Stage 4 validation pipeline.

Wymagania:
1. Generuje testy Jest na podstawie contract.validation.tests
2. Zapisuje testy do workDir/tests/
3. Uruchamia npm test
4. Parsuje wyniki (pass/fail count)

Metody:
- validate(context): Promise<StageResult>
- generateTestFile(spec: TestSpecification): string
- runJest(workDir: string): Promise<JestResult>

Dla uproszczenia: generuj testy jako stringi (bez LLM).
Każdy TestScenario -> jeden it() block.
─────────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] Klasa TestRunner implements ValidationStage
- [ ] Generowanie plików testowych z TestSpecification
- [ ] Uruchamianie Jest
- [ ] Parsowanie wyników
- [ ] Dodanie do pipeline-orchestrator.ts

#### A2. Runtime Validator (Stage 7)

**Plik:** `src/core/contract-ai/validation/stages/runtime-validator.ts`

```
PROMPT:
─────────────────────────────────────────────────────────────────────
Stwórz RuntimeValidator - Stage 7 (ostatni) validation pipeline.

Wymagania:
1. Buduje Docker image z wygenerowanego kodu
2. Uruchamia kontener na losowym porcie
3. Testuje /health endpoint (GET 200)
4. Testuje CRUD dla każdej encji z contract.definition.entities
5. Cleanup kontenera

Metody:
- validate(context): Promise<StageResult>
- buildAndRun(workDir: string): Promise<ContainerInfo>
- testEndpoints(port: number, entities: Entity[]): Promise<EndpointResult[]>
- cleanup(containerId: string): Promise<void>

Użyj child_process do docker commands.
Timeout: 60s na cały stage.
─────────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] Klasa RuntimeValidator implements ValidationStage
- [ ] Docker build + run
- [ ] Health check polling
- [ ] CRUD endpoint testing
- [ ] Cleanup
- [ ] Dodanie do pipeline-orchestrator.ts

---

### FAZA B: Feedback Loop (2-3 dni)

#### B1. Feedback Generator (pełna implementacja)

**Plik:** `src/core/contract-ai/feedback/feedback-generator.ts`

```
PROMPT:
─────────────────────────────────────────────────────────────────────
Rozbuduj FeedbackGenerator o pełną funkcjonalność.

Wymagania:
1. Grupuje błędy po plikach
2. Priorytetyzuje (critical > error > warning)
3. Generuje sugestie naprawy na podstawie contract.generation.patterns
4. Limituje do top 10 błędów (nie przytłaczaj LLM)
5. Zwraca structured feedback z contractHints

Interface ValidationFeedback:
- issues: ValidationIssue[] (max 10)
- summary: string
- contractHints: ContractHint[]
- filesAffected: string[]

Każdy issue powinien mieć:
- file, line, stage, severity, message, suggestion, contractRef
─────────────────────────────────────────────────────────────────────
```

#### B2. Code Corrector

**Plik:** `src/core/contract-ai/feedback/code-corrector.ts`

```
PROMPT:
─────────────────────────────────────────────────────────────────────
Stwórz CodeCorrector - naprawia kod na podstawie feedback.

Wymagania:
1. Przyjmuje GeneratedCode + ValidationFeedback
2. Dla każdego pliku z błędami:
   - Buduje correction prompt
   - Wywołuje LLM
   - Parsuje poprawiony kod
3. Zwraca nowy GeneratedCode

Correction prompt powinien zawierać:
- Oryginalny kod pliku
- Lista issues z line numbers
- Relevantne patterns z kontraktu
- Instrukcje: "Fix ALL issues, maintain structure"

Metody:
- correct(code, feedback, contract): Promise<GeneratedCode>
- correctFile(file, issues, hints): Promise<GeneratedFile>
- buildCorrectionPrompt(file, issues, hints): string
─────────────────────────────────────────────────────────────────────
```

#### B3. Iteration Manager (pełna implementacja)

**Plik:** `src/core/contract-ai/feedback/iteration-manager.ts`

```
PROMPT:
─────────────────────────────────────────────────────────────────────
Rozbuduj IterationManager o pełną pętlę iteracji.

Flow:
1. Waliduj kod przez pipeline
2. Jeśli passed -> SUCCESS
3. Jeśli failed:
   a. Generuj feedback
   b. Popraw kod przez CodeCorrector
   c. Wróć do 1 (max N iteracji)

Metody:
- iterate(contract, initialCode): Promise<IterationResult>
- runIteration(contract, code, iteration): Promise<SingleIterationResult>

Logowanie:
- Każda iteracja: "📋 Iteration N/M"
- Każdy stage: "├─ stageName ✅/❌"
- Postęp: ilość błędów przed/po

Stop conditions:
- All stages pass
- Max iterations reached
- No progress (3 iterations bez zmian)
─────────────────────────────────────────────────────────────────────
```

---

### FAZA C: Prawdziwa Integracja LLM (1-2 dni)

#### C1. LLM Client z Ollama

**Plik:** `src/core/contract-ai/llm/ollama-client.ts`

```
PROMPT:
─────────────────────────────────────────────────────────────────────
Stwórz OllamaClient implementujący LLMClient interface.

Wymagania:
1. HTTP POST do http://localhost:11434/api/generate
2. Streaming response handling
3. Retry z exponential backoff
4. Token counting (przybliżone)

Interface LLMClient:
- generate(opts: { system, user, temperature, maxTokens }): Promise<string>

Konfiguracja:
- OLLAMA_HOST env (default: http://localhost:11434)
- OLLAMA_MODEL env (default: llama3)

Error handling:
- Connection refused -> "Ollama not running. Start with: ollama serve"
- Model not found -> "Model not found. Pull with: ollama pull llama3"
─────────────────────────────────────────────────────────────────────
```

#### C2. Integracja w CLI

Zaktualizuj `bin/reclapp` i `src/cli/commands/generate-ai.ts`:

```javascript
// Wykryj dostępność Ollama
const ollamaAvailable = await checkOllamaRunning();

if (ollamaAvailable) {
  const client = new OllamaClient();
  codeGenerator.setLLMClient(client);
  console.log('🤖 Using Ollama for code generation');
} else {
  console.log('⚠️ Ollama not available, using simulation mode');
}
```

---

### FAZA D: Testy i QA (2 dni)

#### D1. Testy Jednostkowe

```
tests/unit/
├── contract-ai/
│   ├── types.test.ts           # Type guards
│   ├── contract-generator.test.ts
│   ├── contract-validator.test.ts
│   ├── llm-generator.test.ts
│   ├── feedback-generator.test.ts
│   └── validation-stages.test.ts
```

#### D2. Testy Integracyjne

```
tests/integration/
├── full-generation-flow.test.ts   # prompt -> code -> validation
├── iteration-loop.test.ts         # validation -> feedback -> fix
└── ollama-integration.test.ts     # prawdziwe LLM calls
```

#### D3. Testy E2E

```
tests/e2e/
├── cli-generate-ai.test.ts        # reclapp generate-ai
├── crm-example.test.ts            # pełny przykład CRM
└── deploy-and-test.test.ts        # Docker deployment
```

---

## 🚀 Natychmiastowe Następne Kroki

### Krok 1: Sprawdź wygenerowany kod

```bash
# Zobacz co zostało wygenerowane
ls -la ./generated/
cat ./generated/api/src/server.ts
cat ./generated/api/src/routes/contacts.ts

# Spróbuj uruchomić
cd ./generated/api
npm install
npm run dev
```

### Krok 2: Przetestuj ręcznie API

```bash
# W osobnym terminalu
curl http://localhost:3000/health
curl http://localhost:3000/api/contacts
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"John","lastName":"Doe"}'
```

### Krok 3: Dodaj brakujące stage'y

```bash
# Stwórz test-runner
touch src/core/contract-ai/validation/stages/test-runner.ts

# Stwórz runtime-validator  
touch src/core/contract-ai/validation/stages/runtime-validator.ts
```

### Krok 4: Zaimplementuj pełny feedback loop

```bash
# Rozbuduj feedback
# Edytuj: src/core/contract-ai/feedback/feedback-generator.ts
# Edytuj: src/core/contract-ai/feedback/iteration-manager.ts

# Dodaj code corrector
touch src/core/contract-ai/feedback/code-corrector.ts
```

---

## 📊 Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REMAINING IMPLEMENTATION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Dzień 1-2: FAZA A - Validation Pipeline                            │
│  ├─ A1. Test Runner stage                                           │
│  └─ A2. Runtime Validator stage                                     │
│                                                                      │
│  Dzień 3-5: FAZA B - Feedback Loop                                  │
│  ├─ B1. Feedback Generator (pełna impl)                             │
│  ├─ B2. Code Corrector                                              │
│  └─ B3. Iteration Manager (pełna impl)                              │
│                                                                      │
│  Dzień 6-7: FAZA C - LLM Integration                                │
│  ├─ C1. Ollama Client                                               │
│  └─ C2. CLI integration                                             │
│                                                                      │
│  Dzień 8-9: FAZA D - Testing                                        │
│  ├─ D1. Unit tests                                                  │
│  ├─ D2. Integration tests                                           │
│  └─ D3. E2E tests                                                   │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════    │
│  TOTAL: ~9 dni do pełnej implementacji v2.2                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Success Metrics

| Metryka | Obecny Stan | Target |
|---------|-------------|--------|
| Validation stages | 5/7 (71%) | 7/7 (100%) |
| Feedback loop | Stub | Pełna iteracja |
| LLM integration | Symulacja | Ollama/OpenAI |
| Test coverage | ~30% | 80% |
| First-attempt success | ? | 40% |
| Success in 5 iterations | ? | 85% |

---

## 📝 Komendy do Uruchomienia

```bash
# 1. Generuj z przykładowego kontraktu
./bin/reclapp generate-ai examples/contract-ai/crm-contract.ts

# 2. Generuj z promptu
./bin/reclapp generate-ai --prompt "Create a task management system"

# 3. Dry-run (tylko kontrakt, bez kodu)
./bin/reclapp generate-ai --dry-run --prompt "Create a blog platform"

# 4. Verbose mode
./bin/reclapp generate-ai -v examples/contract-ai/crm-contract.ts

# 5. Custom output directory
./bin/reclapp generate-ai -o ./my-crm examples/contract-ai/crm-contract.ts
```

---

*Plan aktualizacji v2.2.0 | Styczeń 2026*
