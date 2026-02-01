# Reclapp 2.1: TypeScript AI Contracts - Deklaratywne Kontrakty dla Autonomicznych Agentów

**Status:** ✅ Zaimplementowane | **Wersja:** 2.4.1 | **Data:** Grudzień 2024

## Wprowadzenie

Reclapp 2.1 wprowadza przełomowy system **TypeScript-based AI Contracts** - deklaratywne kontrakty definiujące zachowanie, uprawnienia i ograniczenia autonomicznych agentów AI. W przeciwieństwie do tradycyjnych rozwiązań opartych na YAML czy tekstowych DSL, nasze podejście zapewnia:

- **Walidację typów w czasie kompilacji** - błędy wykrywane przed uruchomieniem
- **Pełne wsparcie IDE** - Intellisense, auto-complete, refactoring
- **Runtime validation** - Zod schemas dla walidacji w czasie wykonania
- **Natywne testowanie** - Jest/TypeScript bez dodatkowych narzędzi

## Architektura Systemu Kontraktów

```
┌─────────────────────────────────────────────────────────────┐
│                    AI AGENT CONTRACT                         │
├─────────────────────────────────────────────────────────────┤
│  ENTITIES         │  WORKFLOW          │  PERMISSIONS        │
│  - Fields         │  - Steps           │  - canAutonomously  │
│  - Causal         │  - Safety Rails    │  - requiresApproval │
│  - Interventions  │  - Triggers        │  - prohibited       │
├─────────────────────────────────────────────────────────────┤
│  VERIFICATION                │  ENFORCEMENT                  │
│  - Causal Loop               │  - Audit Logging              │
│  - Metrics                   │  - Rate Limits                │
│  - Learning Config           │  - Freeze on Violations       │
├─────────────────────────────────────────────────────────────┤
│  PROTOCOLS                                                   │
│  - Uncertainty Protocol (confidence thresholds)             │
│  - Negotiation Protocol (approval workflow)                 │
└─────────────────────────────────────────────────────────────┘
```

## Główne Komponenty

### 1. Entity z Causal Influences

```typescript
const CustomerEntity: Entity = {
  name: 'Customer',
  description: 'B2B customer with risk scoring',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'riskScore', type: 'number', min: 0, max: 100, default: 50 },
    { name: 'creditLimit', type: 'money', min: 0 }
  ],
  
  // Wpływy przyczynowe z decay
  causalInfluences: [
    {
      field: 'financialHealth.profitMargin',
      weight: -0.3,           // Ujemny = obniża riskScore
      decay: 0.01,            // 1% spadek pewności dziennie
      mechanism: 'Higher profit margin indicates financial stability'
    },
    {
      field: 'paymentHistory.avgDelayDays',
      weight: 0.4,            // Dodatni = podnosi riskScore
      decay: 0.02,
      mechanism: 'Payment delays indicate cash flow problems'
    }
  ],
  
  // Interwencje z oczekiwanymi efektami
  interventions: [
    {
      name: 'improvePaymentTerms',
      adjust: { paymentTerms: 14 },
      expectedEffect: { riskScore: -10 },
      confidence: 0.75,
      sandbox: true,          // Testuj najpierw w sandbox
      cooldownMs: 86400000,   // 24h między aplikacjami
      maxApplications: 3
    }
  ]
};
```

### 2. Workflow z Safety Rails

```typescript
const RiskMonitoringWorkflow: Workflow = {
  name: 'MonitorRisk',
  version: '1.0.0',
  
  steps: [
    {
      id: 'fetch_data',
      type: 'fetch_data',
      name: 'Fetch External Data',
      config: { sources: ['krs_api', 'ceidg_api'] },
      onSuccess: 'compute_risk',
      onFailure: 'log_error',
      timeout: 60000,
      retries: 3
    },
    {
      id: 'compute_risk',
      type: 'compute',
      name: 'Compute Risk Score',
      config: { algorithm: 'causal_weighted_sum', applyDecay: true },
      onSuccess: 'evaluate_interventions'
    },
    {
      id: 'evaluate_interventions',
      type: 'decision',
      name: 'Evaluate Interventions',
      conditions: [
        { expression: 'riskScore > 60', description: 'Medium+ risk' }
      ],
      onSuccess: 'apply_intervention'
    },
    {
      id: 'apply_intervention',
      type: 'apply_intervention',
      config: { preferSandbox: true, requireVerification: true },
      onSuccess: 'verify_outcome',
      onFailure: 'rollback'
    },
    {
      id: 'verify_outcome',
      type: 'verify',
      name: 'Verify Outcome',
      config: { waitPeriod: 86400000, metrics: ['riskScore'] }
    }
  ],
  
  // Safety Rails - kluczowe zabezpieczenia
  safety: {
    maxAdjustmentPerCycle: 0.1,      // Max 10% zmiany na cykl
    rollbackOnAnomaly: true,          // Auto-rollback przy anomalii
    sandboxExperimental: true,        // Eksperymentalne w sandbox
    maxIterations: 100,               // Limit iteracji
    freezeOnCriticalAnomaly: true,    // Zamróż przy krytycznej anomalii
    anomalyThreshold: 0.3             // 30% odchylenie = anomalia
  },
  
  schedule: '0 6 * * *'  // Codziennie o 6:00
};
```

