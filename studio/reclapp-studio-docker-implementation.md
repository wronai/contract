# Reclapp Studio - Docker Implementation z Ollama

**Status:** 🟢 Ready for Implementation  
**Wymagania:** Docker, 8GB+ RAM, GPU (opcjonalnie)

---

## 📋 Quick Start

```bash
git clone https://github.com/wronai/reclapp-studio
cd reclapp-studio
docker compose up -d
open http://localhost:7860
```

---

## 🏗️ Pełna Struktura

```
reclapp-studio/
├── docker-compose.yml
├── studio/
│   ├── Dockerfile
│   ├── app.py
│   ├── parser/
│   │   ├── markdown_parser.py
│   │   └── mini_parser.py
│   ├── generator/
│   │   └── typescript.py
│   ├── prompts/
│   │   └── system.txt
│   └── requirements.txt
└── projects/
```

---

## 📦 docker-compose.yml

```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:11434/api/tags || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 60s

  ollama-init:
    image: ollama/ollama:latest
    depends_on:
      ollama:
        condition: service_healthy
    entrypoint: sh -c "ollama pull mistral:7b-instruct-q4_0"
    environment:
      OLLAMA_HOST: http://ollama:11434
    network_mode: "service:ollama"

  studio:
    build: ./studio
    ports:
      - "7860:7860"
    volumes:
      - ./projects:/app/projects
    environment:
      OLLAMA_HOST: http://ollama:11434
      OLLAMA_MODEL: mistral:7b-instruct-q4_0
    depends_on:
      ollama:
        condition: service_healthy

volumes:
  ollama_data:
```

---

## 🔍 Odpowiedź na Pytania

### Który DSL jest lepszy od TypeScript?

**Rekomendacja: Dual-format (Markdown + Mini-DSL)**

| Format | Dla kogo | Kiedy używać |
|--------|----------|--------------|
| **contract.md** | Klienci, PM, LLM | Rozmowy, dokumentacja |
| **contract.rcl** | Programiści | Walidacja, edycja |
| TypeScript | Legacy | Migracja |

### Porównanie redukcji kodu

```
TypeScript: 633 linii (baseline)
YAML:       200 linii (-68%)
Markdown:   150 linii (-76%)
Mini-DSL:    80 linii (-87%)  ← BEST
```

### Który model Ollama?

| Model | RAM | Jakość | Użycie |
|-------|-----|--------|--------|
| mistral:7b-instruct-q4_0 | 4GB | ⭐⭐⭐⭐ | Rozmowa |
| codellama:7b-instruct | 4GB | ⭐⭐⭐⭐⭐ | Kod |
| phi3:mini | 2GB | ⭐⭐⭐ | Edge |
| llama3.2:3b | 2GB | ⭐⭐⭐ | Szybki |

---

## 🎯 Mini-DSL Syntax (contract.rcl)

```prisma
entity Contact {
  email     email  @unique
  firstName text
  lastName  text
  company   -> Company
  tags      text[]
  score     int(0..100) = 50
}

entity Deal {
  name   text
  stage  DealStage = Lead
  amount money(PLN)
}

enum DealStage { Lead, Qualified, Won, Lost }

alert "Deal Stalled" {
  when: deal.daysInStage > 14
  notify: [email, slack]
}
```

---

## 📊 Pipeline

```
Rozmowa → contract.md → contract.rcl → IR (JSON) → target/
   │           │              │            │           │
   │           │              │            │           ├── api/
   └── LLM ────┴── Parser ────┴── Parser ──┴── Gen ────├── frontend/
                                                       └── docker/
```

---

## 🚀 Następne Kroki

1. `git clone` repozytorium
2. `docker compose up -d`
3. Otwórz http://localhost:7860
4. Rozmawiaj z AI
5. Kliknij "Generuj kod"

---

*Szczegółowa implementacja w: reclapp-dsl-evolution-proposal.md*
