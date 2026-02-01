# Reclapp Refactoring Plan - todo2.md

## Analiza Projektu

### Porównanie Python vs TypeScript

| Aspekt | TypeScript (bin/reclapp) | Python (reclapp/) |
|--------|-------------------------|-------------------|
| **Linie kodu** | ~156k (evolution-manager.ts) | ~50k (evolution_manager.py) |
| **LLM Providers** | ollama, openrouter, windsurf | ollama, openrouter |
| **CLI Framework** | ts-node + własny parser | click + clickmd wrapper |
| **Markdown Output** | ShellRenderer natywny | ShellRenderer + clickmd |
| **Interactive Menu** | Pełne (k/r/f/s/c/e/l/S/t/o/q) | Brak |
| **Log File** | Pełne (.rcl.md) | Podstawowe (--log-file) |
| **E2E Tests** | Playwright + natywne | Podstawowe (http) |
| **Heartbeat Logs** | Pełne | Zaimplementowane ✅ |

### Status clickmd

**clickmd NIE jest całkowicie wyodrębnione od click:**

```python
# clickmd/__init__.py - linia 4
import click as _click  # ❌ Nadal zależy od click
```

**clickmd re-eksportuje dekoratory click:**
- `group`, `command`, `option`, `argument`, `pass_context`, `Choice`, `Path`, `Context`

**clickmd dodaje:**
- `echo()` - smart echo z detekcją markdown
- `md()` - renderowanie markdown
- `renderer.py` - MarkdownRenderer (niezależny od click)

---

## Plan Refaktoryzacji

### Faza 1: Pełna separacja clickmd od click ✅ UKOŃCZONE

**Cel:** clickmd jako samodzielna paczka do renderowania markdown w CLI

**Zadania:**
1. [x] Przenieść dekoratory click do osobnego modułu `clickmd.decorators`
2. [x] Uczynić import click opcjonalnym (fallback do print)
3. [x] Wyeksportować tylko funkcje renderujące z głównego `__init__.py`
4. [ ] Dodać `py.typed` marker dla type-checking

### Faza 2: Unifikacja LLM Providers ✅ UKOŃCZONE

**Problem:** Duplikacja kodu LLM między:
- `pycontracts/llm/` - starsza implementacja
- `src/python/reclapp/llm/` - nowsza implementacja

**Rozwiązanie:** reclapp.llm re-eksportuje pycontracts.llm

**Zadania:**
1. [x] Wybrać jedną implementację (reclapp.llm + pycontracts.llm backend)
2. [x] Zmigrować CLI do używania reclapp.llm
3. [x] Zachować pycontracts/llm jako backend

### Faza 3: Unifikacja ShellRenderer ✅ UKOŃCZONE

**Problem:** ShellRenderer istnieje w:
- `clickmd/renderer.py` - MarkdownRenderer
- `src/python/reclapp/evolution/shell_renderer.py` - ShellRenderer

**Zadania:**
1. [x] Użyć clickmd.MarkdownRenderer jako bazy
2. [x] Usunąć duplikację w evolution/shell_renderer.py
3. [x] Zachować kompatybilność API

### Faza 4: Standaryzacja komend CLI ✅ UKOŃCZONE

**Cel:** Wszystkie komendy reclapp z markdown output i TODO queue

**Zadania:**
1. [x] `reclapp list` - YAML/markdown output
2. [x] `reclapp validate` - YAML/markdown output  
3. [x] `reclapp prompts` - YAML/markdown output
4. [x] `reclapp setup` - deleguje do Python setup script
5. [ ] Wspólny TaskQueue dla wszystkich komend (opcjonalne)

### Faza 5: Parytet funkcji z TypeScript ✅ UKOŃCZONE

**Zaimplementowane:**
1. [x] Interactive menu (k/c/e/l/S/t/o/q) ✅
2. [x] Windsurf provider (`reclapp.llm.WindsurfClient`) ✅
3. [x] Pełne logi .rcl.md (--log-file) ✅
4. [x] Playwright E2E tests (`reclapp.testing`) ✅
5. [x] Code RAG (`reclapp.analysis.CodeRAG`) ✅
6. [x] Git Analyzer (`reclapp.analysis.GitAnalyzer`) ✅
7. [x] SDK Generator (`reclapp.sdk.SDKGenerator`) ✅

---

## Nowe moduły Python (porty z TypeScript)

