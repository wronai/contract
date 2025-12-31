# Reclapp 2.1: Causal Verification Loop - Pętla Weryfikacji Przyczynowej

**Status:** ✅ Zaimplementowane | **Wersja:** 2.1.0 | **Data:** Grudzień 2024

## Wprowadzenie

**Causal Verification Loop** to kluczowy element odróżniający Reclapp od innych platform AI. Jest to zamknięta pętla decyzyjna integrująca:

1. **Intencję** - co chcemy osiągnąć
2. **Predykcję** - co przewidujemy że się stanie
3. **Wykonanie** - rzeczywiste działania
4. **Weryfikację** - porównanie predykcji z rzeczywistością
5. **Adaptację** - uczenie się i korekta modelu

Ta pętla umożliwia **faktyczne rozumienie przyczyn**, a nie tylko korelacji - co jest kluczowe dla bezpiecznej autonomii AI.

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAUSAL VERIFICATION LOOP                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│   │ PREDICT  │────▶│ EXECUTE  │────▶│ OBSERVE  │               │
│   └──────────┘     └──────────┘     └──────────┘               │
│        │                                  │                      │
│        │           ┌──────────┐           │                      │
│        └──────────▶│ COMPARE  │◀──────────┘                      │
│                    └──────────┘                                  │
│                         │                                        │
│                         ▼                                        │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│   │  ADAPT   │◀────│  DECIDE  │◀────│ VERIFY   │               │
│   └──────────┘     └──────────┘     └──────────┘               │
│        │                                                         │
│        └────────────────🔄────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Kluczowe Komponenty

### 1. Causal Model z Confidence Decay

```typescript
interface CausalInfluence {
  field: string;        // Źródło wpływu
  weight: number;       // Siła wpływu (-1 do 1)
  decay: number;        // Spadek pewności w czasie
  mechanism?: string;   // Opis mechanizmu
}

// Przykład: Wpływ marży zysku na ryzyko
const influence: CausalInfluence = {
  field: 'financialHealth.profitMargin',
  weight: -0.3,         // Wyższa marża = niższe ryzyko
  decay: 0.01,          // 1% spadek pewności dziennie
  mechanism: 'Higher profit margin indicates financial stability'
};
```

### 2. Interwencje z Expected Effects

```typescript
interface Intervention {
  name: string;
  adjust: Record<string, any>;
  expectedEffect: Record<string, number>;
  confidence: number;
  sandbox: boolean;
  cost?: number;
  cooldownMs?: number;
}

// Przykład: Interwencja skrócenia terminów płatności
const intervention: Intervention = {
  name: 'improvePaymentTerms',
  adjust: { paymentTerms: 14 },
  expectedEffect: { riskScore: -10 },  // Oczekujemy spadku o 10
  confidence: 0.75,
  sandbox: true,
  cooldownMs: 86400000  // 24h cooldown
};
```

### 3. Predykcja

```typescript
// Tworzenie predykcji dla interwencji
const prediction = causalLoop.predict(intervention);

console.log(prediction);
// {
//   id: 'pred_1735654321_abc123',
//   modelVersion: 'b2b-risk-v1',
//   intervention: {...},
//   predictedEffects: [
//     { target: 'riskScore', direction: 'decrease', magnitude: 10, confidence: 0.75 },
//     { target: 'customerSatisfaction', direction: 'decrease', magnitude: 2, confidence: 0.5 }
//   ],
//   confidence: 0.72,
//   timestamp: '2024-12-31T...',
//   status: 'pending'
// }
```

### 4. Obserwacja

```typescript
// Po wykonaniu interwencji - obserwacja rzeczywistych efektów
const observation = causalLoop.observe(
  prediction.id,
  'riskScore',
  actualRiskScore,  // np. 42 (spadek z 50 o 8)
  { source: 'daily_assessment' }
);

console.log(observation);
// {
//   id: 'obs_1735654400',
//   predictionId: 'pred_1735654321_abc123',
//   target: 'riskScore',
//   predictedValue: -10,
//   actualValue: -8,
//   deviation: 0.2,  // 20% odchylenie
//   observedAt: '2024-12-31T...'
// }
```

### 5. Weryfikacja

```typescript
// Weryfikacja predykcji vs rzeczywistości
const verification = causalLoop.verify(prediction.id);

console.log(verification);
// {
//   predictionId: 'pred_...',
//   overallMatch: 0.85,
//   effectResults: [
//     {
//       target: 'riskScore',
//       predicted: { direction: 'decrease', magnitude: 10 },
//       observed: { actualValue: -8, deviation: 0.2 },
//       match: 0.8,
//       withinTolerance: true
//     }
//   ],
//   causalPathValid: true,
//   anomalies: [],
//   modelAdjustments: [
//     {
//       type: 'edge_weight',
//       target: 'riskScore',
//       previousValue: 10,
//       newValue: 8,
//       reason: 'Observed deviation of 20%'
//     }
//   ],
//   confidence: 0.78
// }
```

