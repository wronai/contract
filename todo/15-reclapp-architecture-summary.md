# Reclapp 2.2: Architektura LLM-Driven Code Generation

**Data:** 1 Stycznia 2026  
**Wersja:** 2.2.0  
**Status:** Architecture Specification

---

## Executive Summary

Reclapp 2.2 wprowadza fundamentalną zmianę paradygmatu: z **deterministycznej generacji** na **LLM-driven generation z walidacją przez Contract AI**. Contract AI przestaje być tylko schematem danych - staje się pełną specyfikacją definiującą CO, JAK i KIEDY.

---

## Porównanie Architektur

### Reclapp 2.1 (Poprzednia)

```
┌─────────────────────────────────────────────────────────────┐
│                    RECLAPP 2.1 FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   User         LLM          Contract        Generator        │
│    │            │              │               │             │
│    │──prompt───►│              │               │             │
│    │            │──generate───►│               │             │
│    │            │              │──validate────►│             │
│    │            │              │◄──errors──────│             │
│    │            │◄─feedback────│               │             │
│    │            │──fix────────►│               │             │
│    │            │              │               │             │
│    │            │              │  ┌────────────┴───────────┐│
│    │            │              │  │ DETERMINISTIC          ││
│    │            │              │  │ TEMPLATE ENGINE        ││
│    │            │              │  │                        ││
│    │            │              │  │ Contract → Templates   ││
│    │            │              │  │ Templates → Code       ││
│    │            │              │  └────────────────────────┘│
│    │            │              │               │             │
│    │◄───────────┼──────────────┼───────────────│─────code    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

❌ Problemy:
- Sztywne szablony nie pokrywają wszystkich przypadków
- Brak walidacji wygenerowanego kodu
- Nie wykorzystuje potencjału LLM do generacji kodu
```

