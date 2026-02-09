# TODO — Refaktoryzacja projektu Reclapp Contract

> Wygenerowano na podstawie analizy `project.functions.toon` (318 modułów, ~1400 funkcji)
> Data: 2026-02-09

---

## 🔴 Krytyczne (Priorytet 1)

### R01. Rozbić monolityczny `EvolutionManager` (TypeScript)
- **Plik:** `src/core/contract-ai/evolution/evolution-manager.ts`
- **Problem:** 105 metod, ~4600 linii. Klasa odpowiada za: Code RAG, git, LLM, serwis, testy, frontend, bazy danych, Docker, CI/CD, dokumentację, analizę stanu, recovery błędów.
- **Akcja:** Wydzielić odpowiedzialności do istniejących i nowych modułów:
  - `service-manager.ts` — już istnieje, przenieść `startService`, `stopService`, `restartService`, `waitForHealth`, `killProcessOnPort`, `checkHealth`, `isPortAvailable`, `findAvailablePort`
  - `llm-orchestrator.ts` — już istnieje, przenieść `generateDynamicServerCode`, `generateDynamicPackageJson`, `tryLLMFix`, `buildRAGContext`
  - `doc-generator.ts` — już istnieje, przenieść `generateReadme`, `generateApiDocs`, `getFallbackReadme`
  - `test-generator.ts` — już istnieje, przenieść `generateTestFiles`, `runTests`, `orchestrateTestsLayer`
  - Nowy `artifact-generator.ts` — `generateDatabaseArtifacts`, `generateCicdArtifacts`, `generateDockerArtifacts`, `generatePrismaSchema`, `generateApiEnv`
  - Nowy `error-recovery.ts` — `attemptRecovery`, `tryHeuristicFix`, `tryRegistryFix`, `tryFallbackFix`, `tryLLMFix`, `getErrorHints`, `logErrorHints`, `hashError`
  - Nowy `prompt-factory.ts` — `buildSystemPrompt`, `buildUserPrompt`, `buildContractDrivenPrompt`, `buildLayer2Context`, `buildStateContext`
  - Nowy `contract-extractor.ts` — `createMinimalContract`, `extractEntitiesFromPrompt`, `getEntityFields`, `getEntityRelations`

### R02. Rozbić monolityczny `bin/reclapp`
- **Plik:** `bin/reclapp`
- **Problem:** 25 funkcji-komend w jednym pliku (JavaScript). Sama `cmdEvolution` ma 946 linii.
- **Akcja:** Przenieść komendy do osobnych modułów `bin/commands/*.js`. `cmdEvolution` wymaga rozbicia na fazy analogicznie do R01.

### R03. Wyeliminować duplikację Python ↔ Python (3 kopie pakietów)
- **Problem:** Trzy nakładające się pakiety Python:
  - `src/python/reclapp/` (główny)
  - `reclapp-contracts/reclapp_contracts/` (modele, parser, walidacja)
  - `reclapp-llm/reclapp_llm/` (klienci LLM)
- **Pliki zduplikowane 1:1:**
  - `src/python/reclapp/llm/*.py` ≡ `reclapp-llm/reclapp_llm/*.py` (8 klientów × 2 kopie)
  - `src/python/reclapp/parser/markdown_parser.py` ≡ `reclapp-contracts/reclapp_contracts/parser/markdown_parser.py`
  - `src/python/reclapp/validation/` ≡ `reclapp-contracts/reclapp_contracts/validation/`
  - `src/python/reclapp/models/` ≡ `reclapp-contracts/reclapp_contracts/models/`
- **Akcja:** Zdecydować o jednej kanonowej lokalizacji. Opcje:
  1. `src/python/reclapp/` jako jedyny pakiet, usunąć `reclapp-llm/` i `reclapp-contracts/`
  2. Utrzymać `reclapp-llm` i `reclapp-contracts` jako osobne pip-pakiety, `src/python/reclapp/` importuje z nich (usunąć lokalne kopie)

### R04. Wyeliminować duplikację JavaScript ↔ TypeScript (chat-core / studio)
- **Pliki:** `lib/chat-core.js`, `studio/server.js`, `studio/chat-shell.js`
- **Problem:** Identyczne funkcje zduplikowane:
  - `coerceToRclString` — 2×
  - `isLikelyRcl` — 2×
  - `convertLegacyJsonContractToRcl` — 2× (93 linii każda)
  - `extractContract` — 2×
  - `validateContract` (w server.js) vs `ReclappChat.validateContract`
  - `callOllama` — 2×
  - `color()` — 3× (cli.ts, chat-shell.js, reclapp-chat)
