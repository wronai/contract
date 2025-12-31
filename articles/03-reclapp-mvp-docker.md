---
title: "Reclapp MVP - Implementacja i Uruchomienie Docker"
slug: reclapp-mvp-docker
date: 2024-12-31
status: publish
categories: [Projects, DSL, DevOps]
tags: [reclapp, docker, mvp, implementation, eventstore]
featured_image: /images/reclapp-docker.png
excerpt: "Przewodnik po uruchomieniu MVP Reclapp z Docker Compose - event sourcing, CQRS, real-time dashboards i integracja hardware."
---

# Reclapp MVP - Implementacja i Uruchomienie Docker

## Wymagania

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (dla rozwoju lokalnego)
- 4GB RAM minimum

## Szybki Start

### 1. Pobierz Projekt

```bash
# Z archiwum
tar -xzf reclapp-mvp.tar.gz
cd reclapp

# Lub z repozytorium
git clone https://github.com/your-org/reclapp.git
cd reclapp
```

### 2. Uruchom Docker Compose

```bash
# Podstawowe usługi (API + Frontend + EventStore + Redis)
docker compose up -d

# Z hardware integration (MQTT)
docker compose --profile hardware up -d

# Z monitoringiem (Grafana + Prometheus)
docker compose --profile monitoring up -d

# Wszystko
docker compose --profile hardware --profile monitoring --profile dev up -d
```

### 3. Sprawdź Status

```bash
docker compose ps

# Logi
docker compose logs -f api
```

### 4. Otwórz Aplikację

- **Frontend Dashboard**: http://localhost:3000
- **API**: http://localhost:8080/api
- **EventStoreDB UI**: http://localhost:2113
- **MQTT Explorer**: http://localhost:4000 (z profilem hardware)
- **Grafana**: http://localhost:3001 (z profilem monitoring)

## Architektura Usług

```
┌─────────────────────────────────────────────────────────────────┐
│                         docker-compose                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    api      │  │  frontend   │  │ eventstore  │              │
│  │   :8080     │  │   :3000     │  │   :2113     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   redis     │  │    mqtt     │  │   grafana   │              │
│  │   :6379     │  │   :1883     │  │   :3001     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                    (hardware)       (monitoring)                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### DSL Operations

```bash
# Parse DSL
curl -X POST http://localhost:8080/api/parse \
  -H "Content-Type: application/json" \
  -d '{"source": "ENTITY Customer { FIELD id: UUID @generated }"}'

# Validate DSL
curl -X POST http://localhost:8080/api/validate \
  -H "Content-Type: application/json" \
  -d '{"source": "ENTITY Customer { FIELD id: UUID @generated }"}'

# Build Execution Plan
curl -X POST http://localhost:8080/api/plan \
  -H "Content-Type: application/json" \
  -d '{"source": "..."}'
```

### Data Operations

```bash
# Get customers
curl http://localhost:8080/api/customers

# Get customer by ID
curl http://localhost:8080/api/customers/cust_abc123

# Get contractors
curl http://localhost:8080/api/contractors

# Get risk events
curl http://localhost:8080/api/risk-events
curl http://localhost:8080/api/risk-events?severity=critical
curl http://localhost:8080/api/risk-events?resolved=false

# Dashboard summary
curl http://localhost:8080/api/dashboard/summary
```

### Event Sourcing

```bash
# Get events from stream
curl http://localhost:8080/api/events/customer-123

# Get all events

curl http://localhost:8080/api/events?from=0&count=100
```

### Real-time Streaming

```bash
# SSE stream
curl http://localhost:8080/api/stream

# WebSocket
wscat -c ws://localhost:8080/ws
```

## Struktura Projektu

```
reclapp/
├── dsl/                    # DSL Grammar & Parser
│   ├── grammar/            # Peggy grammar files
│   ├── parser/             # Parser implementation
│   ├── ast/                # AST type definitions
│   └── validator/          # Semantic validation
├── core/                   # Core Platform Services
│   ├── planner/            # Execution graph builder
│   ├── eventstore/         # Event sourcing
│   └── cqrs/               # Command/Query separation
├── modules/                # Data Source Modules
│   └── mock/               # Mock data generators
├── api/                    # REST API Server
├── frontend/               # React Dashboard
├── examples/               # Example DSL Programs
└── docker/                 # Docker configurations
```

## Konfiguracja

### Zmienne Środowiskowe

```bash
# API Server
PORT=8080
NODE_ENV=development
EVENTSTORE_URL=esdb://eventstore:2113?tls=false
REDIS_URL=redis://redis:6379
MQTT_BROKER=mqtt://mqtt:1883
```

### Docker Compose Profiles

| Profile | Usługi | Opis |
|---------|--------|------|
| (default) | api, frontend, eventstore, redis | Podstawowe usługi |
| hardware | mqtt, mqtt-explorer | Integracja IoT |
| monitoring | grafana, prometheus | Monitoring |
| dev | adminer, swagger | Narzędzia deweloperskie |

## Rozwój Lokalny

```bash
# Instalacja zależności
npm install

# Budowanie parsera
npm run build:parser

# Uruchomienie dev server
npm run dev

# Testy
npm test
```

## Troubleshooting

### EventStoreDB nie startuje

```bash
# Sprawdź logi
docker compose logs eventstore

# Zresetuj dane
docker compose down -v
docker compose up -d
```

### API nie odpowiada

```bash
# Health check
curl http://localhost:8080/api/health

# Sprawdź logi
docker compose logs api
```

---

*Reclapp MVP v1.0 - dokumentacja Docker*