### Reclapp 2.2 (Nowa)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RECLAPP 2.2 FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    PHASE 1: CONTRACT GENERATION                     │ │
│  │                                                                      │ │
│  │   User ──prompt──► LLM ──► Contract AI ──► Validator               │ │
│  │                              │                  │                   │ │
│  │                              │    ┌─────────────┘                   │ │
│  │                              │    │                                 │ │
│  │                              │  Valid? ──No──► Self-Correction      │ │
│  │                              │    │                   │             │ │
│  │                              │   Yes                  │             │ │
│  │                              │    │                   │             │ │
│  │                              ▼    ▼                   │             │ │
│  │                     Contract AI (Final) ◄─────────────┘             │ │
│  │                              │                                       │ │
│  └──────────────────────────────┼───────────────────────────────────────┘ │
│                                 │                                         │
│                                 ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    PHASE 2: CODE GENERATION                          │ │
│  │                                                                       │ │
│  │   Contract AI                                                         │ │
│  │       │                                                               │ │
│  │       ├──► generation.instructions ──┐                               │ │
│  │       ├──► generation.patterns ──────┼──► Generation Prompt          │ │
│  │       ├──► generation.constraints ───┘           │                   │ │
│  │       │                                          │                   │ │
│  │       │                                          ▼                   │ │
│  │       │                                   ┌─────────────┐            │ │
│  │       │                                   │     LLM     │            │ │
│  │       │                                   │  (Code Gen) │            │ │
│  │       │                                   └──────┬──────┘            │ │
│  │       │                                          │                   │ │
│  │       │                                          ▼                   │ │
│  │       │                                   Generated Code             │ │
│  │       │                                          │                   │ │
│  └───────┼──────────────────────────────────────────┼────────────────────┘ │
│          │                                          │                     │
│          │                                          ▼                     │
│  ┌───────┼────────────────────────────────────────────────────────────────┐
│  │       │              PHASE 3: VALIDATION LOOP                         │
│  │       │                                                                │
│  │       │  ┌─────────────────────────────────────────────────────────┐  │
│  │       │  │              7-STAGE VALIDATION PIPELINE                 │  │
│  │       │  │                                                          │  │
│  │       │  │  ┌──────────┐                                           │  │
│  │       │  │  │1. SYNTAX │ TypeScript compile check                  │  │
│  │       │  │  └────┬─────┘                                           │  │
│  │       │  │       │                                                  │  │
│  │       ├──┼───────┼──────────────────────────────────────────────┐  │  │
│  │       │  │       ▼                                               │  │  │
│  │       │  │  ┌──────────────┐                                     │  │  │
│  │       │  │  │2. ASSERTIONS │◄── Contract.validation.assertions  │  │  │
│  │       │  │  └────┬─────────┘                                     │  │  │
│  │       │  │       │                                               │  │  │
│  │       │  │       ▼                                               │  │  │
│  │       │  │  ┌──────────────────┐                                 │  │  │
│  │       │  │  │3. STATIC ANALYSIS│◄── Contract.validation.rules   │  │  │
│  │       │  │  └────┬─────────────┘                                 │  │  │
│  │       │  │       │                                               │  │  │
│  │       │  │       ▼                                               │  │  │
│  │       │  │  ┌──────────────────┐                                 │  │  │
│  │       │  │  │4. TEST GEN & RUN │◄── Contract.validation.tests   │  │  │
│  │       │  │  └────┬─────────────┘                                 │  │  │
│  │       │  │       │                                               │  │  │
│  │       │  │       ▼                                               │  │  │
│  │       │  │  ┌──────────────────┐                                 │  │  │
│  │       │  │  │5. QUALITY GATES  │◄── Contract.validation.gates   │  │  │
│  │       │  │  └────┬─────────────┘                                 │  │  │
│  │       │  │       │                                               │  │  │
│  │       │  │       ▼                                               │  │  │
│  │       │  │  ┌──────────────────┐                                 │  │  │
│  │       │  │  │6. SECURITY SCAN  │◄── Contract.acceptance.security│  │  │
│  │       │  │  └────┬─────────────┘                                 │  │  │
│  │       │  │       │                                               │  │  │
│  │       │  │       ▼                                               │  │  │
│  │       │  │  ┌──────────────────┐                                 │  │  │
│  │       │  │  │7. RUNTIME TEST   │ Deploy in Docker, run API tests│  │  │
│  │       │  │  └────┬─────────────┘                                 │  │  │
│  │       │  │       │                                               │  │  │
│  │       │  └───────┼───────────────────────────────────────────────┘  │  │
│  │       │          │                                                  │  │
│  │       │          ▼                                                  │  │
│  │       │    ┌───────────┐                                            │  │
│  │       │    │ALL PASSED?│                                            │  │
│  │       │    └─────┬─────┘                                            │  │
│  │       │          │                                                  │  │
│  │       │    ┌─────┴─────┐                                            │  │
│  │       │    │           │                                            │  │
│  │       │   Yes          No                                           │  │
│  │       │    │           │                                            │  │
│  │       │    ▼           ▼                                            │  │
│  │       │ SUCCESS   Feedback ──► LLM ──► Corrected Code               │  │
│  │       │    │       Generator      (Code Fix)    │                   │  │
│  │       │    │           │                        │                   │  │
│  │       │    │           └────────────────────────┼──► [Back to       │  │
│  │       │    │                                    │     Stage 1]      │  │
│  │       │    │                                    │                   │  │
│  └───────┼────┼────────────────────────────────────┘                   │  │
│          │    │                                                        │  │
│          │    ▼                                                        │  │
│          │  FINAL CODE ──► User                                        │  │
│          │                                                             │  │
└──────────┴─────────────────────────────────────────────────────────────────┘