## Confidence Decay

Kluczowy mechanizm zapewniający, że stare obserwacje nie wpływają nadmiernie na model:

```typescript
// Konfiguracja decay
const config: CausalLoopConfig = {
  confidenceDecayRate: 0.01,    // 1% dziennie
  minConfidence: 0.3,           // Minimum 30%
  maxConfidence: 0.99           // Maximum 99%
};

// Obliczenie zdecayowanej pewności
function applyConfidenceDecay(baseConfidence: number, observationDate: Date): number {
  const ageInDays = (Date.now() - observationDate.getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.exp(-config.confidenceDecayRate * ageInDays);
  return Math.max(config.minConfidence, baseConfidence * decayFactor);
}

// Przykład:
// Obserwacja sprzed 30 dni z confidence 0.9
// decayFactor = exp(-0.01 * 30) = 0.74
// zdecayowana confidence = 0.9 * 0.74 = 0.67
```

## Anomaly Detection

System automatycznie wykrywa anomalie:

```typescript
type AnomalyType = 
  | 'unexpected_effect'    // Nieoczekiwany efekt
  | 'missing_effect'       // Brak oczekiwanego efektu
  | 'reversed_effect'      // Efekt w przeciwnym kierunku
  | 'magnitude_mismatch'   // Zbyt duże odchylenie
  | 'timing_mismatch';     // Efekt w nieoczekiwanym czasie

interface Anomaly {
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPath: string[];
  suggestedAction: string;
}

// Przykład wykrytej anomalii
const anomaly: Anomaly = {
  type: 'reversed_effect',
  severity: 'high',
  description: 'Effect on riskScore went in opposite direction',
  affectedPath: ['paymentTerms', 'riskScore'],
  suggestedAction: 'Review causal edge direction and confounders'
};
```

## Learning & Adaptation

### Kontrolowane uczenie

```typescript
interface LearningConfig {
  enabled: boolean;
  minObservations: number;        // Min obserwacji przed uczeniem
  learningRate: number;           // Tempo uczenia (0-1)
  lockedBeforeApproval: boolean;  // Wymaga zatwierdzenia
  batchSize: number;
  validationSplit: number;
}

const learningConfig: LearningConfig = {
  enabled: true,
  minObservations: 50,            // Min 50 obserwacji
  learningRate: 0.05,             // Powolne uczenie
  lockedBeforeApproval: true,     // Wymaga human approval
  batchSize: 100,
  validationSplit: 0.2
};
```

### Aplikowanie zmian

```typescript
// Zatwierdzenie i aplikacja zmian
const result = causalLoop.applyLearning('admin@company.com');

console.log(result);
// {
//   applied: [
//     {
//       type: 'edge_weight',
//       target: 'profitMargin->riskScore',
//       previousValue: -0.3,
//       newValue: -0.28,
//       reason: 'Adjusted based on 50 observations'
//     }
//   ],
//   skipped: []
// }
```

## Safety Rails

### Konfiguracja bezpieczeństwa

```typescript
interface SafetyConfig {
  maxAdjustmentPerCycle: number;      // Max zmiana na cykl
  rollbackOnAnomaly: boolean;         // Auto-rollback
  sandboxExperimental: boolean;       // Sandbox dla eksperymentów
  maxIterations: number;              // Max iteracji uczenia
  freezeOnCriticalAnomaly: boolean;   // Zamróź przy krytycznej anomalii
}

const safety: SafetyConfig = {
  maxAdjustmentPerCycle: 0.1,   // Max 10% zmiany
  rollbackOnAnomaly: true,
  sandboxExperimental: true,
  maxIterations: 100,
  freezeOnCriticalAnomaly: true
};
```

### Sandbox Testing

```typescript
// Interwencja w sandbox
const sandboxResult = await causalLoop.predict({
  ...intervention,
  sandbox: true
});

// Obserwacja wyników sandbox
await causalLoop.observe(sandboxResult.id, 'riskScore', sandboxValue);

// Weryfikacja przed produkcją
const sandboxVerification = await causalLoop.verify(sandboxResult.id);

if (sandboxVerification.overallMatch > 0.8) {
  // Bezpiecznie można przejść do produkcji
  await applyToProduction(intervention);
}
```

### Auto-Rollback

```typescript
// System automatycznie cofa zmiany przy anomalii
if (verification.anomalies.some(a => a.severity === 'critical')) {
  if (config.rollbackOnAnomaly) {
    await rollbackLastIntervention();
    notifyTeam('Critical anomaly - rolled back');
  }
  
  if (config.freezeOnCriticalAnomaly) {
    freezeSystem();
    notifyTeam('System frozen due to critical anomaly');
  }
}
```

## Metryki i Dashboard

### Kluczowe metryki