- **Akcja:** Wydzielić wspólny moduł `lib/rcl-utils.js` z tymi funkcjami. `chat-core.js` i `studio/server.js` importują z niego.

---

## 🟠 Wysokie (Priorytet 2)

### R05. Zduplikowane generatory kodu (3–5 implementacji)
- **Pliki:**
  - `generator/core/generator.ts` — 59 metod, pełen generator z DSL AST
  - `generator/core/contract-generator.ts` — 50 metod, generator z ReclappContract
  - `generator/core/simple-generator.ts` — 12 metod, uproszczony generator
  - `src/core/contract-ai/code-generator/llm-generator.ts` — 12 metod, generator LLM
  - `src/python/reclapp/generator/code_generator.py` — 14 metod, Python generator
- **Zduplikowane metody (Generator ≡ ContractGenerator):**
  - `fieldTypeToTs`, `fieldTypeToSql`, `fieldTypeToZod`, `fieldToZod`
  - `isSystemFieldName`, `getInputType`
  - `toKebabCase`, `toCamelCase`, `toPascalCase`, `toSnakeCase`
  - `generateApiDockerfile`, `generateFrontendDockerfile`, `generateDockerCompose`
  - `generateEntityRoutes`, `generateEntityModel`
  - `generateApiPackageJson`, `generateTsConfig`, `generateViteConfig`
- **Akcja:**
  1. Wydzielić wspólny moduł `generator/shared/type-mappers.ts` (fieldType*, fieldToZod)
  2. Wydzielić `generator/shared/naming.ts` (toKebabCase, toCamelCase, etc.) — mogą korzystać z istniejącego `generator/templates/index.ts`
  3. Wydzielić `generator/shared/docker-templates.ts`
  4. Rozważyć konsolidację Generator + ContractGenerator do jednej klasy z adapterem wejścia (AST vs Contract)

### R06. Zduplikowane utility nazewnicze
- **Problem:** Funkcje `capitalize`, `pluralize`, `toCamelCase`, `toKebabCase`, `toSnakeCase`, `toPascalCase`, `toConstantCase` istnieją w:
  - `generator/templates/index.ts` (8 funkcji) ← kanonowa lokalizacja
  - `generator/core/generator.ts` — metody klasy Generator
  - `generator/core/contract-generator.ts` — metody klasy ContractGenerator
  - `generator/templates/api.ts` — lokalne `kebab()`, `camel()`
  - `src/core/contract-ai/evolution/evolution-manager.ts` — `capitalize`, `singularize`
  - `src/python/reclapp/sdk/sdk_generator.py` — `_pluralize`
  - `src/python/reclapp/testing/e2e_generator.py` — `_pluralize`
  - `dsl/writer/markdown.ts` — `humanizeTitle`
- **Akcja:** Jeden punkt importu (`generator/templates/index.ts` lub nowy `lib/naming.ts`), usunąć lokalne kopie.

### R07. Zduplikowane highlightery składni
- **Pliki:**
  - `clickmd/renderer.py` — `MarkdownRenderer` z 15 metodami `_highlight_*` (yaml, json, bash, js, python, html, css, sql, toml, go, rust, java, c, ruby, php, dockerfile, diff)
  - `src/python/reclapp/evolution/shell_renderer.py` — `ShellRenderer` z 5 metodami `_highlight_*` (yaml, json, bash, js, log)
  - `src/core/contract-ai/evolution/shell-renderer.ts` — TS ShellRenderer z 6 `highlight*` metod
- **Akcja:** `ShellRenderer` (Python) powinien delegować do `clickmd.renderer.MarkdownRenderer` zamiast duplikować logikę highlightingu. TS ShellRenderer — rozważyć wspólny moduł.

### R08. Zduplikowany markdown parser (3 implementacje)
- **Pliki:**
  - `dsl/parser/markdown.ts` — `MarkdownParser` (25 metod)
  - `src/core/contract-ai/parser/markdown-parser.ts` — (18 metod)
  - `src/python/reclapp/parser/markdown_parser.py` — (19 funkcji)
  - `reclapp-contracts/reclapp_contracts/parser/markdown_parser.py` — (19 funkcji, identyczny z powyższym)
- **Akcja:** TS: skonsolidować do jednej lokalizacji (np. `dsl/parser/markdown.ts` jako kanonowa). Python: usunąć jedną z dwóch kopii (patrz R03).

