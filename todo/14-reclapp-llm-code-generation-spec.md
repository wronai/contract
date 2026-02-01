# Contract AI: Specyfikacja Generowania Kodu przez LLM

**Data:** 1 Stycznia 2026  
**Wersja:** 2.4.1  
**Status:** Proposal

---

## 1. Zmiana Paradygmatu

### Poprzednie podejście (deterministyczne)
```
User Prompt → LLM → Contract AI → Deterministyczny Generator → Kod
```

### Nowe podejście (LLM-driven z walidacją)
```
User Prompt → LLM → Contract AI → LLM → Kod → Walidacja przez Contract AI → [Iteracja]
                         ↑                              ↓
                         └──────── Feedback Loop ───────┘
```

**Kluczowa różnica:** Contract AI to nie tylko schemat danych, ale **pełna specyfikacja procesów** definiująca:
- CO ma być zaimplementowane (entities, events, workflows)
- JAK ma być zwalidowane (assertions, tests, constraints)
- KIEDY jest "gotowe" (acceptance criteria, metrics)

---

## 2. Architektura Contract AI jako Specyfikacja

### 2.1 Rozszerzona Struktura Kontraktu

```typescript
// contracts/ai-contract/types.ts

export interface ContractAI {
  // ═══════════════════════════════════════════════════════════
  // CZĘŚĆ 1: DEFINICJA (CO)
  // ═══════════════════════════════════════════════════════════
  
  app: AppDefinition;
  entities: EntityDefinition[];
  events?: EventDefinition[];
  workflows?: WorkflowDefinition[];
  api?: ApiDefinition;
  
  // ═══════════════════════════════════════════════════════════
  // CZĘŚĆ 2: SPECYFIKACJA GENERACJI (JAK GENEROWAĆ)
  // ═══════════════════════════════════════════════════════════
  
  generation: {
    // Instrukcje dla LLM generującego kod
    instructions: GenerationInstruction[];
    
    // Wzorce kodu do naśladowania
    patterns: CodePattern[];
    
    // Ograniczenia techniczne
    constraints: TechnicalConstraint[];
    
    // Preferowane biblioteki/frameworki
    techStack: TechStack;
  };
  
  // ═══════════════════════════════════════════════════════════
  // CZĘŚĆ 3: WALIDACJA (JAK SPRAWDZAĆ)
  // ═══════════════════════════════════════════════════════════
  
  validation: {
    // Asercje które kod musi spełniać
    assertions: CodeAssertion[];
    
    // Testy automatyczne do wygenerowania i uruchomienia
    tests: TestSpecification[];
    
    // Reguły statycznej analizy
    staticRules: StaticAnalysisRule[];
    
    // Metryki jakości kodu
    qualityGates: QualityGate[];
  };
  
  // ═══════════════════════════════════════════════════════════
  // CZĘŚĆ 4: KRYTERIA AKCEPTACJI (KIEDY GOTOWE)
  // ═══════════════════════════════════════════════════════════
  
  acceptance: {
    // Wszystkie testy muszą przejść
    testsPass: boolean;
    
    // Minimalne pokrycie kodu
    minCoverage: number;
    
    // Maksymalna liczba błędów lintingu
    maxLintErrors: number;
    
    // Maksymalny czas odpowiedzi API
    maxResponseTime: number;
    
    // Wymagane security checks
    securityChecks: SecurityCheck[];
    
    // Custom acceptance criteria
    custom: AcceptanceCriterion[];
  };
}
```

### 2.2 Definicje Komponentów