```typescript
interface CausalLoopMetrics {
  // Trafność predykcji
  predictionAccuracy: number;        // % predykcji w tolerancji
  averageDeviation: number;          // Średnie odchylenie
  
  // Skuteczność interwencji
  interventionSuccessRate: number;   // % udanych interwencji
  averageEffectMagnitude: number;    // Średnia siła efektu
  
  // Jakość modelu
  causalPathValidity: number;        // % valid causal paths
  modelConfidence: number;           // Średnia confidence modelu
  
  // Bezpieczeństwo
  anomalyRate: number;               // % anomalii
  rollbackCount: number;             // Liczba rollbacków
}
```

### Przykładowy dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│               CAUSAL VERIFICATION LOOP DASHBOARD                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Prediction Accuracy    ████████████░░░░ 78%                    │
│  Intervention Success   █████████████░░░ 85%                    │
│  Model Confidence       ██████████░░░░░░ 65%                    │
│  Anomaly Rate           ██░░░░░░░░░░░░░░  8%                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Recent Predictions                                      │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  pred_001  riskScore -10  actual: -8   ✓ match          │    │
│  │  pred_002  creditLimit +5K  actual: +5K  ✓ match        │    │
│  │  pred_003  paymentDays -7  actual: -3   ⚠ deviation     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Pending Adjustments (awaiting approval)                 │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  edge_weight: profitMargin->riskScore  -0.30 → -0.28   │    │
│  │  edge_weight: paymentDelays->riskScore  0.40 → 0.38    │    │
│  │                                    [Approve] [Reject]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Integracja z AI Contract

Causal Verification Loop jest zintegrowany z systemem kontraktów:

```typescript
const contract: AgentContract = {
  // ...
  verification: {
    enabled: true,
    causalLoop: true,  // Włączony Causal Loop
    
    thresholds: {
      anomalyDetection: 0.05,
      intentMatch: 0.7,
      causalValidity: 0.6,
      confidenceDecay: true,
      confidenceDecayRate: 0.01
    },
    
    learningConfig: {
      enabled: true,
      minObservations: 50,
      lockedBeforeApproval: true
    }
  },
  
  enforcement: {
    causalVerificationRequired: true  // Wymagana weryfikacja
  }
};
```

## Porównanie z Tradycyjnym ML

| Aspekt | Traditional ML | Causal Verification Loop |
|--------|---------------|--------------------------|
| Model | Korelacyjny | Przyczynowy |
| Predykcje | Statyczne | Dynamiczne z decay |
| Weryfikacja | Offline metrics | Real-time outcomes |
| Uczenie | Batch training | Continuous adaptation |
| Bezpieczeństwo | Post-hoc | Built-in safety rails |
| Wyjaśnialność | Black box | Causal explanations |
| Interwencje | N/A | Native support |

## Przykład: Pełny Flow

```typescript
// 1. Definicja modelu przyczynowego
const model: CausalModel = {
  name: 'CustomerRisk',
  nodes: [...],
  edges: [
    { from: 'profitMargin', to: 'riskScore', strength: -0.3 },
    { from: 'paymentDelays', to: 'riskScore', strength: 0.4 }
  ],
  interventions: [
    { name: 'improveTerms', target: 'paymentTerms', ... }
  ]
};

// 2. Tworzenie pętli weryfikacji
const loop = createCausalVerificationLoop(model, {
  confidenceDecayRate: 0.01,
  maxAdjustmentPerCycle: 0.1,
  rollbackOnAnomaly: true
});

// 3. Predykcja dla interwencji
const prediction = loop.predict({
  name: 'improveTerms',
  adjust: { paymentTerms: 14 },
  expectedEffect: { riskScore: -10 },
  confidence: 0.75,
  sandbox: true
});

// 4. Wykonanie interwencji (w sandbox)
await executeIntervention(prediction.intervention);

// 5. Obserwacja po 24h
const actualRiskScore = await measureRiskScore(customerId);
loop.observe(prediction.id, 'riskScore', actualRiskScore);

// 6. Weryfikacja
const verification = loop.verify(prediction.id);

// 7. Decyzja
if (verification.overallMatch > 0.8) {
  // Model działa dobrze - można użyć w produkcji
  await loop.applyLearning('analyst@company.com');
} else if (verification.anomalies.length > 0) {
  // Anomalie - wymaga review
  await escalateForReview(verification);
}
```

## Best Practices

1. **Zawsze używaj sandbox** dla nowych interwencji
2. **Ustaw odpowiedni decay rate** - zbyt niski = stale dane, zbyt wysoki = utrata historii
3. **Monitoruj anomaly rate** - wzrost może oznaczać drift
4. **Wymagaj approval** przed aplikacją zmian do modelu
5. **Regularnie przeglądaj** pending adjustments
6. **Testuj causal paths** przed deploy

## Następne Kroki

- [ ] Counterfactual reasoning
- [ ] A/B testing integration
- [ ] Multi-intervention analysis
- [ ] Temporal causal models
- [ ] External outcome integration

---

**Causal Verification Loop** to fundament bezpiecznej autonomii AI w Reclapp - zapewnia, że system nie tylko przewiduje, ale faktycznie **rozumie przyczyny** i uczy się z rzeczywistych wyników.