### 3. System Uprawnień (Permissions)

```typescript
// Co agent MOŻE robić autonomicznie
const canAutonomously: Permission[] = [
  {
    action: 'query_data',
    resources: ['customers', 'contractors', 'financialData'],
    riskLevel: 'low'
  },
  {
    action: 'create_alert',
    resources: ['*'],
    conditions: [{ field: 'severity', operator: 'in', value: ['low', 'medium'] }],
    riskLevel: 'medium'
  },
  {
    action: 'apply_intervention',
    resources: ['*'],
    conditions: [
      { field: 'sandbox', operator: 'eq', value: true },
      { field: 'confidence', operator: 'gte', value: 0.8 }
    ],
    riskLevel: 'medium'
  }
];

// Co WYMAGA zatwierdzenia człowieka
const requiresApproval: Permission[] = [
  {
    action: 'modify_entity',
    resources: ['customers', 'contractors'],
    riskLevel: 'high'
  },
  {
    action: 'apply_intervention',
    resources: ['*'],
    conditions: [{ field: 'sandbox', operator: 'eq', value: false }],
    riskLevel: 'high'
  }
];

// Co jest ZABRONIONE
const prohibited: Permission[] = [
  {
    action: '*',
    resources: ['payment_systems', 'security_settings'],
    riskLevel: 'critical'
  },
  {
    action: 'delete_resource',
    resources: ['audit_logs'],
    riskLevel: 'critical'
  }
];
```

### 4. Verification & Learning

```typescript
const verification: Verification = {
  enabled: true,
  causalLoop: true,
  
  metrics: [
    {
      name: 'riskScore_accuracy',
      description: 'Predicted vs actual risk score deviation',
      formula: 'abs(predicted - actual) / predicted',
      threshold: 0.1,
      direction: 'lower_better'
    },
    {
      name: 'intervention_effectiveness',
      description: 'Success rate of interventions',
      threshold: 0.7,
      direction: 'higher_better'
    }
  ],
  
  thresholds: {
    anomalyDetection: 0.05,
    intentMatch: 0.7,
    causalValidity: 0.6,
    confidenceDecay: true,
    confidenceDecayRate: 0.01,
    minConfidence: 0.3,
    maxConfidence: 0.95
  },
  
  learningConfig: {
    enabled: true,
    minObservations: 50,          // Min 50 obserwacji przed uczeniem
    learningRate: 0.05,           // Powolne uczenie dla stabilności
    lockedBeforeApproval: true,   // Wymaga zatwierdzenia człowieka
    batchSize: 100,
    validationSplit: 0.2
  }
};
```

### 5. Enforcement & Rate Limits

```typescript
const enforcement: Enforcement = {
  logAllDecisions: true,              // Pełny audit log
  overrideRequiresApproval: true,     // Override tylko z zatwierdzeniem
  feedbackLockedBeforeLearning: true, // Feedback locked przed uczeniem
  causalVerificationRequired: true,    // Wymagana weryfikacja przyczynowa
  auditRetentionDays: 365,            // Rok retencji logów
  alertOnViolation: true,             // Alert przy naruszeniu
  freezeOnRepeatedViolations: true,   // Zamróź po powtórzonych naruszeniach
  maxViolationsBeforeFreeze: 3        // Max 3 naruszenia
};

const rateLimits: RateLimits = {
  actionsPerMinute: 30,
  actionsPerHour: 500,
  actionsPerDay: 5000,
  concurrentActions: 5
};
```

## Walidacja Kontraktu

System używa Zod schemas do runtime validation:

```typescript
import { validateContract } from '@reclapp/contracts';

const validation = validateContract(myContract);

if (!validation.valid) {
  console.error('Errors:', validation.errors);
  // [{ path: 'entities.0.name', code: 'VALIDATION_INVALID', message: '...' }]
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
  // [{ path: 'canAutonomously.0', code: 'W002', message: 'High-risk action is autonomous' }]
}
```

### Przykładowe walidacje:

- **Entity name** - musi być PascalCase
- **Causal weights** - muszą być w zakresie [-1, 1]
- **Confidence** - musi być w zakresie [0, 1]
- **Workflow steps** - referencje muszą istnieć
- **Permission conflicts** - akcja nie może być jednocześnie autonomous i prohibited

## Executor Runtime