```typescript
// ═══════════════════════════════════════════════════════════
// INSTRUKCJE GENERACJI
// ═══════════════════════════════════════════════════════════

interface GenerationInstruction {
  target: 'api' | 'frontend' | 'database' | 'tests' | 'all';
  instruction: string;
  priority: 'must' | 'should' | 'may';
  examples?: CodeExample[];
}

interface CodePattern {
  name: string;
  description: string;
  template: string;  // Wzorzec kodu
  appliesTo: string[];  // Do jakich encji/komponentów
}

interface TechnicalConstraint {
  type: 'no-external-deps' | 'max-file-size' | 'naming-convention' | 'custom';
  rule: string;
  severity: 'error' | 'warning';
}

// ═══════════════════════════════════════════════════════════
// ASERCJE I TESTY
// ═══════════════════════════════════════════════════════════

interface CodeAssertion {
  id: string;
  description: string;
  check: AssertionCheck;
  errorMessage: string;
}

type AssertionCheck = 
  | { type: 'file-exists'; path: string }
  | { type: 'file-contains'; path: string; pattern: RegExp }
  | { type: 'file-not-contains'; path: string; pattern: RegExp }
  | { type: 'exports-function'; path: string; functionName: string }
  | { type: 'implements-interface'; path: string; interfaceName: string }
  | { type: 'has-error-handling'; path: string }
  | { type: 'has-validation'; entityName: string; fieldName: string }
  | { type: 'custom'; validator: (code: GeneratedCode) => boolean };

interface TestSpecification {
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'api';
  target: string;  // Encja lub endpoint
  scenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  given: string;   // Preconditions
  when: string;    // Action
  then: string;    // Expected outcome
  
  // Opcjonalnie: konkretne dane testowe
  testData?: Record<string, any>;
  expectedResult?: any;
}

// ═══════════════════════════════════════════════════════════
// QUALITY GATES
// ═══════════════════════════════════════════════════════════

interface QualityGate {
  name: string;
  metric: QualityMetric;
  threshold: number;
  operator: '>' | '>=' | '<' | '<=' | '==';
}

type QualityMetric = 
  | 'test-coverage'
  | 'cyclomatic-complexity'
  | 'lines-of-code'
  | 'duplication-ratio'
  | 'type-coverage'
  | 'documentation-coverage';
```

---

## 3. Flow Generowania Kodu przez LLM

### 3.1 Diagram Procesu

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LLM CODE GENERATION WITH CONTRACT AI                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 1: CONTRACT GENERATION                                      │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                    │   │
│  │  User Prompt ──► LLM ──► Contract AI (Draft)                      │   │
│  │                              │                                     │   │
│  │                              ▼                                     │   │
│  │                    Contract Validator                              │   │
│  │                              │                                     │   │
│  │                    ┌─────────┴─────────┐                          │   │
│  │                    │                   │                          │   │
│  │                  Valid              Invalid                        │   │
│  │                    │                   │                          │   │
│  │                    ▼                   ▼                          │   │
│  │            Contract AI ◄────── Self-Correction Loop               │   │
│  │             (Final)                                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 2: CODE GENERATION                                          │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                    │   │
│  │  Contract AI ──► Generation Prompt Builder ──► LLM ──► Code       │   │
│  │       │                                                  │        │   │
│  │       │         ┌────────────────────────────────────────┘        │   │
│  │       │         │                                                  │   │
│  │       │         ▼                                                  │   │
│  │       │    Generated Code                                          │   │
│  │       │         │                                                  │   │
│  │       │         ▼                                                  │   │
│  └───────┼─────────────────────────────────────────────────────────┘   │
│          │         │                                                    │
│          │         ▼                                                    │
│  ┌───────┼──────────────────────────────────────────────────────────┐   │
│  │ PHASE │: VALIDATION LOOP                                          │   │
│  ├───────┼──────────────────────────────────────────────────────────┤   │
│  │       │                                                            │   │
│  │       │    ┌─────────────────────────────────────────────────┐    │   │
│  │       │    │           VALIDATION PIPELINE                    │    │   │
│  │       │    │                                                  │    │   │
│  │       │    │  1. Syntax Check (TypeScript compile)           │    │   │
│  │       │    │              │                                   │    │   │
│  │       │    │  2. Assertion Validation (Contract.assertions)  │    │   │
│  │       │    │              │                                   │    │   │
│  │       │    │  3. Static Analysis (ESLint, custom rules)      │    │   │
│  │       │    │              │                                   │    │   │
│  │       │    │  4. Test Generation & Execution                 │    │   │
│  │       │    │              │                                   │    │   │
│  │       │    │  5. Quality Gates Check                         │    │   │
│  │       │    │              │                                   │    │   │
│  │       │    │  6. Security Scan                               │    │   │
│  │       │    │              │                                   │    │   │
│  │       │    │  7. Runtime Validation (Docker deploy + test)   │    │   │
│  │       │    └──────────────┬──────────────────────────────────┘    │   │
│  │       │                   │                                        │   │
│  │       │         ┌─────────┴─────────┐                             │   │
│  │       │         │                   │                             │   │
│  │       │    ALL PASSED          FAILURES                            │   │
│  │       │         │                   │                             │   │
│  │       │         ▼                   ▼                             │   │
│  │       │     SUCCESS ◄─────── Feedback Generator                    │   │
│  │       │                             │                             │   │
│  │       │                             ▼                             │   │
│  │       └──────────────────── LLM Code Correction                    │   │
│  │                                     │                             │   │
│  │                                     └──► [Back to Code Gen]       │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Implementacja Phase 1: Contract Generation

