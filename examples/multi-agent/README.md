# Multi-Agent Orchestration Example

Przykład orkiestracji wielu agentów AI współpracujących w ramach jednego workflow.

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                  MULTI-AGENT ORCHESTRATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌────────────────┐                           │
│                    │  Orchestrator  │                           │
│                    │    Agent       │                           │
│                    └───────┬────────┘                           │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐             │
│  │   Risk     │    │  Compliance│    │  Customer  │             │
│  │   Agent    │    │   Agent    │    │   Agent    │             │
│  └────────────┘    └────────────┘    └────────────┘             │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                    │
│                            ▼                                    │
│                    ┌────────────────┐                           │
│                    │  Event Store   │                           │
│                    │  (Shared State)│                           │
│                    └────────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Agenci

### 1. Risk Agent
- Monitoruje ryzyko kontrahentów
- Wykonuje causal analysis
- Sugeruje interwencje

### 2. Compliance Agent
- Sprawdza zgodność z regulacjami
- Monitoruje KYC/AML
- Generuje raporty compliance

### 3. Customer Agent
- Zarządza relacjami z klientami
- Analizuje customer journey
- Personalizuje komunikację

### 4. Orchestrator
- Koordynuje pracę agentów
- Rozwiązuje konflikty
- Agreguje wyniki

## Quick Start

```bash
# Uruchom wszystkie agenty
docker compose up -d

# Sprawdź status
docker compose ps

# Logi orchestratora
docker compose logs -f orchestrator

# Wyślij zadanie
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"type": "full_customer_analysis", "customerId": "cust-123"}'
```

## Komunikacja między agentami

Agenci komunikują się przez:
1. **Event Store** - główny kanał dla zdarzeń domenowych
2. **Message Queue** - dla bezpośrednich komend
3. **Shared State** - dla współdzielonych read models

## Conflict Resolution

Gdy agenci mają sprzeczne rekomendacje:
1. Orchestrator zbiera wszystkie rekomendacje
2. Ocenia wagi i confidence każdego agenta
3. Stosuje strategię resolution (voting, priority, human escalation)
4. Loguje decyzję dla audytu