### R09. Zduplikowany `validateContract`
- **Problem:** Minimum 4 implementacje walidacji kontraktu:
  - `contracts/validator.ts` — `validateContract` (82 linii)
  - `contracts/dsl-types.ts` — `validateContract` (49 linii)
  - `reclapp-contracts/reclapp_contracts/parser/markdown_parser.py` — `validate_contract`
  - `src/python/reclapp/parser/markdown_parser.py` — `validate_contract`
  - `src/core/contract-ai/generator/contract-validator.ts` — `ContractValidator` klasa (7 metod)
  - `studio/server.js` — `validateContractSyntax`
- **Akcja:** Jedna kanonowa walidacja per język. TS: `contracts/validator.ts` + `contract-validator.ts` → jedno API. Python: jedno miejsce.

---

## 🟡 Średnie (Priorytet 3)

### R10. Rozbić `reclapp/cli.py` (50 funkcji)
- **Plik:** `reclapp/cli.py`
- **Problem:** 50 funkcji w jednym pliku, mieszanka: komendy CLI, zarządzanie LLM, konfiguracja litellm, zarządzanie priorytetami, fallbackami.
- **Akcja:** Wydzielić:
  - `reclapp/cli/llm_commands.py` — `llm_*` komendy (llm_status, llm_models, llm_set_provider, llm_set_model, llm_test, llm_config, llm_config_list)
  - `reclapp/cli/llm_key_commands.py` — `llm_key_*` komendy
  - `reclapp/cli/llm_priority_commands.py` — `llm_priority_*` komendy
  - `reclapp/cli/llm_model_commands.py` — `llm_model_*` komendy
  - `reclapp/cli/llm_fallbacks_commands.py` — `llm_fallbacks_*` komendy
  - `reclapp/cli/litellm_helpers.py` — `_get_litellm_config_path`, `_load_litellm_yaml`, `_save_litellm_yaml`, `_infer_provider_from_litellm_model`

### R11. Rozbić `ContractExecutor` (34 metody)
- **Plik:** `contracts/executor.ts`
- **Akcja:** Wydzielić:
  - `PermissionChecker` — `checkPermission`, `matchesPermission`
  - `SafetyChecker` — `checkSafetyRails`, `hasCriticalAnomaly`, `handleViolation`, `freeze`
  - `VerificationRunner` — `runVerification`, `calculateCausalValidity`, `generateRecommendations`
  - `AuditLogger` — `logAudit`, `getAuditLog`, `generateSessionId`, `generateAuditId`

### R12. Rozbić `ReclappParser` w `contracts/dsl-loader.ts` (29 metod)
- **Plik:** `contracts/dsl-loader.ts`
- **Problem:** Klasa parsera + loader + auto-fixer + konwerter + logger w jednym pliku.
- **Akcja:** Wydzielić `Logger` do osobnego modułu. `autoFixContract` i `convertToTypeScript` jako osobne moduły.

### R13. Rozbić `Generator` w `generator/core/generator.ts` (59 metod)
- **Plik:** `generator/core/generator.ts`
- **Akcja:** Analogicznie do R05, wydzielić target-generators:
  - `generator/targets/api-generator.ts`
  - `generator/targets/frontend-generator.ts`
  - `generator/targets/database-generator.ts`
  - `generator/targets/docker-generator.ts`
  - `generator/targets/k8s-generator.ts`
  - `generator/targets/cicd-generator.ts`
  - Uwaga: katalog `generator/targets/` już istnieje ale pliki mają 0 funkcji — prawdopodobnie puste stubs.

### R14. Wyczyścić kod archiwalny
- **Plik:** `archive/typescript-setup/cmdSetup.js`
- **Problem:** Kod archiwalny wciąż w repozytorium. Nowa implementacja istnieje w `tools/reclapp-setup/setup.py`.
- **Akcja:** Usunąć `archive/` lub przenieść do osobnego brancha/taga.

### R15. Skonsolidować `EvolutionManager` Python (35 metod)
- **Plik:** `src/python/reclapp/evolution/evolution_manager.py`
- **Problem:** 35 metod, 1563 linii. Duplikuje logikę TS EvolutionManager.
- **Akcja:** Wydzielić analogicznie do R01:
  - Generatory (`_generate_database`, `_generate_frontend`, `_generate_dockerfile`, `_generate_cicd`, `_generate_docs`) → `generators.py` (już istnieje, przenieść z managera)
  - Service management (`_kill_port`, `_check_health`, `_stop_service`) → osobny moduł
  - Test management (`_generate_e2e_tests`, `_run_e2e_tests`, `_auto_fix_code`) → osobny moduł
  - Contract generation (`_generate_contract`, `_extract_app_name`, `_extract_entities`) → osobny moduł