```typescript
// core/contract-generator/index.ts

export class ContractGenerator {
  constructor(
    private llm: LLMClient,
    private validator: ContractValidator
  ) {}

  async generateContract(userPrompt: string): Promise<ContractAI> {
    const systemPrompt = this.buildContractSystemPrompt();
    
    let contract: ContractAI;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      // LLM generuje kontrakt
      const response = await this.llm.generate({
        system: systemPrompt,
        user: attempts === 0 
          ? userPrompt 
          : this.buildCorrectionPrompt(userPrompt, contract, validationResult),
        responseFormat: 'json'
      });
      
      contract = JSON.parse(response);
      
      // Walidacja kontraktu
      const validationResult = await this.validator.validate(contract);
      
      if (validationResult.valid) {
        return contract;
      }
      
      attempts++;
    }
    
    throw new ContractGenerationError('Failed to generate valid contract', contract);
  }
  
  private buildContractSystemPrompt(): string {
    return `
You are a Contract AI generator for the Reclapp platform.
Your task is to generate a complete Contract AI specification based on user requirements.

The Contract AI must include:

1. DEFINITION (app, entities, events, workflows, api)
2. GENERATION INSTRUCTIONS (patterns, constraints, tech stack)
3. VALIDATION RULES (assertions, tests, static rules, quality gates)
4. ACCEPTANCE CRITERIA (what makes the generated code "complete")

Output format: Valid JSON matching the ContractAI interface.

Key principles:
- Be specific in generation instructions
- Include concrete test scenarios
- Define measurable acceptance criteria
- Anticipate common failure modes in assertions
    `.trim();
  }
}
```

### 3.3 Implementacja Phase 2: Code Generation

```typescript
// core/code-generator/index.ts

export class LLMCodeGenerator {
  constructor(
    private llm: LLMClient,
    private contractParser: ContractParser
  ) {}

  async generateCode(contract: ContractAI): Promise<GeneratedCode> {
    const files: GeneratedFile[] = [];
    
    // Generuj każdy target osobno dla lepszej kontroli
    const targets = this.determineTargets(contract);
    
    for (const target of targets) {
      const prompt = this.buildGenerationPrompt(contract, target);
      const code = await this.generateTarget(contract, target, prompt);
      files.push(...code);
    }
    
    return {
      files,
      contract,
      metadata: {
        generatedAt: new Date(),
        targets
      }
    };
  }
  
  private buildGenerationPrompt(
    contract: ContractAI, 
    target: GenerationTarget
  ): string {
    const { generation, entities, api, validation } = contract;
    
    return `
# CODE GENERATION TASK

You are generating ${target} code for the Reclapp application.

## CONTRACT SPECIFICATION

### Entities
${this.formatEntities(entities)}

### API Endpoints
${this.formatApi(api)}

### Tech Stack
${this.formatTechStack(generation.techStack)}

## GENERATION INSTRUCTIONS

${generation.instructions
  .filter(i => i.target === target || i.target === 'all')
  .map(i => `[${i.priority.toUpperCase()}] ${i.instruction}`)
  .join('\n')}

## CODE PATTERNS TO FOLLOW

${generation.patterns
  .filter(p => p.appliesTo.includes(target))
  .map(p => `### ${p.name}\n${p.description}\n\`\`\`typescript\n${p.template}\n\`\`\``)
  .join('\n\n')}

## CONSTRAINTS

${generation.constraints.map(c => `- [${c.severity}] ${c.rule}`).join('\n')}

## VALIDATION REQUIREMENTS

The generated code MUST pass these assertions:
${validation.assertions
  .map(a => `- ${a.description}`)
  .join('\n')}

## OUTPUT FORMAT

Generate complete, working code files. Each file should be in format:
\`\`\`typescript:path/to/file.ts
// code here
\`\`\`

Generate ALL necessary files for ${target}.
    `.trim();
  }

  private async generateTarget(
    contract: ContractAI,
    target: GenerationTarget,
    prompt: string
  ): Promise<GeneratedFile[]> {
    const response = await this.llm.generate({
      system: this.getSystemPromptForTarget(target),
      user: prompt,
      maxTokens: 8000
    });
    
    return this.parseGeneratedFiles(response);
  }
  
  private parseGeneratedFiles(response: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const fileRegex = /```(?:typescript|javascript|json|yaml|sql):(.+?)\n([\s\S]*?)```/g;
    
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      files.push({
        path: match[1].trim(),
        content: match[2].trim()
      });
    }
    
    return files;
  }
}
```

### 3.4 Implementacja Phase 3: Validation Loop

```typescript
// core/validation-loop/index.ts

