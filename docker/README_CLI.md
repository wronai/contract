# Reclapp CLI Docker Container

Kontener Docker z prekonfigurowanym LiteLLM providerem do użycia z LM Studio.

## 🚀 Szybki Start

### 1. Uruchom LM Studio na hoście (port 8123)

Upewnij się, że LM Studio działa i wystawia API na `http://localhost:8123`.

### 2. Uruchom Reclapp CLI w kontenerze

```bash
# Podstawowe użycie
docker compose run --rm reclapp-cli evolve --prompt "Create a todo app" -o ./output/my-app --port 4000

# Z własnymi zmiennymi środowiskowymi
LITELLM_URL=http://host.docker.internal:8123 \
LITELLM_MODEL=model:1 \
docker compose run --rm reclapp-cli evolve --prompt "Create a recipe app" -o ./output/recipe-app --port 4001

# Z verbose output
docker compose run --rm reclapp-cli evolve --prompt "Create a blog app" -o ./output/blog --port 4002 --verbose
```

### 3. Wygenerowane aplikacje

Wygenerowane aplikacje są zapisywane w `./output/` na hoście (mountowany volume).

## 📋 Przykłady

### Prosta aplikacja todo

```bash
docker compose run --rm reclapp-cli evolve \
  --prompt "Create a todo app with tasks and categories" \
  -o ./output/todo-app \
  --port 4000
```

### Aplikacja z przepisami

```bash
docker compose run --rm reclapp-cli evolve \
  --prompt "Create a recipe management system with: Recipes with name, description, ingredients, instructions, prep time, cook time, difficulty level, servings, category. Categories for recipes. REST API with Express.js and TypeScript. React frontend with Tailwind CSS." \
  -o ./output/recipe-app \
  --port 4002
```

### Z własnym modelem LM Studio

```bash
LITELLM_MODEL=your-model-name \
docker compose run --rm reclapp-cli evolve \
  --prompt "Create a blog app" \
  -o ./output/blog \
  --port 4003
```

## 🔧 Konfiguracja

### Zmienne środowiskowe

- `LLM_PROVIDER` - Provider LLM (domyślnie: `litellm`)
- `LITELLM_URL` - URL do LM Studio (domyślnie: `http://host.docker.internal:8123`)
- `LITELLM_MODEL` - Nazwa modelu w LM Studio (domyślnie: `model:1`)

### Volumes

- `./output` - Katalog z wygenerowanymi aplikacjami (zapisany na hoście)
- `./examples` - Przykłady kontraktów (read-only)
- `.` - Cały projekt (read-only, dla development)

## 💡 Wskazówki

1. **Output directory** - Wygenerowane aplikacje są w `./output/` na hoście
2. **Porty** - Używaj różnych portów dla różnych aplikacji (4000, 4001, 4002...)
3. **LM Studio** - Upewnij się, że LM Studio działa przed uruchomieniem
4. **Verbose mode** - Dodaj `--verbose` aby zobaczyć więcej szczegółów

## 🐛 Troubleshooting

### LM Studio nie odpowiada

```bash
# Sprawdź czy LM Studio działa
curl http://localhost:8123/v1/models

# Sprawdź logi kontenera
docker compose logs reclapp-cli
```

### Problem z portem

```bash
# Użyj innego portu
docker compose run --rm reclapp-cli evolve --prompt "..." -o ./output/app --port 5000
```

### Problem z uprawnieniami

```bash
# Upewnij się, że katalog output istnieje i ma odpowiednie uprawnienia
mkdir -p ./output
chmod 755 ./output
```