---

## 🟢 Niskie (Priorytet 4)

### R16. Zunifikować formatowanie LLM klientów
- **Problem:** 8 klientów LLM (openai, anthropic, groq, together, litellm, ollama, openrouter, windsurf) ma niemal identyczną strukturę. Boilerplate: `name`, `model`, `is_available`, `list_models`, `generate`, `close`, `__aenter__`, `__aexit__`.
- **Akcja:** Rozważyć template/mixin dla powtarzalnych metod (np. `__aenter__`/`__aexit__`/`close`). Bazowy `HTTPLLMProvider` dla klientów HTTP-based.

### R17. Puste moduły `index.ts` / `__init__.py`
- **Problem:** ~40 plików z 0 elementów. Mogą być re-exporty barrel files lub martwe pliki.
- **Akcja:** Audyt — usunąć nieużywane, upewnić się że barrel files faktycznie re-eksportują.

### R18. Zunifikować obsługę `_is_tty()` i `_clear_line()`
- **Pliki:** `clickmd/progress.py`, `clickmd/help.py`
- **Problem:** `_is_tty()` zdefiniowane w dwóch osobnych plikach.
- **Akcja:** Wydzielić do `clickmd/_terminal.py`.

### R19. Skonsolidować `generateSampleData` / `generateTestPayload`
- **Problem:** Logika generowania danych testowych zduplikowana:
  - `generator/templates/api.ts` — `generateSampleData` (98 linii)
  - `src/core/contract-ai/evolution/fallback-templates.ts` — `generateTestPayload`, `generateUpdatePayload`
  - `src/core/contract-ai/evolution/test-generator.ts` — `getFallbackFixtures`
  - `src/python/reclapp/testing/e2e_generator.py` — `_generate_test_payload`, `_generate_update_payload`, `_generate_test_payload_py`, `_generate_update_payload_py`
- **Akcja:** Jeden moduł `test-data-factory` per język.

### R20. Skonsolidować `GitAnalyzer` (2 implementacje TS + 1 Python)
- **Pliki:**
  - `src/core/contract-ai/evolution/git-analyzer.ts` (11 metod)
  - `src/python/reclapp/analysis/git_analyzer.py` (12 metod)
- **Akcja:** Upewnić się że nie ma trzeciej kopii. Utrzymać 1 TS + 1 Python, ale wyrównać API.

### R21. Skonsolidować `CodeRAG` / `SemanticChunker`
- **Pliki:**
  - `src/core/contract-ai/evolution/code-rag.ts` — 32 funkcje (SemanticChunker, CodeIndexer, HierarchicalRetriever, CodeRAG)
  - `src/python/reclapp/analysis/code_rag.py` — 32 funkcje (identyczna struktura)
- **Akcja:** Utrzymać parytet API. Rozważyć czy Python wersja jest aktywnie używana czy martwy kod.

### R22. Usunąć zduplikowane `_pluralize` / `singularize`
- **Problem:** Prosta pluralizacja zaimplementowana w 5+ miejscach.
- **Akcja:** Jeden moduł utility per język, reszta importuje.

---

## 📊 Statystyki projektu

| Metryka | Wartość |
|---------|---------|
| Moduły | 318 |
| Języki | TypeScript, Python, JavaScript |
| Funkcje łącznie | ~1400 |
| Największa klasa (TS) | `EvolutionManager` — 105 metod |
| Największa klasa (Python) | `EvolutionManager` — 35 metod |
| Największa funkcja | `cmdEvolution` — 946 linii |
| Zduplikowane pakiety Python | 3 (src/python/reclapp, reclapp-contracts, reclapp-llm) |
| Zduplikowane generatory TS | 3–5 implementacji |
| Zduplikowane parsery markdown | 4 (2 TS + 2 Python) |
| Zduplikowane validateContract | 6 implementacji |
| Puste moduły (0 items) | ~40 |

---

## Kolejność realizacji

```
R03 → R04 → R01 → R02 → R05 → R06 → R08 → R09  (eliminacja duplikacji)
    → R07 → R10 → R11 → R12 → R13 → R15          (rozbijanie monolitów)
    → R14 → R16 → R17 → R18 → R19 → R20 → R21 → R22  (porządki)
```

Najpierw eliminujemy duplikacje (R03–R09), bo każda późniejsza refaktoryzacja wymaga jasności co jest kanonowym źródłem. Potem rozbijamy duże klasy. Na końcu porządki i optymalizacje.