export class ValidationLoop {
  constructor(
    private llm: LLMClient,
    private codeGenerator: LLMCodeGenerator,
    private validators: ValidationPipeline
  ) {}

  async validateAndCorrect(
    contract: ContractAI,
    generatedCode: GeneratedCode,
    maxIterations: number = 10
  ): Promise<ValidationResult> {
    let currentCode = generatedCode;
    let iteration = 0;
    
    while (iteration < maxIterations) {
      console.log(`\n📋 Validation iteration ${iteration + 1}/${maxIterations}`);
      
      // Uruchom pipeline walidacji
      const validationResult = await this.runValidationPipeline(
        contract,
        currentCode
      );
      
      // Sprawdź acceptance criteria
      if (this.meetsAcceptanceCriteria(contract, validationResult)) {
        return {
          success: true,
          code: currentCode,
          iterations: iteration + 1,
          validationResult
        };
      }
      
      // Generuj feedback dla LLM
      const feedback = this.generateFeedback(contract, validationResult);
      
      console.log(`\n❌ Validation failed. Issues found:`);
      feedback.issues.forEach(issue => {
        console.log(`   - [${issue.severity}] ${issue.message}`);
      });
      
      // LLM poprawia kod
      currentCode = await this.correctCode(
        contract,
        currentCode,
        feedback
      );
      
      iteration++;
    }
    
    return {
      success: false,
      code: currentCode,
      iterations: iteration,
      error: 'Max iterations reached'
    };
  }

  private async runValidationPipeline(
    contract: ContractAI,
    code: GeneratedCode
  ): Promise<PipelineResult> {
    const stages: ValidationStage[] = [
      // Stage 1: Syntax Check
      {
        name: 'syntax',
        validator: async () => this.validators.checkSyntax(code)
      },
      
      // Stage 2: Contract Assertions
      {
        name: 'assertions',
        validator: async () => this.validators.checkAssertions(
          code, 
          contract.validation.assertions
        )
      },
      
      // Stage 3: Static Analysis
      {
        name: 'static-analysis',
        validator: async () => this.validators.runStaticAnalysis(
          code,
          contract.validation.staticRules
        )
      },
      
      // Stage 4: Generate & Run Tests
      {
        name: 'tests',
        validator: async () => this.validators.generateAndRunTests(
          code,
          contract.validation.tests
        )
      },
      
      // Stage 5: Quality Gates
      {
        name: 'quality',
        validator: async () => this.validators.checkQualityGates(
          code,
          contract.validation.qualityGates
        )
      },
      
      // Stage 6: Security Scan
      {
        name: 'security',
        validator: async () => this.validators.runSecurityScan(
          code,
          contract.acceptance.securityChecks
        )
      },
      
      // Stage 7: Runtime Validation
      {
        name: 'runtime',
        validator: async () => this.validators.deployAndTest(code)
      }
    ];
    
    const results: StageResult[] = [];
    
    for (const stage of stages) {
      console.log(`   Running ${stage.name}...`);
      
      const result = await stage.validator();
      results.push({ stage: stage.name, ...result });
      
      // Fail fast - nie kontynuuj jeśli stage krytyczny nie przeszedł
      if (!result.passed && this.isCriticalStage(stage.name)) {
        console.log(`   ❌ ${stage.name} failed (critical)`);
        break;
      }
      
      console.log(`   ${result.passed ? '✅' : '⚠️'} ${stage.name}`);
    }
    
    return { stages: results };
  }

