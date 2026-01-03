> **📌 Nowy dokument**  
> **Dodane przez:** Arkadiusz Słota  
> **Data:** 2025-01-03  
> **Opis:** Wyjaśnienie implementacji Dependency Injection w projekcie

---

# 🔍 Gdzie jest Dependency Injection?

**Krótka odpowiedź:** DI jest w konstruktorach serwisów, które przyjmują zależności jako parametry.

---

## 📍 Miejsce 1: `EvolutionSetupService` - Constructor Injection

**Plik:** `src/core/contract-ai/cli/evolution-setup.ts`

**Linia 39-41:**
```typescript
export class EvolutionSetupService {
  private llmSetup: LLMSetupService;

  constructor(llmSetup?: LLMSetupService) {  // ← DI TUTAJ!
    this.llmSetup = llmSetup || createLLMSetupService();
  }
```

**Co to oznacza:**
- ✅ `EvolutionSetupService` **nie tworzy** `LLMSetupService` bezpośrednio
- ✅ Przyjmuje go jako **parametr konstruktora** (wstrzykiwanie zależności)
- ✅ Jeśli nie podasz, tworzy domyślny (fallback)

**Przykład użycia z DI:**
```typescript
// Możesz wstrzyknąć własną implementację (np. mock do testów)
const mockLLMSetup = new MockLLMSetupService();
const evolutionSetup = new EvolutionSetupService(mockLLMSetup);  // ← DI!
```

**Przykład bez DI (domyślny):**
```typescript
// Używa domyślnej implementacji
const evolutionSetup = createEvolutionSetupService();  // Tworzy LLMSetupService wewnątrz
```

---

## 📍 Miejsce 2: Factory Function z opcjonalnym DI

**Plik:** `src/core/contract-ai/cli/evolution-setup.ts`

**Linia 98-100:**
```typescript
export function createEvolutionSetupService(llmSetup?: LLMSetupService): EvolutionSetupService {
  return new EvolutionSetupService(llmSetup);  // ← Przekazuje zależność
}
```

**Co to oznacza:**
- ✅ Factory function przyjmuje opcjonalny `llmSetup`
- ✅ Przekazuje go do konstruktora (DI)
- ✅ Umożliwia wstrzyknięcie zależności z zewnątrz

---

## 📍 Miejsce 3: Użycie w `bin/reclapp`

**Plik:** `bin/reclapp`

**Linia 1526:**
```typescript
const setupService = createEvolutionSetupService();  // Używa domyślnej implementacji
```

**Ale można też:**
```typescript
// Z własną implementacją LLMSetupService
const customLLMSetup = createLLMSetupService();
const setupService = createEvolutionSetupService(customLLMSetup);  // ← DI!
```

---

## 🎯 Dlaczego to jest DI?

### **Przed (BEZ DI):**
```typescript
// bin/reclapp - stary kod (monolityczny)
const contractAI = require('../src/core/contract-ai');
const ollamaAvailable = await contractAI.checkOllamaAvailable();
if (ollamaAvailable) {
  const ollamaClient = contractAI.createOllamaClient({ model: selectedModel });
  evolutionManager.setLLMClient(ollamaClient);
}
// Problem: Hardcoded dependencies, trudne testowanie
```

### **Po (Z DI):**
```typescript
// bin/reclapp - nowy kod
const setupService = createEvolutionSetupService();  // Może przyjąć własną implementację
const setupResult = await setupService.setup({ ... });

// Wewnątrz EvolutionSetupService:
constructor(llmSetup?: LLMSetupService) {  // ← DI - zależność wstrzyknięta
  this.llmSetup = llmSetup || createLLMSetupService();
}
```

---

## ✅ Korzyści z DI:

1. **Testowalność:**
   ```typescript
   // W testach możesz wstrzyknąć mock
   const mockLLMSetup = {
     setupLLMClient: jest.fn().mockResolvedValue({ ... })
   };
   const service = new EvolutionSetupService(mockLLMSetup);  // ← DI!
   ```

2. **Elastyczność:**
   ```typescript
   // Możesz użyć różnych implementacji
   const customLLMSetup = new CustomLLMSetupService();
   const service = new EvolutionSetupService(customLLMSetup);  // ← DI!
   ```

3. **Separation of Concerns:**
   - `EvolutionSetupService` nie wie jak tworzyć `LLMSetupService`
   - Tylko używa tego co dostanie (Dependency Inversion Principle)

---

## 🔍 Porównanie: Przed vs Po

### **PRZED (bez DI):**
```typescript
// bin/reclapp - wszystko w jednym miejscu
const contractAI = require('../src/core/contract-ai');
const ollamaAvailable = await contractAI.checkOllamaAvailable();
let llmStatus = { available: false, model: null, source: null };
if (ollamaAvailable) {
  const selectedModel = process.env.CODE_MODEL || process.env.OLLAMA_MODEL;
  const ollamaClient = contractAI.createOllamaClient({ model: selectedModel });
  const configuredModel = ollamaClient.getConfig().model;
  const hasModel = await ollamaClient.hasModel();
  if (hasModel) {
    evolutionManager.setLLMClient(ollamaClient);
    llmStatus = { available: true, model: configuredModel, source: 'OLLAMA_MODEL' };
  }
}
// Problem: Hardcoded, trudne testowanie, monolityczne
```

### **PO (z DI):**
```typescript
// bin/reclapp - tylko orchestracja
const { createEvolutionSetupService } = require('../src/core/contract-ai/cli/evolution-setup');
const setupService = createEvolutionSetupService();  // Może przyjąć własną implementację
const setupResult = await setupService.setup({ ... });

// Wewnątrz EvolutionSetupService:
constructor(llmSetup?: LLMSetupService) {  // ← DI - zależność wstrzyknięta
  this.llmSetup = llmSetup || createLLMSetupService();
}
// Korzyść: Testowalne, elastyczne, separacja odpowiedzialności
```

---

## 📝 Podsumowanie

**DI jest w:**
1. ✅ `EvolutionSetupService.constructor(llmSetup?: LLMSetupService)` - **Constructor Injection**
2. ✅ `createEvolutionSetupService(llmSetup?: LLMSetupService)` - **Factory z DI**

**To nie jest pełny DI container (jak w .NET), ale:**
- ✅ **Constructor Injection** - zależności przez konstruktor
- ✅ **Optional Dependencies** - opcjonalne parametry z fallback
- ✅ **Factory Pattern** - tworzenie obiektów z DI

**Dlaczego to wystarcza:**
- ✅ Łatwe testowanie (można wstrzyknąć mock)
- ✅ Elastyczność (można użyć różnych implementacji)
- ✅ Separation of Concerns (serwisy nie tworzą zależności)

**To jest "lightweight DI" - wystarczające dla tego projektu!**