| Moduł | Źródło TS | Linie | Status |
|-------|-----------|-------|--------|
| `reclapp.analysis.code_rag` | code-rag.ts | 712→650 | ✅ |
| `reclapp.analysis.git_analyzer` | git-analyzer.ts | 262→350 | ✅ |
| `reclapp.sdk.sdk_generator` | sdk-generator.ts | 551→500 | ✅ |
| `reclapp.testing.e2e_generator` | e2e-native.template.ts | - | ✅ |
| `reclapp.testing.api_tester` | - | - | ✅ (nowy) |
| `reclapp.llm.windsurf` | - | - | ✅ (nowy) |

## Komponenty do wyodrębnienia jako osobne paczki

| Komponent | Obecnie | Propozycja |
|-----------|---------|------------|
| **clickmd** | clickmd/ | clickmd (PyPI) - tylko renderer |
| **reclapp-llm** | src/python/reclapp/llm | reclapp-llm (PyPI) |
| **reclapp-analysis** | src/python/reclapp/analysis | reclapp-analysis (PyPI) |
| **reclapp-sdk** | src/python/reclapp/sdk | reclapp-sdk (PyPI) |
| **reclapp-evolution** | src/python/reclapp/evolution | Pozostaje w reclapp |
| **reclapp-generator** | src/python/reclapp/generator | Pozostaje w reclapp |
| **contract-models** | src/python/reclapp/models | reclapp-contracts (PyPI) |

---

## Natychmiastowe akcje (do wykonania teraz)

1. **Wyodrębnić renderer z clickmd** - uczynić niezależnym od click
2. **Dodać Windsurf provider** do Python LLMManager
3. **Dodać interactive menu** do Python evolve

---

## Stary kontekst (zachowany)

./bin/reclapp setup

## Reclapp Environment Setup v1.0


```log
→ Checking LLM providers: Testing connectivity to Ollama, Windsurf, OpenRouter
```


```yaml
# @type: llm_providers
# @description: LLM provider availability check
llm_providers:
  - name: "ollama"
    status: "available"
    models: 44
    code_models: 18
    url: "http://localhost:11434"
  - name: "windsurf"
    status: "not_configured"
    fix: "Set WINDSURF_API_KEY in .env"
  - name: "openrouter"
    status: "not_configured"
    fix: "Set OPENROUTER_API_KEY in .env"
```


```log
→ Checking system dependencies: Node.js, Git, Docker, TypeScript
```


```yaml
# @type: dependencies
# @description: System dependency status
os: "linux 6.17.0-8-generic"
arch: "x64"
node: "v20.19.5"
dependencies:
  - name: "Node.js"
    status: "installed"
    priority: "required"
    version: "20.19.5"
  - name: "Ollama"
    status: "installed"
    priority: "recommended"
    version: "0.9.0"
  - name: "Docker"
    status: "installed"
    priority: "recommended"
    version: "29.1.3"
  - name: "Docker Compose"
    status: "installed"
    priority: "optional"
    version: "2.36.0"
  - name: "Git"
    status: "installed"
    priority: "required"
    version: "2.51.0"
  - name: "TypeScript"
    status: "installed"
    priority: "required"
    version: "5.9.3"
  - name: "PostgreSQL"
    status: "missing"
    priority: "optional"
    install: "sudo apt-get install postgresql postgresql-contrib"
  - name: "Redis"
    status: "missing"
    priority: "optional"
    install: "sudo apt-get install redis-server"
  - name: "Python 3"
    status: "installed"
    priority: "optional"
    version: "3.13.5"
```


```log
→ Generating setup TODO list
```


```yaml
# @type: setup_tasks
# @description: Setup tasks to complete
total: 3
tasks:
  - name: "Configure Windsurf API"
    priority: "optional"
    category: "llm"
    status: "pending"
    command: "# Add to .env: WINDSURF_API_KEY=your-key"
  - name: "Install PostgreSQL"
    priority: "optional"
    category: "database"
    status: "pending"
    command: "sudo apt-get install postgresql postgresql-contrib"
  - name: "Install Redis"
    priority: "optional"
    category: "database"
    status: "pending"
    command: "sudo apt-get install redis-server"
```


```yaml
# @type: files_created
files:
  - path: "setup/SETUP.md"
    type: "guide"
  - path: "setup/setup-tasks.json"
    type: "tasks"
```


```yaml
# @type: setup_summary
summary:
  ready: true
  llm_available: true
  llm_providers: [ollama]
  missing_required: 0
  pending_tasks: 3
```


## Next Steps


```bash
# Create your first app
reclapp evolve -p "Create a todo app" -o ./my-app
 
# Or from a contract
reclapp evolve examples/contracts/01-minimal.rcl -o ./output
```