  private async correctCode(
    contract: ContractAI,
    currentCode: GeneratedCode,
    feedback: ValidationFeedback
  ): Promise<GeneratedCode> {
    const correctionPrompt = this.buildCorrectionPrompt(
      contract,
      currentCode,
      feedback
    );
    
    // LLM poprawia tylko pliki z błędami
    const filesToCorrect = feedback.issues
      .filter(i => i.file)
      .map(i => i.file!);
    
    const uniqueFiles = [...new Set(filesToCorrect)];
    
    const correctedFiles = await Promise.all(
      uniqueFiles.map(async (filePath) => {
        const originalFile = currentCode.files.find(f => f.path === filePath);
        const fileIssues = feedback.issues.filter(i => i.file === filePath);
        
        const correctedContent = await this.llm.generate({
          system: 'You are a code correction assistant. Fix the issues while maintaining the overall structure.',
          user: `
# FILE TO CORRECT
Path: ${filePath}

# ORIGINAL CODE
\`\`\`typescript
${originalFile?.content}
\`\`\`

# ISSUES TO FIX
${fileIssues.map(i => `- [${i.severity}] Line ${i.line || '?'}: ${i.message}`).join('\n')}

# CONTRACT REQUIREMENTS
${this.extractRelevantContractParts(contract, filePath)}

# INSTRUCTIONS
Fix ALL issues while:
1. Maintaining compatibility with other files
2. Following the contract specification
3. Keeping the same file structure

Output ONLY the corrected code, no explanations.
          `.trim()
        });
        
        return {
          path: filePath,
          content: this.extractCodeFromResponse(correctedContent)
        };
      })
    );
    
    // Merge corrected files with unchanged files
    const newFiles = currentCode.files.map(f => {
      const corrected = correctedFiles.find(cf => cf.path === f.path);
      return corrected || f;
    });
    
    return {
      ...currentCode,
      files: newFiles
    };
  }

  private generateFeedback(
    contract: ContractAI,
    validationResult: PipelineResult
  ): ValidationFeedback {
    const issues: ValidationIssue[] = [];
    
    for (const stage of validationResult.stages) {
      if (!stage.passed) {
        issues.push(...stage.errors.map(e => ({
          stage: stage.stage,
          severity: this.getSeverity(stage.stage, e),
          message: e.message,
          file: e.file,
          line: e.line,
          suggestion: this.generateSuggestion(contract, e)
        })));
      }
    }
    
    return {
      issues,
      summary: this.generateSummary(issues),
      contractHints: this.extractContractHints(contract, issues)
    };
  }

  private meetsAcceptanceCriteria(
    contract: ContractAI,
    result: PipelineResult
  ): boolean {
    const { acceptance } = contract;
    
    // Wszystkie stage'y muszą przejść
    const allStagesPassed = result.stages.every(s => s.passed);
    if (!allStagesPassed) return false;
    
    // Sprawdź custom criteria
    for (const criterion of acceptance.custom || []) {
      if (!this.checkCriterion(criterion, result)) {
        return false;
      }
    }
    
    return true;
  }
}
```

---

## 4. Przykład Kompletnego Contract AI

```typescript
// examples/crm-contract.ts