```typescript
import { createExecutor, ContractExecutor } from '@reclapp/contracts';

// Tworzenie executora (waliduje kontrakt)
const executor = createExecutor(RiskMonitoringAgent);

// Wykonanie workflow
const result = await executor.execute({
  customerId: 'cust-123',
  forceRefresh: true
});

console.log(result.success);           // true/false
console.log(result.metrics);           // { totalSteps: 5, completedSteps: 5, ... }
console.log(result.verification);      // { intentMatch: 0.85, causalValidity: 0.9, ... }
console.log(result.recommendations);   // [{ type: 'adjust', description: '...' }]

// Sprawdzenie stanu
console.log(executor.isFrozenState()); // false
console.log(executor.getAuditLog());   // [{ timestamp, action, result }, ...]
```

### Request Action API

```typescript
// Agent żąda wykonania akcji
const response = await executor.requestAction({
  action: 'apply_intervention',
  target: 'customers',
  parameters: {
    interventionName: 'improvePaymentTerms',
    entityId: 'cust-123',
    sandbox: true
  },
  confidence: 0.85,
  reasoning: 'Risk score elevated due to payment delays'
});

if (response.requiresApproval) {
  // Wysłano do kolejki zatwierdzenia
  console.log('Awaiting approval:', response.auditId);
} else if (response.executed) {
  // Wykonano pomyślnie
  console.log('Result:', response.result);
} else {
  // Odmowa
  console.error('Denied:', response.error);
}
```

## Fluent Builder API

Dla wygodniejszego tworzenia kontraktów:

```typescript
import { defineContract, createEntity, createWorkflow, createVerification } from '@reclapp/contracts';

const agent = defineContract('MyAgent', '1.0.0')
  .description('My autonomous agent')
  .author('Team')
  .addEntity(CustomerEntity)
  .addEntity(ContractorEntity)
  .workflow(RiskMonitoringWorkflow)
  .verification(RiskVerification)
  .canDo({ action: 'query_data', resources: ['*'], riskLevel: 'low' })
  .needsApproval({ action: 'modify_entity', resources: ['*'], riskLevel: 'high' })
  .cannotDo({ action: '*', resources: ['payment_systems'], riskLevel: 'critical' })
  .safetyRails({ maxAdjustmentPerCycle: 0.1, rollbackOnAnomaly: true })
  .enforcement({ logAllDecisions: true })
  .rateLimits({ actionsPerMinute: 30 })
  .build();
```

## Porównanie z Alternatywami

| Cecha | YAML Config | Text DSL | **TypeScript Contracts** |
|-------|-------------|----------|--------------------------|
| Type Safety | ❌ Runtime only | ❌ Custom parser | ✅ Compile-time |
| IDE Support | ⚠️ Schema-based | ❌ Wymaga plugin | ✅ Native |
| Refactoring | ❌ Manual | ❌ Manual | ✅ Automated |
| Testing | ⚠️ External tools | ⚠️ Custom | ✅ Jest native |
| Reusability | ⚠️ Include/import | ⚠️ Macros | ✅ ES Modules |
| Learning Curve | ✅ Low | ⚠️ Medium | ✅ Low (if TS known) |
| Ecosystem | ⚠️ Limited | ❌ Custom | ✅ Full npm |

## Struktura Plików

```
contracts/
├── types.ts           # 450+ linii definicji typów
│   ├── Field, Entity, Intervention
│   ├── Workflow, WorkflowStep, SafetyRails
│   ├── Permission, Verification, Enforcement
│   └── AgentContract, Builder
│
├── validator.ts       # Zod schemas + semantic validation
│   ├── EntitySchema, WorkflowSchema
│   ├── validateContract()
│   └── ValidationResult, ValidationError
│
├── executor.ts        # Runtime execution engine
│   ├── ContractExecutor
│   ├── requestAction(), execute()
│   └── RateLimiter, AuditLog
│
├── index.ts           # Re-exports
│
└── examples/
    └── risk-monitoring-agent.ts  # Kompletny przykład
```

## Integracja z Causal Verification Loop

Kontrakty są zintegrowane z systemem weryfikacji przyczynowej:

```
Intent → Contract → Execute → Verify → Learn
   ↓         ↓          ↓        ↓        ↓
Natural   TypeScript  Runtime  Compare  Adjust
Language  Definition  Engine   Predicted Model
                               vs Actual
```

## Best Practices

1. **Zawsze definiuj sandbox: true** dla eksperymentalnych interwencji
2. **Ustaw confidence thresholds** odpowiednio do domeny
3. **Loguj wszystkie decyzje** dla audytu i compliance
4. **Używaj minObservations** przed włączeniem uczenia
5. **Definiuj rate limits** proporcjonalnie do ryzyka
6. **Testuj kontrakty** unit testami przed deploymentem

## Następne Kroki

- [ ] Integracja z LLM dla generowania kontraktów z języka naturalnego
- [ ] UI do wizualizacji i edycji kontraktów
- [ ] Marketplace gotowych kontraktów dla różnych domen
- [ ] Wersjonowanie i migracje kontraktów
- [ ] Multi-agent orchestration

---

**Reclapp TypeScript AI Contracts** to pierwszy system tego typu w ekosystemie open-source, łączący bezpieczeństwo typów, causal reasoning i production-ready safety rails w jednym, spójnym rozwiązaniu.