✅ Korzyści:
- LLM generuje elastyczny kod (nie sztywne szablony)
- Contract AI definiuje reguły walidacji
- Automatyczna iteracja do skutku
- Mierzalna jakość kodu
```

---

## Contract AI: Trzy Warstwy Specyfikacji

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONTRACT AI STRUCTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 1: DEFINITION (CO)                                           │ │
│  │                                                                     │ │
│  │   app: { name, version, description }                              │ │
│  │   entities: [ { name, fields, relations } ]                        │ │
│  │   events: [ { name, fields, triggers } ]                           │ │
│  │   workflows: [ { name, steps, conditions } ]                       │ │
│  │   api: { version, prefix, resources }                              │ │
│  │                                                                     │ │
│  │   → Definiuje STRUKTURĘ aplikacji                                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                 │                                        │
│                                 ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 2: GENERATION (JAK GENEROWAĆ)                                │ │
│  │                                                                     │ │
│  │   generation: {                                                     │ │
│  │     instructions: [                                                 │ │
│  │       { target: 'api', priority: 'must', instruction: '...' }     │ │
│  │     ],                                                              │ │
│  │     patterns: [                                                     │ │
│  │       { name: 'Route Pattern', template: '...' }                   │ │
│  │     ],                                                              │ │
│  │     constraints: [                                                  │ │
│  │       { type: 'no-any', severity: 'error' }                        │ │
│  │     ],                                                              │ │
│  │     techStack: { backend: {...}, frontend: {...} }                 │ │
│  │   }                                                                 │ │
│  │                                                                     │ │
│  │   → Instrukcje dla LLM jak generować kod                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                 │                                        │
│                                 ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ LAYER 3: VALIDATION (JAK SPRAWDZAĆ)                                │ │
│  │                                                                     │ │
│  │   validation: {                                                     │ │
│  │     assertions: [                                                   │ │
│  │       { id: 'A001', check: { type: 'file-exists', path: '...' } } │ │
│  │     ],                                                              │ │
│  │     tests: [                                                        │ │
│  │       { name: 'API Tests', scenarios: [...] }                      │ │
│  │     ],                                                              │ │
│  │     staticRules: [ 'no-unused-vars', 'no-any' ],                   │ │
│  │     qualityGates: [                                                 │ │
│  │       { metric: 'test-coverage', threshold: 70 }                   │ │
│  │     ]                                                               │ │
│  │   }                                                                 │ │
│  │                                                                     │ │
│  │   acceptance: {                                                     │ │
│  │     testsPass: true,                                                │ │
│  │     minCoverage: 70,                                                │ │
│  │     securityChecks: [...]                                           │ │
│  │   }                                                                 │ │
│  │                                                                     │ │
│  │   → Reguły walidacji i kryteria akceptacji                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Feedback Loop Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FEEDBACK LOOP                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    ITERATION N                                   │   │
│   │                                                                  │   │
│   │    Generated Code                                                │   │
│   │         │                                                        │   │
│   │         ▼                                                        │   │
│   │    ┌─────────────────────────────────────────────────────────┐  │   │
│   │    │              VALIDATION RESULT                          │  │   │
│   │    │                                                          │  │   │
│   │    │  Stage 1: Syntax ────────────────────────── ✅ PASS     │  │   │
│   │    │  Stage 2: Assertions ────────────────────── ❌ FAIL     │  │   │
│   │    │           └─ A011: Missing error handling               │  │   │
│   │    │           └─ A012: No email validation                  │  │   │
│   │    │  Stage 3: Static Analysis ───────────────── ⏸️ SKIPPED  │  │   │
│   │    │  Stage 4: Tests ─────────────────────────── ⏸️ SKIPPED  │  │   │
│   │    │  ...                                                     │  │   │
│   │    └─────────────────────────────────────────────────────────┘  │   │
│   │                    │                                             │   │
│   │                    ▼                                             │   │
│   │    ┌─────────────────────────────────────────────────────────┐  │   │
│   │    │              FEEDBACK GENERATOR                          │  │   │
│   │    │                                                          │  │   │
│   │    │  Input:                                                  │  │   │
│   │    │    - Validation errors                                   │  │   │
│   │    │    - Contract requirements                               │  │   │
│   │    │    - Failed files                                        │  │   │
│   │    │                                                          │  │   │
│   │    │  Output:                                                 │  │   │
│   │    │  ┌───────────────────────────────────────────────────┐  │  │   │
│   │    │  │ FILE: api/src/routes/contact.ts                   │  │  │   │
│   │    │  │                                                    │  │  │   │
│   │    │  │ ISSUES:                                            │  │  │   │
│   │    │  │ 1. [ERROR] Missing try-catch in POST handler      │  │  │   │
│   │    │  │    Line: 25-35                                     │  │  │   │
│   │    │  │    Contract ref: generation.instructions[1]        │  │  │   │
│   │    │  │                                                    │  │  │   │
│   │    │  │ 2. [ERROR] No email validation                     │  │  │   │
│   │    │  │    Contract ref: validation.assertions.A012        │  │  │   │
│   │    │  │    Pattern to use: generation.patterns[1]          │  │  │   │
│   │    │  │                                                    │  │  │   │
│   │    │  │ EXPECTED PATTERN:                                  │  │  │   │
│   │    │  │ ```typescript                                      │  │  │   │
│   │    │  │ router.post('/', async (req, res) => {            │  │  │   │
│   │    │  │   try {                                            │  │  │   │
│   │    │  │     const validation = validate(req.body);         │  │  │   │
│   │    │  │     if (!validation.valid) {                       │  │  │   │
│   │    │  │       return res.status(400).json({errors});       │  │  │   │
│   │    │  │     }                                              │  │  │   │
│   │    │  │     // ... rest                                    │  │  │   │
│   │    │  │   } catch (error) {                                │  │  │   │
│   │    │  │     res.status(500).json({error});                 │  │  │   │
│   │    │  │   }                                                │  │  │   │
│   │    │  │ });                                                │  │  │   │
│   │    │  │ ```                                                │  │  │   │
│   │    │  └───────────────────────────────────────────────────┘  │  │   │
│   │    └─────────────────────────────────────────────────────────┘  │   │
│   │                    │                                             │   │
│   │                    ▼                                             │   │
│   │    ┌─────────────────────────────────────────────────────────┐  │   │
│   │    │                  LLM CODE CORRECTION                     │  │   │
│   │    │                                                          │  │   │
│   │    │  System: "You are a code correction assistant..."       │  │   │
│   │    │                                                          │  │   │
│   │    │  User: [Feedback with context]                          │  │   │
│   │    │                                                          │  │   │
│   │    │  Output: Corrected code for api/src/routes/contact.ts   │  │   │
│   │    └─────────────────────────────────────────────────────────┘  │   │
│   │                    │                                             │   │
│   │                    ▼                                             │   │
│   │              ITERATION N+1                                       │   │
│   │                                                                  │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Komponenty Systemu

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM COMPONENTS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         CLI / STUDIO                             │    │
│  │                                                                  │    │
│  │   reclapp generate-ai <contract> [--max-iterations N]           │    │
│  │   reclapp studio  (Web UI with LLM chat)                        │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ORCHESTRATOR                                  │    │
│  │                                                                  │    │
│  │   class GenerationOrchestrator {                                │    │
│  │     contractGenerator: ContractGenerator;                        │    │
│  │     codeGenerator: LLMCodeGenerator;                            │    │
│  │     validationLoop: ValidationLoop;                              │    │
│  │     metricsCollector: MetricsCollector;                         │    │
│  │                                                                  │    │
│  │     async run(prompt: string): Promise<GenerationResult>        │    │
│  │   }                                                              │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                          │         │         │                           │
│               ┌──────────┘         │         └──────────┐               │
│               ▼                    ▼                    ▼               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ CONTRACT         │  │ CODE             │  │ VALIDATION       │      │
│  │ GENERATOR        │  │ GENERATOR        │  │ LOOP             │      │
│  │                  │  │                  │  │                  │      │
│  │ - Schema builder │  │ - Prompt builder │  │ - 7 stages       │      │
│  │ - Self-correct   │  │ - LLM code gen   │  │ - Feedback gen   │      │
│  │ - Validator      │  │ - File parser    │  │ - Code correct   │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                     │                 │
│           └──────────┬──────────┴──────────┬──────────┘                 │
│                      ▼                     ▼                            │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                       LLM CLIENT                              │      │
│  │                                                               │      │
│  │   Supported providers:                                        │      │
│  │   - Ollama (local)                                           │      │
│  │   - OpenAI (gpt-4, gpt-4o)                                   │      │
│  │   - Anthropic (claude-3)                                     │      │
│  │   - DeepSeek (deepseek-coder)                                │      │
│  │                                                               │      │
│  │   Features:                                                   │      │
│  │   - Streaming responses                                       │      │
│  │   - JSON mode                                                 │      │
│  │   - Token counting                                            │      │
│  │   - Retry with backoff                                        │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                    │                                     │
│                                    ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                    VALIDATORS                                 │      │
│  │                                                               │      │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│      │
│  │  │ TypeScript│ │ ESLint   │ │ Jest     │ │ Custom           ││      │
│  │  │ Compiler │ │ Runner   │ │ Runner   │ │ Assertions       ││      │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│      │
│  │                                                               │      │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                      │      │
│  │  │ Security │ │ Coverage │ │ Docker   │                      │      │
│  │  │ Scanner  │ │ Reporter │ │ Runtime  │                      │      │
│  │  └──────────┘ └──────────┘ └──────────┘                      │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Metryki i Monitoring

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         METRICS DASHBOARD                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ GENERATION METRICS                                               │    │
│  │                                                                  │    │
│  │  Iterations to Success                    Quality Gates          │    │
│  │  ┌────────────────────────┐              ┌────────────────────┐ │    │
│  │  │ ████████░░░░ 2.4 avg  │              │ Coverage:   85% ✅ │ │    │
│  │  │ Min: 1  Max: 8        │              │ Type Errs:   0  ✅ │ │    │
│  │  └────────────────────────┘              │ Lint Errs:   2  ⚠️ │ │    │
│  │                                          │ Security:    0  ✅ │ │    │
│  │  Success Rate by Stage                   └────────────────────┘ │    │
│  │  ┌────────────────────────────────────┐                         │    │
│  │  │ Syntax:     ████████████ 98%       │                         │    │
│  │  │ Assertions: ████████░░░░ 72%       │                         │    │
│  │  │ Static:     █████████░░░ 85%       │                         │    │
│  │  │ Tests:      ███████░░░░░ 68%       │                         │    │
│  │  │ Quality:    ████████░░░░ 78%       │                         │    │
│  │  │ Security:   ██████████░░ 92%       │                         │    │
│  │  │ Runtime:    ████████░░░░ 75%       │                         │    │
│  │  └────────────────────────────────────┘                         │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ LLM USAGE                                                        │    │
│  │                                                                  │    │
│  │  Calls: 847    Tokens: 1.2M    Est. Cost: $12.40                │    │
│  │                                                                  │    │
│  │  Tokens by Phase                                                 │    │
│  │  ┌────────────────────────────────────┐                         │    │
│  │  │ Contract Gen:  ████░░░░░░ 15%      │                         │    │
│  │  │ Code Gen:      ██████████ 60%      │                         │    │
│  │  │ Correction:    ████░░░░░░ 20%      │                         │    │
│  │  │ Test Gen:      █░░░░░░░░░  5%      │                         │    │
│  │  └────────────────────────────────────┘                         │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ COMMON FAILURE PATTERNS                                          │    │
│  │                                                                  │    │
│  │  1. Missing error handling ──────────────────── 34% of failures │    │
│  │  2. Invalid TypeScript types ────────────────── 21% of failures │    │
│  │  3. Test assertion mismatches ───────────────── 18% of failures │    │
│  │  4. Missing validation ──────────────────────── 15% of failures │    │
│  │  5. Import errors ───────────────────────────── 12% of failures │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Podsumowanie Zmian 2.1 → 2.2

| Aspekt | Reclapp 2.1 | Reclapp 2.2 |
|--------|-------------|-------------|
| **Generacja kodu** | Deterministyczne szablony | LLM-driven |
| **Contract AI** | Schemat danych | Pełna specyfikacja (CO + JAK + KIEDY) |
| **Walidacja** | Tylko składnia | 7-stage pipeline |
| **Feedback** | Brak | Automatyczny do LLM |
| **Iteracja** | Manualna | Automatyczna do sukcesu |
| **Testy** | Opcjonalne | Generowane i wymagane |
| **Metryki** | Brak | Pełne dashboard |

---

## Następne Kroki

1. **Implementacja Phase 1** - Contract Generator z self-correction
2. **Implementacja Phase 2** - LLM Code Generator z prompt builder
3. **Implementacja Phase 3** - 7-stage Validation Pipeline
4. **Integracja z CLI** - nowa komenda `generate-ai`
5. **Dashboard** - metryki i monitoring

---

*Specyfikacja architektury Reclapp 2.2 | Styczeń 2026*