export const crmContract: ContractAI = {
  // ═══════════════════════════════════════════════════════════
  // CZĘŚĆ 1: DEFINICJA
  // ═══════════════════════════════════════════════════════════
  
  app: {
    name: 'CRM System',
    version: '1.0.0',
    description: 'Customer Relationship Management'
  },
  
  entities: [
    {
      name: 'Contact',
      fields: [
        { name: 'id', type: 'UUID', annotations: { generated: true } },
        { name: 'email', type: 'Email', annotations: { unique: true, required: true } },
        { name: 'firstName', type: 'String', annotations: { required: true } },
        { name: 'lastName', type: 'String', annotations: { required: true } },
        { name: 'company', type: 'Company', annotations: { relation: 'Company' } },
        { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
      ]
    },
    {
      name: 'Company',
      fields: [
        { name: 'id', type: 'UUID', annotations: { generated: true } },
        { name: 'name', type: 'String', annotations: { required: true } },
        { name: 'industry', type: 'String' },
        { name: 'contacts', type: 'Contact[]', annotations: { relation: 'Contact' } }
      ]
    },
    {
      name: 'Deal',
      fields: [
        { name: 'id', type: 'UUID', annotations: { generated: true } },
        { name: 'title', type: 'String', annotations: { required: true } },
        { name: 'value', type: 'Money', annotations: { required: true } },
        { name: 'stage', type: 'String', annotations: { enum: ['lead', 'qualified', 'proposal', 'won', 'lost'] } },
        { name: 'contact', type: 'Contact', annotations: { relation: 'Contact', required: true } }
      ]
    }
  ],
  
  api: {
    version: 'v1',
    prefix: '/api/v1',
    resources: [
      { name: 'contacts', entity: 'Contact', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'companies', entity: 'Company', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'deals', entity: 'Deal', operations: ['list', 'get', 'create', 'update', 'delete'] }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════
  // CZĘŚĆ 2: SPECYFIKACJA GENERACJI
  // ═══════════════════════════════════════════════════════════
  
  generation: {
    instructions: [
      {
        target: 'api',
        priority: 'must',
        instruction: 'Use Express.js with TypeScript. Each entity must have its own route file.'
      },
      {
        target: 'api',
        priority: 'must',
        instruction: 'Implement proper error handling with try-catch and return appropriate HTTP status codes.'
      },
      {
        target: 'api',
        priority: 'must',
        instruction: 'Validate all inputs before processing. Email fields must be validated for format.'
      },
      {
        target: 'api',
        priority: 'should',
        instruction: 'Use in-memory storage (Map) for simplicity. Include CRUD operations for all entities.'
      },
      {
        target: 'frontend',
        priority: 'must',
        instruction: 'Use React with TypeScript and Tailwind CSS.'
      },
      {
        target: 'frontend',
        priority: 'should',
        instruction: 'Create list and form components for each entity.'
      },
      {
        target: 'all',
        priority: 'must',
        instruction: 'All code must be properly typed. No "any" types allowed.'
      }
    ],
    
    patterns: [
      {
        name: 'Express Route Pattern',
        description: 'Standard pattern for Express.js routes',
        appliesTo: ['api'],
        template: `
import { Router, Request, Response } from 'express';

const router = Router();

// GET all
router.get('/', async (req: Request, res: Response) => {
  try {
    const items = await service.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await service.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = validate(req.body);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }
    const item = await service.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
        `
      },
      {
        name: 'Input Validation Pattern',
        description: 'Validation for entity inputs',
        appliesTo: ['api'],
        template: `
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateContact(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.firstName) {
    errors.push('First name is required');
  }
  
  return { valid: errors.length === 0, errors };
}

function isValidEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}
        `
      }
    ],
    
    constraints: [
      { type: 'no-external-deps', rule: 'No database dependencies. Use in-memory storage.', severity: 'error' },
      { type: 'naming-convention', rule: 'Use camelCase for variables, PascalCase for types/interfaces', severity: 'warning' },
      { type: 'custom', rule: 'All async functions must have try-catch', severity: 'error' }
    ],
    
    techStack: {
      backend: {
        runtime: 'node',
        language: 'typescript',
        framework: 'express',
        port: 8080
      },
      frontend: {
        framework: 'react',
        bundler: 'vite',
        styling: 'tailwind'
      }
    }
  },
  
  // ═══════════════════════════════════════════════════════════
  // CZĘŚĆ 3: WALIDACJA
  // ═══════════════════════════════════════════════════════════
  
  validation: {
    assertions: [
      // File structure assertions
      {
        id: 'A001',
        description: 'Server entry point exists',
        check: { type: 'file-exists', path: 'api/src/server.ts' },
        errorMessage: 'Missing server.ts file'
      },
      {
        id: 'A002',
        description: 'Contact routes file exists',
        check: { type: 'file-exists', path: 'api/src/routes/contact.ts' },
        errorMessage: 'Missing contact routes file'
      },
      {
        id: 'A003',
        description: 'Company routes file exists',
        check: { type: 'file-exists', path: 'api/src/routes/company.ts' },
        errorMessage: 'Missing company routes file'
      },
      {
        id: 'A004',
        description: 'Deal routes file exists',
        check: { type: 'file-exists', path: 'api/src/routes/deal.ts' },
        errorMessage: 'Missing deal routes file'
      },
      
      // Code quality assertions
      {
        id: 'A010',
        description: 'Server exports app',
        check: { type: 'exports-function', path: 'api/src/server.ts', functionName: 'app' },
        errorMessage: 'Server must export app for testing'
      },
      {
        id: 'A011',
        description: 'Routes have error handling',
        check: { type: 'file-contains', path: 'api/src/routes/contact.ts', pattern: /catch\s*\(/ },
        errorMessage: 'Routes must have try-catch error handling'
      },
      {
        id: 'A012',
        description: 'Email validation implemented',
        check: { type: 'has-validation', entityName: 'Contact', fieldName: 'email' },
        errorMessage: 'Contact email must be validated'
      },
      
      // No bad patterns
      {
        id: 'A020',
        description: 'No any types',
        check: { type: 'file-not-contains', path: 'api/src/**/*.ts', pattern: /:\s*any\b/ },
        errorMessage: 'Code must not use "any" type'
      },
      {
        id: 'A021',
        description: 'No console.log in production code',
        check: { type: 'file-not-contains', path: 'api/src/**/*.ts', pattern: /console\.log\(/ },
        errorMessage: 'Remove console.log statements'
      }
    ],
    
    tests: [
      {
        name: 'Contact API Tests',
        type: 'api',
        target: 'Contact',
        scenarios: [
          {
            name: 'should create a contact',
            given: 'Empty database',
            when: 'POST /api/v1/contacts with valid data',
            then: 'Returns 201 with created contact',
            testData: {
              email: 'test@example.com',
              firstName: 'John',
              lastName: 'Doe'
            },
            expectedResult: { status: 201 }
          },
          {
            name: 'should reject invalid email',
            given: 'Empty database',
            when: 'POST /api/v1/contacts with invalid email',
            then: 'Returns 400 with validation error',
            testData: {
              email: 'not-an-email',
              firstName: 'John',
              lastName: 'Doe'
            },
            expectedResult: { status: 400 }
          },
          {
            name: 'should list all contacts',
            given: 'Database with 3 contacts',
            when: 'GET /api/v1/contacts',
            then: 'Returns 200 with array of 3 contacts',
            expectedResult: { status: 200, bodyLength: 3 }
          },
          {
            name: 'should return 404 for unknown contact',
            given: 'Empty database',
            when: 'GET /api/v1/contacts/unknown-id',
            then: 'Returns 404',
            expectedResult: { status: 404 }
          }
        ]
      },
      {
        name: 'Deal API Tests',
        type: 'api',
        target: 'Deal',
        scenarios: [
          {
            name: 'should create a deal with valid stage',
            given: 'Existing contact',
            when: 'POST /api/v1/deals with valid data',
            then: 'Returns 201 with created deal',
            testData: {
              title: 'New Deal',
              value: 10000,
              stage: 'lead',
              contactId: '${existingContactId}'
            },
            expectedResult: { status: 201 }
          },
          {
            name: 'should reject deal with invalid stage',
            given: 'Existing contact',
            when: 'POST /api/v1/deals with invalid stage',
            then: 'Returns 400 with validation error',
            testData: {
              title: 'New Deal',
              value: 10000,
              stage: 'invalid-stage',
              contactId: '${existingContactId}'
            },
            expectedResult: { status: 400 }
          }
        ]
      }
    ],
    
    staticRules: [
      { name: 'no-unused-vars', severity: 'warning' },
      { name: 'no-explicit-any', severity: 'error' },
      { name: 'consistent-return', severity: 'error' }
    ],
    
    qualityGates: [
      { name: 'Test Coverage', metric: 'test-coverage', threshold: 70, operator: '>=' },
      { name: 'No Type Errors', metric: 'type-coverage', threshold: 100, operator: '==' },
      { name: 'Max Complexity', metric: 'cyclomatic-complexity', threshold: 10, operator: '<=' }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════
  // CZĘŚĆ 4: KRYTERIA AKCEPTACJI
  // ═══════════════════════════════════════════════════════════
  
  acceptance: {
    testsPass: true,
    minCoverage: 70,
    maxLintErrors: 0,
    maxResponseTime: 500,  // ms
    
    securityChecks: [
      { name: 'no-sql-injection', enabled: true },
      { name: 'input-sanitization', enabled: true },
      { name: 'no-hardcoded-secrets', enabled: true }
    ],
    
    custom: [
      {
        name: 'All CRUD operations work',
        check: 'All entities have working Create, Read, Update, Delete operations'
      },
      {
        name: 'Health endpoint responds',
        check: 'GET /api/health returns 200'
      },
      {
        name: 'API responds within timeout',
        check: 'All API calls complete within 500ms'
      }
    ]
  }
};
```

---

## 5. Test Generation z Contract AI

```typescript
// core/test-generator/index.ts

export class TestGenerator {
  constructor(private llm: LLMClient) {}

  async generateTests(
    contract: ContractAI,
    code: GeneratedCode
  ): Promise<GeneratedTests> {
    const testFiles: GeneratedFile[] = [];
    
    for (const testSpec of contract.validation.tests) {
      const testCode = await this.generateTestFile(testSpec, contract, code);
      testFiles.push(testCode);
    }
    
    return { files: testFiles };
  }
  
  private async generateTestFile(
    spec: TestSpecification,
    contract: ContractAI,
    code: GeneratedCode
  ): Promise<GeneratedFile> {
    const relatedCode = this.findRelatedCode(spec.target, code);
    
    const prompt = `
# GENERATE TESTS

## Test Specification
Name: ${spec.name}
Type: ${spec.type}
Target: ${spec.target}

## Scenarios to implement
${spec.scenarios.map((s, i) => `
### Scenario ${i + 1}: ${s.name}
- Given: ${s.given}
- When: ${s.when}
- Then: ${s.then}
${s.testData ? `- Test Data: ${JSON.stringify(s.testData)}` : ''}
${s.expectedResult ? `- Expected: ${JSON.stringify(s.expectedResult)}` : ''}
`).join('\n')}

## Related Code
\`\`\`typescript
${relatedCode}
\`\`\`

## Requirements
- Use Jest as testing framework
- Use supertest for API tests
- Each scenario = one test case
- Include setup/teardown for data

Generate complete test file.
    `;
    
    const response = await this.llm.generate({
      system: 'You are a test code generator. Generate complete, runnable Jest tests.',
      user: prompt
    });
    
    return {
      path: `api/src/__tests__/${spec.target.toLowerCase()}.test.ts`,
      content: this.extractCode(response)
    };
  }
}
```

---

## 6. CLI Integration

```bash
# Nowa komenda: generate z Contract AI i iteracją

reclapp generate-ai <contract.ts> [options]

Options:
  --max-iterations <n>    Maximum correction iterations (default: 10)
  --verbose               Show detailed progress
  --skip-tests            Skip test generation and execution
  --skip-security         Skip security scan
  --output <dir>          Output directory

# Przykład użycia
reclapp generate-ai examples/crm-contract.ts --max-iterations 15 --verbose

# Output:
# 📋 Loading contract: examples/crm-contract.ts
# ✅ Contract validated
#
# 🔄 Generation iteration 1/15
#    Generating API code...
#    Generating Frontend code...
#    
# 📋 Validation iteration 1/15
#    Running syntax... ✅
#    Running assertions... ❌
#      - [error] Missing error handling in routes/company.ts
#      - [error] No email validation in routes/contact.ts
#    
# 🔄 Correcting code...
#
# 📋 Validation iteration 2/15
#    Running syntax... ✅
#    Running assertions... ✅
#    Running static-analysis... ✅
#    Running tests... ✅
#    Running quality... ✅
#    Running security... ✅
#    Running runtime... ✅
#
# ✅ Generation complete!
#    Iterations: 2
#    Files generated: 15
#    Test coverage: 85%
#    Output: ./target
```

---

## 7. Metryki i Monitoring

```typescript
// core/metrics/index.ts

interface GenerationMetrics {
  // Podstawowe metryki
  totalIterations: number;
  timeToSuccess: number;  // ms
  
  // Per-stage metrics
  stageMetrics: {
    [stage: string]: {
      attempts: number;
      failures: number;
      averageTime: number;
    };
  };
  
  // Jakość wygenerowanego kodu
  codeQuality: {
    testCoverage: number;
    typeErrors: number;
    lintErrors: number;
    securityIssues: number;
  };
  
  // Cost tracking
  llmCalls: number;
  tokensUsed: number;
  estimatedCost: number;
}

// Eksport do dashboardu
export function exportMetrics(metrics: GenerationMetrics): void {
  // Prometheus / Grafana format
  console.log(`reclapp_generation_iterations ${metrics.totalIterations}`);
  console.log(`reclapp_generation_time_ms ${metrics.timeToSuccess}`);
  console.log(`reclapp_test_coverage ${metrics.codeQuality.testCoverage}`);
  console.log(`reclapp_llm_calls ${metrics.llmCalls}`);
  console.log(`reclapp_llm_tokens ${metrics.tokensUsed}`);
}
```

---

## Podsumowanie

Nowe podejście do generowania kodu w Reclapp:

1. **Contract AI jako specyfikacja** - nie tylko schemat danych, ale pełna definicja:
   - Co generować (entities, API, frontend)
   - Jak generować (instructions, patterns, constraints)
   - Jak walidować (assertions, tests, quality gates)
   - Kiedy gotowe (acceptance criteria)

2. **LLM generuje kod** - nie deterministyczny generator, ale LLM z kontekstem kontraktu

3. **Contract AI waliduje** - każda iteracja sprawdzana przez 7-stage pipeline

4. **Iteracja do skutku** - automatyczna korekta na podstawie feedbacku

5. **Mierzalne rezultaty** - metryki sukcesu, pokrycie testami, jakość kodu

---

*Specyfikacja v2.4.1 | Reclapp Contract AI Code Generation*
