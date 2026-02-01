# Reclapp Studio Guide

Reclapp Studio to interaktywne narzędzie do projektowania kontraktów aplikacji przy użyciu języka naturalnego i lokalnego LLM (Ollama).

## Spis treści

- [Wymagania](#wymagania)
- [Instalacja](#instalacja)
- [Uruchamianie](#uruchamianie)
- [Interfejs Web](#interfejs-web)
- [Interfejs Terminal](#interfejs-terminal)
- [Konfiguracja LLM](#konfiguracja-llm)
- [Walidacja kontraktów](#walidacja-kontraktów)
- [Przykłady użycia](#przykłady-użycia)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Wymagania

- **Ollama** uruchomiona lokalnie z modelem LLM
- **Node.js** >= 18

## Instalacja

### 1. Zainstaluj Ollama

```bash
# Linux/macOS
curl -fsSL https://ollama.com/install.sh | sh

# Uruchom Ollama
ollama serve
```

### 2. Pobierz zalecany model

```bash
# Najlepszy dla generowania kontraktów (6.7B, ~4GB)
ollama pull deepseek-coder:6.7b

# Alternatywy:
ollama pull codellama:13b        # Lepsze rozumienie kodu (~8GB)
ollama pull mistral:7b-instruct  # Ogólnego przeznaczenia (~4GB)
ollama pull qwen2:7b             # Dobra obsługa wielojęzyczna
```

### 3. Uruchom Studio

```bash
# Z repozytorium głównego
make studio-up

# Lub ręcznie
cd studio && npm install && node server.js
```

## Uruchamianie

### Start/Stop

```bash
make studio-up
make studio-status
make studio-logs
make studio-down
```

**Dostęp:** http://localhost:7861

### Chat w terminalu

```bash
# Interaktywny chat z LLM
./bin/reclapp chat

# Alternatywnie bezpośrednio:
./bin/reclapp-chat

# Chat powiązany ze Studiem (zapisuje do studio/projects/*):
make studio-chat
```

## Interfejs Web

### Główne funkcje

1. **Chatbot** - Rozmowa z LLM o projektowaniu aplikacji
2. **Contract Preview** - Podgląd wygenerowanego kontraktu RCL
3. **Examples** - Ładowanie przykładowych kontraktów
4. **Save** - Zapisywanie kontraktu do projektu
5. **Run** - Podpowiedź komendy `reclapp generate` i uruchamianie usług z `target/`

### Przykładowe prompty

```
"Stwórz aplikację CRM z kontaktami i transakcjami"
"Zbuduj system zarządzania zadaniami z projektami"
"Zaprojektuj platformę e-commerce z koszykiem"
"Dodaj alerty dla klientów wysokiego ryzyka"
"Dodaj dashboard do śledzenia sprzedaży"
```

### Komendy specjalne

- `generate` - Wygeneruj pełny kontrakt
- `add entity X with fields a, b, c` - Dodaj encję
- `add alerts for...` - Dodaj alerty
- `add dashboard for...` - Dodaj panel

## Interfejs Terminal

### Komendy

```bash
/save [dir]      # Zapisz kontrakt do katalogu
/show            # Pokaż aktualny kontrakt
/validate        # Waliduj kontrakt (parser Mini-DSL)
/clear           # Wyczyść rozmowę
/model [name]    # Pokaż/zmień model LLM
/name <name>     # Ustaw nazwę projektu
/generate [dir]  # Zapisz i wygeneruj aplikację
/quit            # Wyjście
```

### Przykładowa sesja

```text
💬 You: Create a simple blog application
```

```text
🤖 Assistant: I'll create a blog application with posts and comments...
```

```rcl
app "Blog" {
  version: "1.0.0"
}

entity Post {
  id uuid @unique @generated
  title text @required
  body text
  createdAt datetime @generated
}

entity Comment {
  id uuid @unique @generated
  post -> Post @required
  body text @required
  createdAt datetime @generated
}
```

```text
💬 You: /save ./apps/my-blog
✅ Saved 3 files to ./apps/my-blog/contracts/

💬 You: /generate ./apps/my-blog
✅ Saved and generated to ./apps/my-blog
```

## Konfiguracja LLM

### Zmienne środowiskowe

```bash
# Studio
STUDIO_PORT=7861

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=deepseek-coder:6.7b
```

### Zalecane modele (do 13B parametrów)

| Model | Rozmiar | Zalety | Wady |
|-------|---------|--------|------|
| `deepseek-coder:6.7b` | ~4GB | Najlepszy dla kodu, szybki | - |
| `codellama:13b` | ~8GB | Dobre rozumienie kodu | Wolniejszy |
| `mistral:7b-instruct` | ~4GB | Dobry ogólnie | Mniej precyzyjny dla kodu |
| `qwen2:7b` | ~4GB | Wielojęzyczny | - |
| `llama2:13b` | ~8GB | Dobre rozumowanie | Wolniejszy |

### Zmiana modelu w runtime

```bash
# W CLI
/model codellama:13b

# W .env
OLLAMA_MODEL=codellama:13b
```

## Walidacja kontraktów

Studio automatycznie waliduje wygenerowane kontrakty:

### Pętla walidacji

```text
User Request → LLM → Contract Extraction → Normalization → Mini-DSL Parser
               ↑                                              ↓
               └────────────── Error Feedback (max 2x) ───────┘
```

### Wykrywane błędy

- Brak deklaracji `app`
- Niezbalansowane nawiasy `{}`
- Nieprawidłowe typy (`string` → `text`, `number` → `int`)
- Brak `@generated` na polach `id`, `createdAt`
- Składnia TypeScript zamiast RCL

### Automatyczna korekta

Studio automatycznie:
1. Wykrywa błędy walidacji
2. Wysyła feedback do LLM
3. Prosi o korektę (max 2 retry)
4. Formatuje poprawny kontrakt

## Przykłady użycia

### 1. Tworzenie aplikacji od zera

```bash
./bin/reclapp chat

💬 You: Create a project management app with teams and tasks

🤖 Assistant: I'll design a project management system...

💬 You: Add real-time notifications for task assignments

💬 You: /generate ./apps/project-manager
```

### 2. Rozszerzanie istniejącego kontraktu

```bash
./bin/reclapp chat

💬 You: Load the CRM example and add a reporting module

💬 You: Add monthly sales report dashboard

💬 You: /save ./apps/crm-extended
```

### 3. Konwersja do różnych formatów

```bash
# Po wygenerowaniu kontraktu
./bin/reclapp convert apps/my-app/contracts/main.reclapp.rcl --format md
./bin/reclapp convert apps/my-app/contracts/main.reclapp.rcl --format ts
```

## Rozwiązywanie problemów

### Ollama nie odpowiada

```bash
# Sprawdź czy Ollama działa
curl http://localhost:11434/api/tags

# Uruchom Ollama
ollama serve

# Sprawdź model
ollama list
```

### Studio nie startuje

```bash
# Sprawdź status i logi
make studio-status
make studio-logs

# Jeśli port jest zajęty:
fuser -k 7861/tcp

# Restart
make studio-down
make studio-up
```

### Słaba jakość generowanych kontraktów

1. **Zmień model** na `codellama:13b` lub `deepseek-coder:6.7b`
2. **Bądź bardziej szczegółowy** w promptach
3. **Używaj przykładów** - "Like the CRM example but with..."
4. **Iteruj** - dodawaj elementy stopniowo

### Błędy walidacji

```bash
# Ręczna walidacja
./bin/reclapp validate path/to/contract.rcl

# Sprawdź składnię RCL
cat docs/dsl-reference.md
```

---

## Linki

- [DSL Reference](./dsl-reference.md) - Pełna składnia Mini-DSL
- [CLI Reference](./cli-reference.md) - Wszystkie komendy CLI
- [FILE_MANIFEST.md](../FILE_MANIFEST.md) - Aktualna struktura repo i architektura
- [AGENTS.md](../AGENTS.md) - Specyfikacja agenta / kontrakt bezpieczeństwa
- [Examples](../examples/) - Przykładowe kontrakty
- [Apps](../apps/) - Wygenerowane aplikacje

---

*Dokumentacja Reclapp Studio v2.4.1*
