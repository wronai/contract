# B2B Risk Monitoring Example

Kompletny przykład autonomicznego systemu monitoringu ryzyka B2B z użyciem Reclapp.

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                    B2B RISK MONITORING                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ External │───▶│ Reclapp  │───▶│ Causal   │───▶│ Alert    │  │
│  │ Data API │    │ Ingestion│    │ Analysis │    │ System   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │                                               │          │
│       │          ┌──────────┐                        │          │
│       └─────────▶│ Event    │◀───────────────────────┘          │
│                  │ Store    │                                    │
│                  └──────────┘                                    │
│                       │                                          │
│                       ▼                                          │
│                  ┌──────────┐    ┌──────────┐                   │
│                  │ Read     │───▶│ Dashboard│                   │
│                  │ Model    │    │ UI       │                   │
│                  └──────────┘    └──────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Uruchom cały stack
docker compose up -d

# Sprawdź logi
docker compose logs -f reclapp-api

# Otwórz dashboard
open http://localhost:3000

# API dostępne na
curl http://localhost:8080/api/v1/health
```

## Komponenty

- **reclapp-api** - Główne API z DSL parser i execution engine
- **eventstore** - Event Store dla event sourcing
- **redis** - Cache i rate limiting
- **postgres** - Read models i analytics
- **dashboard** - React dashboard

## Przykładowy kontrakt

Zobacz `contracts/risk-agent.ts` dla pełnej definicji agenta.

## Endpoints

| Endpoint | Opis |
|----------|------|
| `GET /api/v1/customers` | Lista klientów z risk score |
| `GET /api/v1/customers/:id/risk` | Szczegóły ryzyka klienta |
| `POST /api/v1/interventions` | Zastosuj interwencję |
| `GET /api/v1/dashboard/risk` | Dane do dashboardu |
| `POST /mcp` | MCP Protocol endpoint |

## Środowisko

Skopiuj `.env.example` do `.env` i dostosuj wartości.
