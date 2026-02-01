# Reclapp – TODO

Stan projektu po sesji (2026-01-02 20:15).

---

## ✅ CLIRunner - Ustandaryzowany output dla wszystkich komend

### Nowy moduł: `cli/cli-runner.ts`

Klasa `CLIRunner` zapewnia spójny output dla wszystkich komend reclapp:

```typescript
const runner = new CLIRunner({
  name: 'Reclapp Environment Setup',
  version: '1.0',
  verbose: true,
  showProgress: true
});

runner.addTask({
  id: 'check-llm',
  name: 'Check LLM providers',
  description: 'Testing Ollama, Windsurf, OpenRouter',
  run: async () => ({
    success: true,
    data: { providers: [...] }
  })
});

await runner.run();
```

### Funkcje CLIRunner

| Metoda | Opis |
|--------|------|
| `addTask()` | Dodaj zadanie do kolejki |
| `run()` | Uruchom wszystkie zadania |
| `log()` | Zaloguj wiadomość (codeblock log) |
| `yaml()` | Zaloguj dane YAML (koloryzowane) |
| `printTodo()` | Wyświetl aktualną listę TODO |

---

## ✅ Setup z TaskQueue

`reclapp setup` teraz używa TaskQueue jak `reclapp evolve`:

```
## Reclapp Environment Setup v1.0

```yaml
# @type: task_queue
progress:
  done: 0
  total: 5
tasks:
  - name: "check-llm"
    status: "pending"
  - name: "check-deps"
    status: "pending"
  ...
```

→ Check LLM providers: Testing Ollama, Windsurf, OpenRouter

```yaml
# @type: check-llm_result
llm_providers:
  - name: "ollama"
    status: "available"
    models: 44
    code_models: 18
```

📊 Progress: 1/5 (1 done, 0 failed)
```

---

## 📁 Nowe pliki

```
src/core/contract-ai/cli/
├── cli-runner.ts     # 300 LOC - Standardowy runner
└── index.ts

src/core/contract-ai/setup/
├── dependency-checker.ts  # 450 LOC
└── index.ts
```

---

## ⏳ Następne kroki

### Priorytet 1: Dokończenie CLI (Python) i TaskQueue
- [x] Implementacja komendy `reclapp list` (wyświetlanie dostępnych kontraktów/projektów w YAML/Markdown)
- [x] Implementacja komendy `reclapp prompts` (zarządzanie promptami)
- [x] Implementacja `reclapp analyze` z wykorzystaniem `TaskQueue`
- [x] Implementacja `reclapp refactor` z wykorzystaniem `TaskQueue`
- [x] Stworzenie wspólnego mechanizmu `TaskQueue` dla wszystkich komend (unifikacja z `CLIRunner`)
- [x] Implementacja komendy `reclapp tasks` (parallel execution)

### Priorytet 2: Publikacja i Architektura (PyPI)
- [x] Przygotowanie `clickmd` do wydania jako osobna paczka (czyszczenie zależności od `click`)
- [x] Wyodrębnienie `reclapp-llm` jako niezależnego modułu komunikacji z modelami
- [x] Wyodrębnienie `reclapp-contracts` (modele danych i walidacja)
- [x] Pełna konfiguracja `pyproject.toml` dla wszystkich sub-paczek

### Priorytet 3: Rozszerzona Integracja LLM
- [ ] Testy darmowych modeli w `WindsurfClient`
- [x] Uproszczona konfiguracja kluczy API (automatyczne wykrywanie w `reclapp setup`)



w  reclapp --prompt "Create a CRM with contacts and deals"
dostajemy wynik w shell std output jako text, a powinien być markdown colorized jak w ./bin/reclappale jako implementacja python
Wyodrebnij osobny projekt python, ktory będzie odpowiedzialny za komunikacje shell z colorized markdown
tak jak robi to bibliteka python click decoratorami, aby ta nowa biblitoeka python, nazwij ją np clickmd
i używaj zamiast click, aby realizowała te same funkcjonalnosci jak click, ale generowała output jako markdown
na takich zasadach jak aktualnie jest zaimplementowane w ./bin/reclapp


@main.command()
@click.argument("contract_path")
@click.option("--output", "-o", default="./generated", help="Output directory")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--engine", type=click.Choice(["python", "node"]), default="python", help="Execution engine")


i zaimplementuj ją jako pierwsze przy uruchamianiu w reclapp --prompt "Create a CRM with contacts and deals"

