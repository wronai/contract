# Reclapp 2.2: Implementation TODO & Prompts

**Data:** 1 Stycznia 2026  
**Wersja:** 2.4.1  
**Status:** Implementation Guide

---

## Spis Treści

1. [Przegląd Implementacji](#1-przegląd-implementacji)
2. [FAZA 1: Contract AI Types](#2-faza-1-contract-ai-types)
3. [FAZA 2: Contract Generator](#3-faza-2-contract-generator)
4. [FAZA 3: LLM Code Generator](#4-faza-3-llm-code-generator)
5. [FAZA 4: Validation Pipeline](#5-faza-4-validation-pipeline)
6. [FAZA 5: Feedback Loop](#6-faza-5-feedback-loop)
7. [FAZA 6: CLI Integration](#7-faza-6-cli-integration)
8. [FAZA 7: Testing & QA](#8-faza-7-testing--qa)

---

## 1. Przegląd Implementacji

### Architektura Docelowa

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION PHASES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FAZA 1 ──► FAZA 2 ──► FAZA 3 ──► FAZA 4 ──► FAZA 5 ──► FAZA 6 │
│  Types     Contract   Code Gen   Validation  Feedback   CLI     │
│  (2 dni)   Gen (3 dni) (4 dni)   (5 dni)    (3 dni)   (2 dni)  │
│                                                                  │
│  Łącznie: ~19 dni roboczych + 5 dni QA = 24 dni                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Struktura Katalogów

```
src/
├── core/
│   ├── contract-ai/
│   │   ├── types/
│   │   │   ├── definition.ts      # Layer 1: CO
│   │   │   ├── generation.ts      # Layer 2: JAK
│   │   │   ├── validation.ts      # Layer 3: KIEDY
│   │   │   └── index.ts
│   │   ├── generator/
│   │   │   ├── contract-generator.ts
│   │   │   ├── prompt-builder.ts
│   │   │   └── self-correction.ts
│   │   └── parser/
│   │       └── contract-parser.ts
│   ├── code-generator/
│   │   ├── llm-generator.ts
│   │   ├── prompt-templates/
│   │   │   ├── api.ts
│   │   │   ├── frontend.ts
│   │   │   └── database.ts
│   │   └── file-parser.ts
│   ├── validation/
│   │   ├── pipeline/
│   │   │   ├── syntax-validator.ts
│   │   │   ├── assertion-validator.ts
│   │   │   ├── static-analyzer.ts
│   │   │   ├── test-runner.ts
│   │   │   ├── quality-checker.ts
│   │   │   ├── security-scanner.ts
│   │   │   └── runtime-validator.ts
│   │   └── pipeline-orchestrator.ts
│   ├── feedback/
│   │   ├── feedback-generator.ts
│   │   ├── code-corrector.ts
│   │   └── iteration-manager.ts
│   └── llm/
│       ├── client.ts
│       ├── providers/
│       │   ├── ollama.ts
│       │   ├── openai.ts
│       │   └── anthropic.ts
│       └── token-counter.ts
└── cli/
    └── commands/
        └── generate-ai.ts
```

---

## 2. FAZA 1: Contract AI Types

**Czas:** 2 dni  
**Cel:** Zdefiniować kompletne typy TypeScript dla 3-warstwowego Contract AI

### Task 1.1: Definition Types (Layer 1 - CO)

**Plik:** `src/core/contract-ai/types/definition.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz plik TypeScript z typami dla warstwy Definition Contract AI.

Wymagania:
1. AppDefinition - nazwa, wersja, opis aplikacji
2. EntityDefinition - encje z polami i relacjami
3. FieldDefinition - pola z typami i adnotacjami
4. EventDefinition - eventy domenowe
5. WorkflowDefinition - przepływy pracy z krokami
6. ApiDefinition - endpointy REST API

Typy pól do obsługi:
- Podstawowe: String, Int, Float, Boolean, UUID, DateTime
- Rozszerzone: Email, URL, Phone, Money, JSON, Text
- Relacje: OneToOne, OneToMany, ManyToOne, ManyToMany

Adnotacje pól:
- required, unique, generated, default, min, max, pattern, enum

Eksportuj główny interfejs DefinitionLayer zawierający wszystkie komponenty.
Dodaj JSDoc do każdego typu z opisem i przykładami.
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `AppDefinition` interface
- [ ] `EntityDefinition` interface
- [ ] `FieldDefinition` interface z union type dla typów
- [ ] `RelationDefinition` interface
- [ ] `EventDefinition` interface
- [ ] `WorkflowDefinition` interface
- [ ] `ApiDefinition` interface
- [ ] `DefinitionLayer` główny interface
- [ ] Testy jednostkowe dla typów
- [ ] Przykłady w JSDoc

---

### Task 1.2: Generation Types (Layer 2 - JAK)

**Plik:** `src/core/contract-ai/types/generation.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz plik TypeScript z typami dla warstwy Generation Contract AI.
Ta warstwa definiuje JAK LLM ma generować kod.

Wymagania:
1. GenerationInstruction - instrukcje dla LLM
   - target: 'api' | 'frontend' | 'database' | 'tests' | 'all'
   - priority: 'must' | 'should' | 'may'
   - instruction: string
   - examples?: CodeExample[]

2. CodePattern - wzorce kodu do naśladowania
   - name: string
   - description: string
   - template: string (kod wzorcowy)
   - appliesTo: string[] (do jakich targetów)
   - variables?: PatternVariable[] (zmienne do podstawienia)

3. TechnicalConstraint - ograniczenia techniczne
   - type: enum (no-external-deps, max-file-size, naming-convention, custom)
   - rule: string
   - severity: 'error' | 'warning'
   - autoFix?: boolean

4. TechStack - stack technologiczny
   - backend: { runtime, language, framework, port }
   - frontend: { framework, bundler, styling }
   - database?: { type, connection }

Eksportuj GenerationLayer zawierający:
- instructions: GenerationInstruction[]
- patterns: CodePattern[]
- constraints: TechnicalConstraint[]
- techStack: TechStack
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `GenerationInstruction` interface
- [ ] `CodePattern` interface
- [ ] `PatternVariable` interface
- [ ] `TechnicalConstraint` interface
- [ ] `TechStack` interface
- [ ] `GenerationLayer` główny interface
- [ ] Enum dla constraint types
- [ ] Testy jednostkowe
- [ ] Przykładowe patterns w dokumentacji

---

### Task 1.3: Validation Types (Layer 3 - KIEDY)

**Plik:** `src/core/contract-ai/types/validation.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz plik TypeScript z typami dla warstwy Validation Contract AI.
Ta warstwa definiuje JAK SPRAWDZAĆ wygenerowany kod i KIEDY jest gotowy.

Wymagania:
1. CodeAssertion - asercje które kod musi spełniać
   - id: string (np. 'A001')
   - description: string
   - check: AssertionCheck (union type)
   - errorMessage: string
   - severity: 'error' | 'warning'

2. AssertionCheck - typy sprawdzeń (union type):
   - file-exists: { path: string }
   - file-contains: { path: string, pattern: string | RegExp }
   - file-not-contains: { path: string, pattern: string | RegExp }
   - exports-function: { path: string, functionName: string }
   - exports-class: { path: string, className: string }
   - implements-interface: { path: string, interfaceName: string }
   - has-error-handling: { path: string }
   - has-validation: { entityName: string, fieldName: string }
   - custom: { validator: string } // nazwa funkcji walidującej

3. TestSpecification - specyfikacja testów do wygenerowania
   - name: string
   - type: 'unit' | 'integration' | 'e2e' | 'api'
   - target: string (encja lub endpoint)
   - scenarios: TestScenario[]

4. TestScenario
   - name: string
   - given: string (preconditions)
   - when: string (action)
   - then: string (expected outcome)
   - testData?: Record<string, any>
   - expectedResult?: ExpectedResult

5. QualityGate - bramki jakości
   - name: string
   - metric: QualityMetric enum
   - threshold: number
   - operator: '>' | '>=' | '<' | '<=' | '=='

6. AcceptanceCriteria - kryteria akceptacji
   - testsPass: boolean
   - minCoverage: number
   - maxLintErrors: number
   - maxResponseTime: number
   - securityChecks: SecurityCheck[]
   - custom: CustomCriterion[]

Eksportuj ValidationLayer zawierający wszystkie komponenty.
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `CodeAssertion` interface
- [ ] `AssertionCheck` union type (8+ typów)
- [ ] `TestSpecification` interface
- [ ] `TestScenario` interface
- [ ] `QualityGate` interface
- [ ] `QualityMetric` enum
- [ ] `SecurityCheck` interface
- [ ] `AcceptanceCriteria` interface
- [ ] `ValidationLayer` główny interface
- [ ] Testy jednostkowe
- [ ] Przykłady assertions

---

### Task 1.4: Main Contract AI Interface

**Plik:** `src/core/contract-ai/types/index.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz główny plik eksportujący typy Contract AI.

Wymagania:
1. Import wszystkich warstw z osobnych plików
2. Stwórz główny interface ContractAI łączący 3 warstwy:
   - definition: DefinitionLayer (required)
   - generation: GenerationLayer (required)
   - validation: ValidationLayer (required)
   - metadata?: ContractMetadata

3. ContractMetadata:
   - version: string
   - author?: string
   - createdAt: Date
   - updatedAt: Date
   - tags?: string[]

4. Stwórz type guards:
   - isValidContractAI(obj: unknown): obj is ContractAI
   - hasDefinitionLayer(contract: Partial<ContractAI>): boolean
   - hasGenerationLayer(contract: Partial<ContractAI>): boolean
   - hasValidationLayer(contract: Partial<ContractAI>): boolean

5. Eksportuj wszystko z jednego miejsca
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] Re-export wszystkich typów
- [ ] `ContractAI` główny interface
- [ ] `ContractMetadata` interface
- [ ] Type guards
- [ ] Barrel export (index.ts)

---

## 3. FAZA 2: Contract Generator

**Czas:** 3 dni  
**Cel:** Implementacja generatora Contract AI z self-correction

### Task 2.1: Prompt Builder dla Contract Generation

**Plik:** `src/core/contract-ai/generator/prompt-builder.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz PromptBuilder do generowania promptów dla LLM tworzącego Contract AI.

Klasa ContractPromptBuilder:

1. buildSystemPrompt(): string
   - Zwraca system prompt definiujący rolę LLM jako generatora Contract AI
   - Zawiera schemat JSON Contract AI
   - Zawiera przykłady poprawnych kontraktów
   - Zawiera listę typów pól i adnotacji

2. buildUserPrompt(requirements: string): string
   - Formatuje wymagania użytkownika
   - Dodaje instrukcje o formacie wyjścia (JSON)

3. buildCorrectionPrompt(
     originalPrompt: string,
     contract: Partial<ContractAI>,
     errors: ValidationError[]
   ): string
   - Buduje prompt do poprawy kontraktu
   - Zawiera oryginalny prompt
   - Zawiera aktualny (błędny) kontrakt
   - Zawiera listę błędów do naprawienia
   - Zawiera wskazówki jak naprawić każdy błąd

4. buildExampleContracts(): string
   - Zwraca 2-3 przykładowe kontrakty różnej złożoności
   - CRM (prosty), E-commerce (średni), SaaS (złożony)

System prompt powinien zawierać:
- Opis 3 warstw Contract AI
- Schemat JSON każdej warstwy
- Listę dozwolonych typów pól
- Listę dozwolonych adnotacji
- Przykłady dobrych praktyk
- Częste błędy do unikania
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `ContractPromptBuilder` class
- [ ] `buildSystemPrompt()` method
- [ ] `buildUserPrompt()` method
- [ ] `buildCorrectionPrompt()` method
- [ ] `buildExampleContracts()` method
- [ ] Przykładowe kontrakty (3 poziomy złożoności)
- [ ] Testy jednostkowe

---

### Task 2.2: Contract Validator

**Plik:** `src/core/contract-ai/parser/contract-validator.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz ContractValidator do walidacji wygenerowanych Contract AI.

Klasa ContractValidator:

1. validate(contract: unknown): ValidationResult
   - Sprawdza czy obiekt jest poprawnym ContractAI
   - Zwraca { valid: boolean, errors: ValidationError[] }

2. validateDefinitionLayer(layer: unknown): ValidationError[]
   - Sprawdza wymagane pola (app, entities)
   - Waliduje typy pól w entities
   - Sprawdza poprawność relacji (czy target entity istnieje)
   - Wykrywa cykliczne referencje

3. validateGenerationLayer(layer: unknown): ValidationError[]
   - Sprawdza czy instructions mają poprawne targety
   - Waliduje patterns (czy template jest poprawnym kodem)
   - Sprawdza constraints

4. validateValidationLayer(layer: unknown): ValidationError[]
   - Sprawdza assertions (czy ścieżki są poprawne)
   - Waliduje test scenarios
   - Sprawdza quality gates (czy metryki są poprawne)

5. validateCrossLayerConsistency(contract: ContractAI): ValidationError[]
   - Sprawdza czy assertions odnoszą się do encji z Definition
   - Sprawdza czy patterns są zgodne z techStack
   - Sprawdza czy testy pokrywają wszystkie encje

Interface ValidationError:
- code: string (np. 'E001', 'E002')
- message: string
- path: string (np. 'definition.entities[0].fields[2]')
- severity: 'error' | 'warning'
- suggestion?: string

Kody błędów:
- E001: Missing required field
- E002: Invalid field type
- E003: Unknown entity reference
- E004: Circular reference detected
- E005: Invalid pattern template
- E006: Invalid assertion check
- E007: Cross-layer inconsistency
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `ContractValidator` class
- [ ] `validate()` główna metoda
- [ ] `validateDefinitionLayer()` method
- [ ] `validateGenerationLayer()` method  
- [ ] `validateValidationLayer()` method
- [ ] `validateCrossLayerConsistency()` method
- [ ] `ValidationError` interface
- [ ] Kody błędów z opisami
- [ ] Testy jednostkowe (min. 20 przypadków)

---

### Task 2.3: Contract Generator z Self-Correction

**Plik:** `src/core/contract-ai/generator/contract-generator.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz ContractGenerator - główną klasę generującą Contract AI z LLM.

Klasa ContractGenerator:

Constructor:
- llmClient: LLMClient
- validator: ContractValidator
- promptBuilder: ContractPromptBuilder
- options: GeneratorOptions

Interface GeneratorOptions:
- maxAttempts: number (default: 5)
- temperature: number (default: 0.7)
- model: string (default: 'llama3')

Metody:

1. async generate(userPrompt: string): Promise<GenerationResult>
   - Główna metoda generująca kontrakt
   - Wywołuje LLM z system + user prompt
   - Parsuje JSON z odpowiedzi
   - Waliduje kontrakt
   - Jeśli błędy: wywołuje self-correction loop
   - Zwraca { success, contract, attempts, errors }

2. private async callLLM(prompt: LLMPrompt): Promise<string>
   - Wywołuje LLM client
   - Obsługuje błędy i retry
   - Loguje tokeny i czas

3. private parseContractFromResponse(response: string): ContractAI | null
   - Ekstrahuje JSON z odpowiedzi LLM
   - Obsługuje markdown code blocks
   - Obsługuje częściowy JSON

4. private async selfCorrect(
     userPrompt: string,
     contract: Partial<ContractAI>,
     errors: ValidationError[],
     attempt: number
   ): Promise<GenerationResult>
   - Buduje correction prompt
   - Wywołuje LLM ponownie
   - Waliduje poprawiony kontrakt
   - Rekurencyjnie poprawia do maxAttempts

5. private generateFeedbackLevel(attempt: number): FeedbackLevel
   - attempt 1-2: 'general' (ogólne wskazówki)
   - attempt 3-4: 'detailed' (szczegółowe błędy z line numbers)
   - attempt 5+: 'explicit' (dokładne instrukcje co zmienić)

Interface GenerationResult:
- success: boolean
- contract?: ContractAI
- attempts: number
- errors: ValidationError[]
- tokensUsed: number
- timeMs: number

Logowanie:
- Log każdej próby z błędami
- Log sukcesu z liczbą iteracji
- Metryki do Prometheus/statsd
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `ContractGenerator` class
- [ ] `generate()` główna metoda
- [ ] `callLLM()` z obsługą błędów
- [ ] `parseContractFromResponse()` z obsługą edge cases
- [ ] `selfCorrect()` rekurencyjna korekcja
- [ ] `generateFeedbackLevel()` progresywny feedback
- [ ] `GenerationResult` interface
- [ ] Logowanie i metryki
- [ ] Testy jednostkowe
- [ ] Testy integracyjne z mock LLM

---

## 4. FAZA 3: LLM Code Generator

**Czas:** 4 dni  
**Cel:** Implementacja generatora kodu używającego LLM z kontekstem Contract AI

### Task 3.1: Generation Prompt Templates

**Plik:** `src/core/code-generator/prompt-templates/api.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz szablony promptów do generowania kodu API przez LLM.

Klasa ApiPromptTemplate:

1. buildPrompt(contract: ContractAI): string
   Buduje kompletny prompt zawierający:
   
   SEKCJA 1: CONTEXT
   - Nazwa aplikacji i opis
   - Tech stack (z contract.generation.techStack)
   - Lista encji z polami i typami
   
   SEKCJA 2: INSTRUCTIONS
   - Wszystkie instrukcje gdzie target === 'api' || target === 'all'
   - Posortowane według priority (must > should > may)
   
   SEKCJA 3: PATTERNS
   - Wzorce kodu do naśladowania
   - Każdy pattern z opisem kiedy używać
   
   SEKCJA 4: CONSTRAINTS
   - Ograniczenia techniczne
   - Co jest zabronione
   
   SEKCJA 5: VALIDATION REQUIREMENTS
   - Asercje które kod musi spełnić
   - Test scenarios do uwzględnienia
   
   SEKCJA 6: OUTPUT FORMAT
   - Format plików: ```typescript:path/to/file.ts
   - Lista wymaganych plików
   - Struktura katalogów

2. getRequiredFiles(contract: ContractAI): string[]
   - Zwraca listę plików które muszą być wygenerowane
   - server.ts, routes/*.ts, validators/*.ts, types/*.ts

3. getSystemPrompt(): string
   - Rola: "Expert Node.js/Express developer"
   - Zasady generowania kodu
   - Formatowanie output

Przykładowy output prompt dla CRM:
───────────────────────────────────
# CODE GENERATION TASK: API

## APPLICATION
Name: CRM System
Description: Customer Relationship Management
Tech: Node.js + Express + TypeScript

## ENTITIES

### Contact
| Field | Type | Required | Unique |
|-------|------|----------|--------|
| id | UUID | auto | yes |
| email | Email | yes | yes |
| firstName | String | yes | no |
...

## INSTRUCTIONS (sorted by priority)

[MUST] Use Express.js with TypeScript. Each entity must have its own route file.
[MUST] Implement proper error handling with try-catch.
[MUST] Validate all inputs before processing.
[SHOULD] Use in-memory storage (Map) for simplicity.
...

## PATTERNS

### Express Route Pattern
Use this pattern for all route files:
```typescript
import { Router } from 'express';
const router = Router();
// ... pattern code
export default router;
```

## CONSTRAINTS
- [ERROR] No database dependencies. Use in-memory storage.
- [ERROR] No 'any' types allowed.
- [WARNING] Use camelCase for variables.

## VALIDATION REQUIREMENTS
Generated code MUST pass these checks:
- File api/src/server.ts exists
- File api/src/routes/contact.ts exists
- Routes have try-catch error handling
- Email validation is implemented

## OUTPUT FORMAT
Generate files in this format:
```typescript:api/src/server.ts
// code here
```

Required files:
- api/src/server.ts
- api/src/routes/contact.ts
- api/src/routes/company.ts
- api/src/validators/contact.ts
- api/src/types/index.ts
───────────────────────────────────
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `ApiPromptTemplate` class
- [ ] `buildPrompt()` method
- [ ] `getRequiredFiles()` method
- [ ] `getSystemPrompt()` method
- [ ] Formatowanie encji jako tabela
- [ ] Sortowanie instrukcji
- [ ] Testy jednostkowe

---

### Task 3.2: Frontend Prompt Template

**Plik:** `src/core/code-generator/prompt-templates/frontend.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz szablony promptów do generowania kodu Frontend przez LLM.

Klasa FrontendPromptTemplate:

Analogicznie do ApiPromptTemplate, ale dla frontendu:

1. buildPrompt(contract: ContractAI): string
   - Tech stack: React + TypeScript + Tailwind
   - Komponenty dla każdej encji (List, Form, Detail)
   - Routing z React Router
   - API client do komunikacji z backendem

2. getRequiredFiles(contract: ContractAI): string[]
   - App.tsx, index.tsx
   - components/{Entity}List.tsx
   - components/{Entity}Form.tsx
   - hooks/use{Entity}.ts
   - api/client.ts

3. getSystemPrompt(): string
   - Rola: "Expert React/TypeScript developer"
   - Zasady: functional components, hooks, Tailwind

Wzorce do uwzględnienia:
- React functional component
- Custom hook pattern
- Form validation pattern
- API fetch pattern
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `FrontendPromptTemplate` class
- [ ] `buildPrompt()` method
- [ ] `getRequiredFiles()` method
- [ ] `getSystemPrompt()` method
- [ ] Wzorce React
- [ ] Testy jednostkowe

---

### Task 3.3: LLM Code Generator

**Plik:** `src/core/code-generator/llm-generator.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz LLMCodeGenerator - główną klasę generującą kod z LLM.

Klasa LLMCodeGenerator:

Constructor:
- llmClient: LLMClient
- promptTemplates: Map<GenerationTarget, PromptTemplate>
- options: CodeGeneratorOptions

Interface CodeGeneratorOptions:
- maxTokens: number (default: 8000)
- temperature: number (default: 0.3) // niższa dla kodu
- model: string

Metody:

1. async generate(contract: ContractAI): Promise<GeneratedCode>
   - Określa targets do wygenerowania
   - Dla każdego target wywołuje generateTarget()
   - Agreguje wyniki
   - Zwraca { files, metadata }

2. async generateTarget(
     contract: ContractAI,
     target: GenerationTarget
   ): Promise<GeneratedFile[]>
   - Pobiera odpowiedni PromptTemplate
   - Buduje prompt
   - Wywołuje LLM
   - Parsuje pliki z odpowiedzi
   - Waliduje podstawową składnię

3. private parseFilesFromResponse(response: string): GeneratedFile[]
   - Regex: ```(?:typescript|javascript|json):(.+?)\n([\s\S]*?)```
   - Ekstrahuje path i content
   - Obsługuje wiele plików

4. private validateBasicSyntax(file: GeneratedFile): SyntaxError[]
   - Dla .ts/.tsx: sprawdza czy parsuje się jako TypeScript
   - Dla .json: sprawdza czy parsuje się jako JSON
   - Zwraca listę błędów składniowych

5. determineTargets(contract: ContractAI): GenerationTarget[]
   - Na podstawie contract.generation.techStack
   - Zwraca ['api', 'frontend', 'database', etc.]

Interface GeneratedCode:
- files: GeneratedFile[]
- contract: ContractAI
- metadata: {
    generatedAt: Date,
    targets: GenerationTarget[],
    tokensUsed: number,
    timeMs: number
  }

Interface GeneratedFile:
- path: string
- content: string
- target: GenerationTarget
- syntaxErrors?: SyntaxError[]
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `LLMCodeGenerator` class
- [ ] `generate()` główna metoda
- [ ] `generateTarget()` per-target generation
- [ ] `parseFilesFromResponse()` parser
- [ ] `validateBasicSyntax()` podstawowa walidacja
- [ ] `determineTargets()` auto-detection
- [ ] `GeneratedCode` interface
- [ ] `GeneratedFile` interface
- [ ] Testy jednostkowe
- [ ] Testy integracyjne z mock LLM

---

## 5. FAZA 4: Validation Pipeline

**Czas:** 5 dni  
**Cel:** Implementacja 7-stage validation pipeline

### Task 4.1: Pipeline Orchestrator

**Plik:** `src/core/validation/pipeline-orchestrator.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz ValidationPipelineOrchestrator zarządzający 7 stage'ami walidacji.

Klasa ValidationPipelineOrchestrator:

Constructor:
- stages: ValidationStage[]
- options: PipelineOptions

Interface PipelineOptions:
- failFast: boolean (default: true) // przerwij na pierwszym błędzie krytycznym
- parallelStages: boolean (default: false) // niektóre stage'y równolegle
- timeout: number (default: 60000) // timeout per stage

Metody:

1. async validate(
     contract: ContractAI,
     code: GeneratedCode
   ): Promise<PipelineResult>
   - Uruchamia stage'y sekwencyjnie (lub równolegle gdzie możliwe)
   - Zbiera wyniki każdego stage'a
   - Implementuje fail-fast logic
   - Zwraca agregowany wynik

2. private async runStage(
     stage: ValidationStage,
     context: ValidationContext
   ): Promise<StageResult>
   - Uruchamia pojedynczy stage
   - Obsługuje timeout
   - Łapie i formatuje błędy
   - Mierzy czas wykonania

3. private shouldContinue(
     stage: string,
     result: StageResult
   ): boolean
   - Określa czy kontynuować po błędzie
   - Syntax i Assertions są krytyczne
   - Security jest krytyczne
   - Inne mogą być kontynuowane

Interface ValidationStage:
- name: string
- validator: (context: ValidationContext) => Promise<StageResult>
- critical: boolean
- timeout?: number

Interface ValidationContext:
- contract: ContractAI
- code: GeneratedCode
- workDir: string // katalog roboczy
- previousResults: Map<string, StageResult>

Interface StageResult:
- stage: string
- passed: boolean
- errors: StageError[]
- warnings: StageWarning[]
- metrics?: StageMetrics
- timeMs: number

Interface PipelineResult:
- passed: boolean
- stages: StageResult[]
- summary: {
    totalErrors: number,
    totalWarnings: number,
    passedStages: number,
    failedStages: number,
    totalTimeMs: number
  }

7 Stage'ów (w kolejności):
1. syntax - TypeScript compile
2. assertions - Contract assertions
3. static-analysis - ESLint + custom rules
4. tests - Generate & run tests
5. quality - Coverage, complexity
6. security - Security scan
7. runtime - Docker deploy + API test
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `ValidationPipelineOrchestrator` class
- [ ] `validate()` główna metoda
- [ ] `runStage()` per-stage execution
- [ ] `shouldContinue()` fail-fast logic
- [ ] Wszystkie interfaces
- [ ] Timeout handling
- [ ] Parallel execution (opcjonalnie)
- [ ] Testy jednostkowe

---

### Task 4.2: Stage 1 - Syntax Validator

**Plik:** `src/core/validation/pipeline/syntax-validator.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz SyntaxValidator - Stage 1 sprawdzający składnię TypeScript.

Klasa SyntaxValidator implements ValidationStage:

name = 'syntax'
critical = true

Metody:

1. async validate(context: ValidationContext): Promise<StageResult>
   - Zapisuje pliki do tymczasowego katalogu
   - Uruchamia `tsc --noEmit`
   - Parsuje output TypeScript compiler
   - Zwraca błędy składniowe

2. private async runTypeScriptCompiler(workDir: string): Promise<TSCOutput>
   - Tworzy tsconfig.json jeśli nie istnieje
   - Uruchamia tsc jako child process
   - Parsuje stderr/stdout

3. private parseTSCErrors(output: string): SyntaxError[]
   - Regex: file(line,col): error TS\d+: message
   - Mapuje na SyntaxError interface

4. private async validateJSON(files: GeneratedFile[]): SyntaxError[]
   - Sprawdza pliki .json
   - JSON.parse z try/catch

Interface SyntaxError:
- file: string
- line: number
- column: number
- code: string (np. 'TS2304')
- message: string

Wymagania:
- Obsługa strict mode TypeScript
- Obsługa path aliases
- Timeout 30s na kompilację
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `SyntaxValidator` class
- [ ] `validate()` method
- [ ] `runTypeScriptCompiler()` method
- [ ] `parseTSCErrors()` parser
- [ ] `validateJSON()` method
- [ ] tsconfig.json template
- [ ] Timeout handling
- [ ] Testy jednostkowe

---

### Task 4.3: Stage 2 - Assertion Validator

**Plik:** `src/core/validation/pipeline/assertion-validator.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz AssertionValidator - Stage 2 sprawdzający asercje z Contract AI.

Klasa AssertionValidator implements ValidationStage:

name = 'assertions'
critical = true

Metody:

1. async validate(context: ValidationContext): Promise<StageResult>
   - Pobiera assertions z contract.validation.assertions
   - Dla każdej asercji wywołuje odpowiedni checker
   - Agreguje wyniki

2. private async checkAssertion(
     assertion: CodeAssertion,
     context: ValidationContext
   ): Promise<AssertionResult>
   - Switch na assertion.check.type
   - Wywołuje odpowiednią metodę sprawdzającą

3. Implementuj checkery dla każdego typu:

   a) checkFileExists(path: string, workDir: string): boolean
   
   b) checkFileContains(
        path: string,
        pattern: RegExp,
        workDir: string
      ): { found: boolean, matches?: string[] }
   
   c) checkFileNotContains(
        path: string,
        pattern: RegExp,
        workDir: string
      ): { found: boolean, violations?: string[] }
   
   d) checkExportsFunction(
        path: string,
        functionName: string,
        workDir: string
      ): boolean
      - Parsuje plik z ts-morph lub @babel/parser
      - Szuka export function/const
   
   e) checkExportsClass(
        path: string,
        className: string,
        workDir: string
      ): boolean
   
   f) checkImplementsInterface(
        path: string,
        interfaceName: string,
        workDir: string
      ): boolean
   
   g) checkHasErrorHandling(path: string, workDir: string): boolean
      - Szuka try/catch w funkcjach async
      - Sprawdza czy wszystkie async mają error handling
   
   h) checkHasValidation(
        entityName: string,
        fieldName: string,
        code: GeneratedCode
      ): boolean
      - Szuka walidacji dla konkretnego pola
      - Sprawdza validators/*.ts

Interface AssertionResult:
- assertion: CodeAssertion
- passed: boolean
- details?: string
- location?: { file: string, line?: number }
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `AssertionValidator` class
- [ ] `validate()` method
- [ ] `checkAssertion()` dispatcher
- [ ] `checkFileExists()` checker
- [ ] `checkFileContains()` checker
- [ ] `checkFileNotContains()` checker
- [ ] `checkExportsFunction()` checker
- [ ] `checkExportsClass()` checker
- [ ] `checkImplementsInterface()` checker
- [ ] `checkHasErrorHandling()` checker
- [ ] `checkHasValidation()` checker
- [ ] AST parsing (ts-morph)
- [ ] Testy dla każdego checkera

---

### Task 4.4: Stage 3 - Static Analyzer

**Plik:** `src/core/validation/pipeline/static-analyzer.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz StaticAnalyzer - Stage 3 uruchamiający ESLint + custom rules.

Klasa StaticAnalyzer implements ValidationStage:

name = 'static-analysis'
critical = false

Metody:

1. async validate(context: ValidationContext): Promise<StageResult>
   - Konfiguruje ESLint
   - Uruchamia na wygenerowanych plikach
   - Mapuje wyniki na StageResult

2. private createESLintConfig(
     contract: ContractAI
   ): ESLintConfig
   - Bazowa konfiguracja TypeScript
   - Dodaje rules z contract.validation.staticRules
   - Mapuje severity na ESLint levels

3. private async runESLint(
     files: string[],
     config: ESLintConfig
   ): Promise<ESLintResult[]>
   - Używa ESLint API (nie CLI)
   - Filtruje wyniki według severity

4. private mapToStageErrors(
     results: ESLintResult[]
   ): StageError[]
   - Mapuje ESLint results na nasz format
   - Grupuje po plikach

5. private runCustomRules(
     code: GeneratedCode,
     contract: ContractAI
   ): StageError[]
   - Sprawdza constraints z contract.generation.constraints
   - Implementuje custom checkery

Custom rules do implementacji:
- no-console-log: Brak console.log
- no-any-type: Brak :any
- async-error-handling: Wszystkie async mają try/catch
- naming-convention: camelCase/PascalCase
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `StaticAnalyzer` class
- [ ] `validate()` method
- [ ] `createESLintConfig()` method
- [ ] `runESLint()` method
- [ ] `mapToStageErrors()` method
- [ ] `runCustomRules()` method
- [ ] Custom rules implementation
- [ ] Testy jednostkowe

---

### Task 4.5: Stage 4 - Test Runner

**Plik:** `src/core/validation/pipeline/test-runner.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz TestRunner - Stage 4 generujący i uruchamiający testy.

Klasa TestRunner implements ValidationStage:

name = 'tests'
critical = false

Metody:

1. async validate(context: ValidationContext): Promise<StageResult>
   - Generuje testy z contract.validation.tests (przez LLM)
   - Zapisuje do workDir
   - Uruchamia Jest
   - Parsuje wyniki

2. async generateTests(
     specs: TestSpecification[],
     code: GeneratedCode,
     contract: ContractAI
   ): Promise<GeneratedFile[]>
   - Dla każdego TestSpecification generuje plik testowy
   - Używa LLM z kontekstem kodu i scenarios

3. private buildTestPrompt(
     spec: TestSpecification,
     code: GeneratedCode
   ): string
   - Buduje prompt do generowania testów
   - Zawiera kod do testowania
   - Zawiera scenarios z given/when/then
   - Zawiera testData i expectedResult

4. private async runJest(workDir: string): Promise<JestResult>
   - Konfiguruje Jest
   - Uruchamia jako child process
   - Parsuje JSON output

5. private parseJestResults(output: JestResult): StageResult
   - Mapuje passed/failed tests
   - Ekstrahuje error messages

Interface JestResult:
- numTotalTests: number
- numPassedTests: number
- numFailedTests: number
- testResults: TestFileResult[]

Prompt dla generowania testów:
───────────────────────────────────
Generate Jest tests for the following specification:

## Test Specification
Name: ${spec.name}
Type: ${spec.type}
Target: ${spec.target}

## Code to Test
```typescript
${relevantCode}
```

## Scenarios
${scenarios.map(s => `
### ${s.name}
- Given: ${s.given}
- When: ${s.when}
- Then: ${s.then}
- Test Data: ${JSON.stringify(s.testData)}
- Expected: ${JSON.stringify(s.expectedResult)}
`)}

## Requirements
- Use Jest and supertest for API tests
- Each scenario = one test case
- Include proper setup/teardown
- Mock external dependencies

Generate complete test file.
───────────────────────────────────
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `TestRunner` class
- [ ] `validate()` method
- [ ] `generateTests()` z LLM
- [ ] `buildTestPrompt()` method
- [ ] `runJest()` method
- [ ] `parseJestResults()` method
- [ ] Jest configuration
- [ ] Testy jednostkowe

---

### Task 4.6: Stage 5 - Quality Checker

**Plik:** `src/core/validation/pipeline/quality-checker.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz QualityChecker - Stage 5 sprawdzający metryki jakości.

Klasa QualityChecker implements ValidationStage:

name = 'quality'
critical = false

Metody:

1. async validate(context: ValidationContext): Promise<StageResult>
   - Uruchamia metryki z contract.validation.qualityGates
   - Porównuje z thresholds
   - Zwraca wynik

2. async measureMetric(
     metric: QualityMetric,
     code: GeneratedCode,
     workDir: string
   ): Promise<number>
   - Switch na metric type
   - Zwraca wartość numeryczną

3. Implementuj pomiary dla każdej metryki:

   a) measureTestCoverage(workDir: string): Promise<number>
      - Uruchamia Jest --coverage
      - Parsuje coverage/coverage-summary.json
      - Zwraca % line coverage
   
   b) measureCyclomaticComplexity(code: GeneratedCode): Promise<number>
      - Używa complexity-report lub escomplex
      - Zwraca maksymalną complexity
   
   c) measureLinesOfCode(code: GeneratedCode): Promise<number>
      - Liczy SLOC (bez komentarzy i pustych linii)
   
   d) measureDuplication(code: GeneratedCode): Promise<number>
      - Używa jscpd lub similar
      - Zwraca % duplikacji
   
   e) measureTypeCoverage(workDir: string): Promise<number>
      - Liczy % kodu z explicite types
      - Używa type-coverage package
   
   f) measureDocumentationCoverage(code: GeneratedCode): Promise<number>
      - Liczy % funkcji/klas z JSDoc
      - Parsuje AST

4. private checkGate(
     gate: QualityGate,
     value: number
   ): boolean
   - Porównuje value z threshold używając operator
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `QualityChecker` class
- [ ] `validate()` method
- [ ] `measureMetric()` dispatcher
- [ ] `measureTestCoverage()` metric
- [ ] `measureCyclomaticComplexity()` metric
- [ ] `measureLinesOfCode()` metric
- [ ] `measureDuplication()` metric
- [ ] `measureTypeCoverage()` metric
- [ ] `measureDocumentationCoverage()` metric
- [ ] `checkGate()` comparator
- [ ] Testy jednostkowe

---

### Task 4.7: Stage 6 - Security Scanner

**Plik:** `src/core/validation/pipeline/security-scanner.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz SecurityScanner - Stage 6 skanujący kod pod kątem bezpieczeństwa.

Klasa SecurityScanner implements ValidationStage:

name = 'security'
critical = true

Metody:

1. async validate(context: ValidationContext): Promise<StageResult>
   - Uruchamia security checks z contract.acceptance.securityChecks
   - Agreguje wyniki wszystkich skanerów

2. async runCheck(
     check: SecurityCheck,
     code: GeneratedCode,
     workDir: string
   ): Promise<SecurityResult>
   - Switch na check.name
   - Zwraca findings

3. Implementuj checkery:

   a) checkNoSQLInjection(code: GeneratedCode): SecurityFinding[]
      - Szuka bezpośredniego łączenia stringów w queries
      - Patterns: `SELECT.*\$\{`, `query\(.*\+`
   
   b) checkInputSanitization(code: GeneratedCode): SecurityFinding[]
      - Sprawdza czy inputy są walidowane przed użyciem
      - Szuka req.body używanego bez walidacji
   
   c) checkNoHardcodedSecrets(code: GeneratedCode): SecurityFinding[]
      - Szuka patterns: password=, secret=, apiKey=
      - Sprawdza czy nie ma credentials w kodzie
   
   d) checkNoEval(code: GeneratedCode): SecurityFinding[]
      - Szuka: eval(, new Function(, setTimeout z stringiem
   
   e) checkSecureHeaders(code: GeneratedCode): SecurityFinding[]
      - Sprawdza czy używa helmet lub ustawia security headers
   
   f) checkNoPathTraversal(code: GeneratedCode): SecurityFinding[]
      - Szuka fs operations z user input bez sanitization

4. private async runNPMAudit(workDir: string): Promise<SecurityFinding[]>
   - Uruchamia npm audit
   - Parsuje vulnerable dependencies

Interface SecurityFinding:
- severity: 'critical' | 'high' | 'medium' | 'low'
- rule: string
- message: string
- file: string
- line?: number
- remediation?: string
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `SecurityScanner` class
- [ ] `validate()` method
- [ ] `runCheck()` dispatcher
- [ ] `checkNoSQLInjection()` checker
- [ ] `checkInputSanitization()` checker
- [ ] `checkNoHardcodedSecrets()` checker
- [ ] `checkNoEval()` checker
- [ ] `checkSecureHeaders()` checker
- [ ] `checkNoPathTraversal()` checker
- [ ] `runNPMAudit()` method
- [ ] Testy jednostkowe

---

### Task 4.8: Stage 7 - Runtime Validator

**Plik:** `src/core/validation/pipeline/runtime-validator.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz RuntimeValidator - Stage 7 deployujący i testujący aplikację.

Klasa RuntimeValidator implements ValidationStage:

name = 'runtime'
critical = false

Metody:

1. async validate(context: ValidationContext): Promise<StageResult>
   - Buduje Docker image
   - Uruchamia kontener
   - Testuje endpoints
   - Cleanup

2. async buildDockerImage(workDir: string): Promise<string>
   - Tworzy Dockerfile jeśli nie istnieje
   - Uruchamia docker build
   - Zwraca image ID

3. async startContainer(imageId: string): Promise<ContainerInfo>
   - docker run -d -p HOST_PORT:APP_PORT
   - Czeka na healthcheck
   - Zwraca { containerId, port }

4. async testEndpoints(
     container: ContainerInfo,
     contract: ContractAI
   ): Promise<EndpointTestResult[]>
   - Test /api/health (GET 200)
   - Test CRUD dla każdej encji:
     - POST /api/{entity} - create
     - GET /api/{entity} - list
     - GET /api/{entity}/:id - get
     - PUT /api/{entity}/:id - update
     - DELETE /api/{entity}/:id - delete

5. async cleanup(containerId: string): Promise<void>
   - docker stop
   - docker rm
   - Opcjonalnie: docker rmi

6. private async waitForHealthy(
     port: number,
     timeout: number = 30000
   ): Promise<boolean>
   - Poll /api/health co 500ms
   - Return true gdy 200
   - Return false po timeout

Interface ContainerInfo:
- containerId: string
- port: number
- startedAt: Date

Interface EndpointTestResult:
- endpoint: string
- method: string
- expectedStatus: number
- actualStatus: number
- passed: boolean
- responseTime: number
- error?: string

Dockerfile template:
───────────────────────────────────
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s \
  CMD wget -q --spider http://localhost:8080/api/health || exit 1
CMD ["npm", "start"]
───────────────────────────────────
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `RuntimeValidator` class
- [ ] `validate()` method
- [ ] `buildDockerImage()` method
- [ ] `startContainer()` method
- [ ] `testEndpoints()` method
- [ ] `cleanup()` method
- [ ] `waitForHealthy()` method
- [ ] Dockerfile template
- [ ] Docker API integration
- [ ] Timeout handling
- [ ] Testy jednostkowe (z docker mock)

---

## 6. FAZA 5: Feedback Loop

**Czas:** 3 dni  
**Cel:** Implementacja automatycznej korekcji kodu

### Task 5.1: Feedback Generator

**Plik:** `src/core/feedback/feedback-generator.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz FeedbackGenerator tworzący feedback dla LLM na podstawie błędów walidacji.

Klasa FeedbackGenerator:

Constructor:
- contract: ContractAI

Metody:

1. generate(
     pipelineResult: PipelineResult,
     code: GeneratedCode
   ): ValidationFeedback
   - Agreguje błędy ze wszystkich stage'ów
   - Grupuje po plikach
   - Dodaje kontekst z kontraktu
   - Generuje suggestions

2. private groupErrorsByFile(
     stages: StageResult[]
   ): Map<string, FileErrors>
   - Grupuje wszystkie błędy według plików
   - Sortuje według severity

3. private generateSuggestion(
     error: StageError,
     contract: ContractAI
   ): string
   - Na podstawie typu błędu generuje sugestię naprawy
   - Odnosi się do patterns z kontraktu
   - Podaje konkretne instrukcje

4. private extractContractHints(
     errors: StageError[]
   ): ContractHint[]
   - Dla każdego błędu znajduje odpowiedni pattern/instruction
   - Zwraca kontekst z kontraktu pomocny do naprawy

5. private prioritizeErrors(
     errors: StageError[]
   ): StageError[]
   - Sortuje: critical > error > warning
   - Grupuje powiązane błędy
   - Limituje do top 10 (nie przytłaczaj LLM)

Interface ValidationFeedback:
- issues: ValidationIssue[]
- summary: string
- contractHints: ContractHint[]
- filesAffected: string[]

Interface ValidationIssue:
- file: string
- line?: number
- stage: string
- severity: 'critical' | 'error' | 'warning'
- message: string
- suggestion: string
- contractRef?: string

Interface ContractHint:
- type: 'pattern' | 'instruction' | 'constraint'
- name: string
- content: string
- relevantTo: string[] // files

Przykładowy output:
───────────────────────────────────
ValidationFeedback:
  summary: "Found 3 errors in 2 files"
  
  issues:
    - file: api/src/routes/contact.ts
      line: 25
      stage: assertions
      severity: error
      message: "Missing try-catch error handling"
      suggestion: "Wrap async route handler in try-catch block"
      contractRef: "generation.instructions[1]"
    
    - file: api/src/routes/contact.ts
      line: 30
      stage: assertions
      severity: error
      message: "No email validation"
      suggestion: "Add email format validation before processing"
      contractRef: "generation.patterns[1]"
  
  contractHints:
    - type: pattern
      name: "Input Validation Pattern"
      content: "function validateEmail(email) { ... }"
      relevantTo: ["api/src/routes/contact.ts"]
───────────────────────────────────
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `FeedbackGenerator` class
- [ ] `generate()` główna metoda
- [ ] `groupErrorsByFile()` method
- [ ] `generateSuggestion()` method
- [ ] `extractContractHints()` method
- [ ] `prioritizeErrors()` method
- [ ] Wszystkie interfaces
- [ ] Testy jednostkowe

---

### Task 5.2: Code Corrector

**Plik:** `src/core/feedback/code-corrector.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz CodeCorrector używający LLM do naprawy kodu.

Klasa CodeCorrector:

Constructor:
- llmClient: LLMClient
- options: CorrectorOptions

Interface CorrectorOptions:
- maxTokens: number (default: 4000)
- temperature: number (default: 0.2) // niska dla precise fixes

Metody:

1. async correct(
     code: GeneratedCode,
     feedback: ValidationFeedback,
     contract: ContractAI
   ): Promise<GeneratedCode>
   - Identyfikuje pliki do naprawy
   - Dla każdego pliku wywołuje correctFile()
   - Zwraca zaktualizowany GeneratedCode

2. async correctFile(
     file: GeneratedFile,
     issues: ValidationIssue[],
     hints: ContractHint[]
   ): Promise<GeneratedFile>
   - Buduje correction prompt
   - Wywołuje LLM
   - Parsuje poprawiony kod

3. private buildCorrectionPrompt(
     file: GeneratedFile,
     issues: ValidationIssue[],
     hints: ContractHint[]
   ): string
   - ORIGINAL CODE section
   - ISSUES TO FIX section (numbered)
   - CONTRACT PATTERNS section (relevant hints)
   - INSTRUCTIONS section

4. private getSystemPrompt(): string
   - Rola: "Expert code reviewer and fixer"
   - Zasady: minimal changes, maintain structure
   - Output format: only code, no explanations

5. private extractCodeFromResponse(response: string): string
   - Usuwa markdown backticks
   - Usuwa komentarze/wyjaśnienia
   - Zwraca czysty kod

Correction Prompt Template:
───────────────────────────────────
# CODE CORRECTION TASK

## ORIGINAL CODE
File: ${file.path}
```typescript
${file.content}
```

## ISSUES TO FIX (${issues.length} total)
${issues.map((issue, i) => `
${i + 1}. [${issue.severity.toUpperCase()}] Line ${issue.line || '?'}
   Problem: ${issue.message}
   Fix: ${issue.suggestion}
`).join('')}

## RELEVANT CONTRACT PATTERNS
${hints.map(hint => `
### ${hint.name}
${hint.content}
`).join('')}

## INSTRUCTIONS
1. Fix ALL listed issues
2. Maintain compatibility with other files
3. Follow the contract patterns exactly
4. Keep the same file structure
5. Do NOT add new features
6. Do NOT remove existing functionality

Output ONLY the corrected code. No explanations.
───────────────────────────────────
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `CodeCorrector` class
- [ ] `correct()` główna metoda
- [ ] `correctFile()` per-file correction
- [ ] `buildCorrectionPrompt()` method
- [ ] `getSystemPrompt()` method
- [ ] `extractCodeFromResponse()` parser
- [ ] Prompt template
- [ ] Testy jednostkowe

---

### Task 5.3: Iteration Manager

**Plik:** `src/core/feedback/iteration-manager.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz IterationManager zarządzający pętlą validation → feedback → correction.

Klasa IterationManager:

Constructor:
- pipeline: ValidationPipelineOrchestrator
- feedbackGenerator: FeedbackGenerator
- codeCorrector: CodeCorrector
- options: IterationOptions

Interface IterationOptions:
- maxIterations: number (default: 10)
- earlyStopThreshold: number (default: 0) // stop gdy errors <= threshold
- feedbackProgression: FeedbackLevel[] (default: ['general', 'detailed', 'explicit'])

Metody:

1. async iterate(
     contract: ContractAI,
     initialCode: GeneratedCode
   ): Promise<IterationResult>
   - Główna pętla iteracji
   - Waliduj → Generuj feedback → Popraw → Repeat
   - Stop conditions: success | max iterations | no progress

2. private async runIteration(
     contract: ContractAI,
     code: GeneratedCode,
     iteration: number
   ): Promise<SingleIterationResult>
   - Jedna iteracja walidacji i korekcji
   - Zbiera metryki

3. private getFeedbackLevel(iteration: number): FeedbackLevel
   - iteration 1-3: 'general'
   - iteration 4-7: 'detailed'
   - iteration 8+: 'explicit'

4. private detectNoProgress(
     history: IterationHistory
   ): boolean
   - Sprawdza czy liczba błędów maleje
   - Jeśli ostatnie 3 iteracje bez postępu → true

5. private aggregateMetrics(
     iterations: SingleIterationResult[]
   ): IterationMetrics
   - Łączny czas, tokeny, błędy per iterację

Interface IterationResult:
- success: boolean
- finalCode: GeneratedCode
- iterations: number
- history: SingleIterationResult[]
- metrics: IterationMetrics
- finalErrors?: StageError[]

Interface SingleIterationResult:
- iteration: number
- pipelineResult: PipelineResult
- feedback?: ValidationFeedback
- codeAfter: GeneratedCode
- timeMs: number
- tokensUsed: number

Interface IterationMetrics:
- totalIterations: number
- totalTimeMs: number
- totalTokens: number
- errorsPerIteration: number[]
- successIteration?: number

Console output podczas iteracji:
───────────────────────────────────
📋 Iteration 1/10
   Running validation pipeline...
   ├─ syntax ✅ (120ms)
   ├─ assertions ❌ 3 errors (45ms)
   └─ [STOPPED - critical failure]
   
   Generating feedback (level: general)...
   Correcting 2 files...
   
📋 Iteration 2/10
   Running validation pipeline...
   ├─ syntax ✅ (118ms)
   ├─ assertions ✅ (52ms)
   ├─ static-analysis ⚠️ 2 warnings (340ms)
   ├─ tests ✅ 12/12 passed (2.4s)
   ├─ quality ✅ coverage 78% (890ms)
   ├─ security ✅ (156ms)
   └─ runtime ✅ all endpoints OK (8.2s)

✅ SUCCESS after 2 iterations
   Total time: 14.2s
   Total tokens: 8,450
───────────────────────────────────
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] `IterationManager` class
- [ ] `iterate()` główna metoda
- [ ] `runIteration()` single iteration
- [ ] `getFeedbackLevel()` progression
- [ ] `detectNoProgress()` stuck detection
- [ ] `aggregateMetrics()` method
- [ ] Wszystkie interfaces
- [ ] Console logging
- [ ] Testy jednostkowe

---

## 7. FAZA 6: CLI Integration

**Czas:** 2 dni  
**Cel:** Integracja z CLI przez nową komendę `generate-ai`

### Task 6.1: Generate AI Command

**Plik:** `src/cli/commands/generate-ai.ts`

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz komendę CLI `generate-ai` integrującą cały pipeline.

Użycie:
  reclapp generate-ai <prompt-or-file> [options]

Arguments:
  prompt-or-file    User prompt lub ścieżka do pliku .reclapp.ts/.rcl

Options:
  -o, --output <dir>        Output directory (default: ./target)
  -m, --model <name>        LLM model (default: llama3)
  --max-iterations <n>      Max correction iterations (default: 10)
  --skip-tests              Skip test generation and execution
  --skip-security           Skip security scan
  --skip-runtime            Skip Docker runtime validation
  --verbose                 Show detailed progress
  --dry-run                 Generate contract only, don't generate code
  --save-contract <path>    Save generated contract to file
  --config <path>           Path to config file

Implementacja:

1. parseArguments(args: string[]): GenerateAIOptions
   - Użyj commander.js
   - Waliduj opcje
   - Resolve paths

2. async execute(options: GenerateAIOptions): Promise<void>
   - Load or generate contract
   - Initialize all components
   - Run generation
   - Run iteration loop
   - Save output
   - Display summary

3. async loadOrGenerateContract(
     input: string,
     options: GenerateAIOptions
   ): Promise<ContractAI>
   - Jeśli input to plik → load i validate
   - Jeśli input to prompt → generate with ContractGenerator

4. displayProgress(event: ProgressEvent): void
   - Real-time progress with spinners
   - Używaj ora lub similar
   - Show stage results

5. displaySummary(result: IterationResult): void
   - Final status (success/failure)
   - Iterations count
   - Time and tokens
   - Output files
   - Next steps

6. saveOutput(
     code: GeneratedCode,
     outputDir: string
   ): Promise<void>
   - Tworzy katalogi
   - Zapisuje wszystkie pliki
   - Tworzy package.json jeśli brak

Example output:
───────────────────────────────────
$ reclapp generate-ai "Create a CRM with contacts, companies, and deals"

🚀 Reclapp AI Code Generator v2.4.1

📋 Generating Contract AI...
   ✅ Contract generated (3 entities, 12 fields)
   
🔧 Generating code...
   Target: api (Express + TypeScript)
   Target: frontend (React + Tailwind)
   ✅ Generated 15 files

🔄 Validation Loop

   📋 Iteration 1/10
      ├─ syntax ✅
      ├─ assertions ❌ 2 errors
      └─ Correcting...
   
   📋 Iteration 2/10
      ├─ syntax ✅
      ├─ assertions ✅
      ├─ static-analysis ✅
      ├─ tests ✅ (12/12)
      ├─ quality ✅ (coverage: 82%)
      ├─ security ✅
      └─ runtime ✅

✅ SUCCESS

   Iterations: 2
   Time: 45.2s
   Tokens: 12,340
   Output: ./target/

   Files generated:
     api/src/server.ts
     api/src/routes/contact.ts
     api/src/routes/company.ts
     api/src/routes/deal.ts
     ...

   Next steps:
     cd target && npm install && npm run dev
───────────────────────────────────
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] Command definition with commander.js
- [ ] `parseArguments()` method
- [ ] `execute()` główna metoda
- [ ] `loadOrGenerateContract()` method
- [ ] `displayProgress()` with spinners
- [ ] `displaySummary()` method
- [ ] `saveOutput()` method
- [ ] Error handling
- [ ] Help text
- [ ] Testy e2e

---

## 8. FAZA 7: Testing & QA

**Czas:** 5 dni  
**Cel:** Kompleksowe testy całego systemu

### Task 7.1: Unit Tests

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz kompleksowe testy jednostkowe dla każdego modułu.

Wymagania:
- Min. 80% coverage dla każdego modułu
- Testy edge cases
- Mock LLM responses
- Test fixtures dla kontraktów

Moduły do przetestowania:
1. contract-ai/types - type guards, validators
2. contract-ai/generator - prompt building, parsing
3. code-generator - prompt templates, file parsing
4. validation/pipeline - każdy stage osobno
5. feedback - generator, corrector
6. iteration-manager - loop logic

Test fixtures:
- contracts/simple-crm.ts
- contracts/complex-ecommerce.ts
- contracts/invalid-contract.ts
- generated-code/valid-api/
- generated-code/with-errors/
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] Tests for contract-ai/types
- [ ] Tests for contract-ai/generator
- [ ] Tests for code-generator
- [ ] Tests for validation stages (7 files)
- [ ] Tests for feedback module
- [ ] Tests for iteration-manager
- [ ] Test fixtures
- [ ] Coverage report
- [ ] CI integration

---

### Task 7.2: Integration Tests

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz testy integracyjne dla kompletnych przepływów.

Scenariusze:
1. Full flow: prompt → contract → code → validation → success
2. Full flow with corrections (2-3 iterations)
3. Failure: max iterations reached
4. Failure: invalid contract
5. Skip stages (--skip-tests, --skip-runtime)

Wymagania:
- Użyj prawdziwego LLM (Ollama local)
- Timeout 5 min per test
- Cleanup po każdym teście
- Snapshot testing dla generated code
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] Full success flow test
- [ ] Correction loop test
- [ ] Max iterations test
- [ ] Invalid contract test
- [ ] Skip stages tests
- [ ] Snapshot tests
- [ ] Performance benchmarks

---

### Task 7.3: E2E Tests

```
PROMPT DO IMPLEMENTACJI:
───────────────────────────────────────────────────────────────────
Stwórz testy e2e dla CLI.

Scenariusze:
1. reclapp generate-ai "Create a TODO app"
2. reclapp generate-ai examples/crm-contract.ts
3. reclapp generate-ai --dry-run --save-contract out.json "..."
4. reclapp generate-ai --skip-runtime "..."
5. Error handling: invalid input, network failure, Docker unavailable

Wymagania:
- Test rzeczywistego CLI
- Sprawdź output files
- Sprawdź exit codes
- Test timeout handling
───────────────────────────────────────────────────────────────────
```

**Checklist:**
- [ ] CLI basic usage test
- [ ] CLI with contract file test
- [ ] CLI dry-run test
- [ ] CLI skip options tests
- [ ] CLI error handling tests
- [ ] Exit code verification
- [ ] Output verification

---

## Podsumowanie

### Timeline

| Faza | Czas | Deliverables |
|------|------|--------------|
| 1. Types | 2 dni | 4 pliki types, testy |
| 2. Contract Generator | 3 dni | Generator, Validator, Self-correction |
| 3. Code Generator | 4 dni | LLM generator, Prompt templates |
| 4. Validation Pipeline | 5 dni | 7 stage validators, Orchestrator |
| 5. Feedback Loop | 3 dni | Feedback, Corrector, Iterator |
| 6. CLI | 2 dni | generate-ai command |
| 7. Testing | 5 dni | Unit, Integration, E2E |
| **TOTAL** | **24 dni** | Production-ready v2.2 |

### Success Metrics

| Metric | Target |
|--------|--------|
| First-attempt success rate | 40% |
| Success within 5 iterations | 85% |
| Success within 10 iterations | 95% |
| Average iterations to success | < 3 |
| Test coverage | > 80% |
| Generated code test coverage | > 70% |

---

*Implementation Guide v2.4.1 | Reclapp Contract AI*
