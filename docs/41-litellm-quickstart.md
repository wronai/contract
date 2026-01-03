> **📌 Nowy dokument**  
> **Dodane przez:** Arkadiusz Słota  
> **Data:** 2025-01-03  
> **Opis:** Szybki start z integracją LiteLLM (LM Studio)

---

# 🔧 LiteLLM Integration - Instrukcje

**Data dodania:** 2025-01-03

---

## 📋 Co zostało dodane

### 1. Obsługa LiteLLM (LM Studio)

Reclapp teraz obsługuje LM Studio przez LiteLLM provider, bez potrzeby instalacji Ollama.

**Zmiany:**
- ✅ Dodano pełną obsługę LiteLLM w `llm-provider.ts`
- ✅ Poprawiono endpoint na `/v1/chat/completions` (LM Studio compatible)
- ✅ Dodano health check na `/v1/models`

### 2. Dependency Injection (Refaktoryzacja)

Rozdzielono odpowiedzialności i dodano DI:

**Nowe serwisy:**
- `LLMSetupService` - wykrywanie i setup providerów LLM
- `EvolutionSetupService` - setup Evolution Manager

**Korzyści:**
- ✅ Separation of Concerns
- ✅ Łatwiejsze testowanie
- ✅ Czystszy kod w `bin/reclapp`

---

## 🚀 Szybki Start

### 1. Uruchom LM Studio

Upewnij się, że LM Studio działa i wystawia API na `http://localhost:8123`.

### 2. Ustaw zmienne środowiskowe

```powershell
$env:LLM_PROVIDER="litellm"
$env:LITELLM_URL="http://localhost:8123"
$env:LITELLM_MODEL="model:1"
```

### 3. Uruchom evolve

```powershell
node .\bin\reclapp evolve --prompt "Create a todo app" -o .\my-app --port 4000
```

---

## 🧪 Testy

### Uruchomienie wszystkich testów (zalecane)

```bash
python run_tests.py
```

Lub bezpośrednio:

```bash
python tests/python/test_all_litellm.py
```

### Testy jednostkowe

```bash
python tests/python/test_litellm_integration.py
```

### Testy generowania aplikacji

```bash
python tests/python/test_generate_apps.py
```

**Wymagania dla testów:**
- LM Studio uruchomione na porcie 8123 (dla testów integracyjnych)
- Node.js zainstalowany
- npm dependencies zainstalowane (`npm install`)

**Uwaga:** Testy generowania aplikacji (`test_generate_apps.py`) wymagają działającego LM Studio i mogą trwać kilka minut (generują pełne aplikacje).

---

## 📁 Zmienione pliki

### Nowe pliki:
- `src/core/contract-ai/cli/llm-setup.ts` - LLM setup service
- `src/core/contract-ai/cli/evolution-setup.ts` - Evolution setup service
- `tests/python/test_litellm_integration.py` - testy integracji
- `tests/python/test_generate_apps.py` - testy generowania aplikacji
- `tests/python/test_all_litellm.py` - główny plik testowy
- `run_tests.py` - prosty skrypt uruchamiający wszystkie testy
- `docs/40-litellm-integration.md` - szczegółowe podsumowanie zmian
- `docs/41-litellm-quickstart.md` - ten plik (szybki start)

### Zmodyfikowane pliki:
- `bin/reclapp` - refaktoryzacja (usunięto ~80 linii monolitycznego kodu)
- `src/core/contract-ai/llm/llm-provider.ts` - poprawiony endpoint LiteLLM
- `src/core/contract-ai/cli/index.ts` - eksporty nowych serwisów

---

## 🐳 Docker Support

Dodano kontener Docker z prekonfigurowanym LiteLLM:

```bash
# Zbuduj kontener
docker compose build reclapp-cli

# Uruchom evolve
docker compose run --rm reclapp-cli evolve --prompt "Create a todo app" -o ./output/app --port 4000
```

Szczegóły: `docker/README_CLI.md`

---

## 📚 Dokumentacja

- **Szczegółowe podsumowanie:** `40-litellm-integration.md` (w tym samym katalogu)
- **Dependency Injection:** `42-dependency-injection.md` (w tym samym katalogu)
- **Docker CLI:** `docker/README_CLI.md`

---

## ✨ Podsumowanie

✅ **Obsługa LiteLLM (LM Studio)** - bez potrzeby Ollama  
✅ **Dependency Injection** - czystsza architektura  
✅ **Separation of Concerns** - łatwiejsze utrzymanie  
✅ **Testy jednostkowe** - pełne pokrycie  
✅ **Docker Support** - gotowy kontener  

**Wszystko działa wstecznie kompatybilnie!**

