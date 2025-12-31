---
title: "Reclapp - Deklaratywna Platforma do Budowy Aplikacji Biznesowych"
slug: reclapp-overview
date: 2024-12-31
status: publish
categories: [Projects, DSL, Platform]
tags: [reclapp, dsl, declarative, event-sourcing, cqrs, b2b]
featured_image: /images/reclapp-architecture.png
excerpt: "Reclapp to stack-agnostyczna platforma deklaratywna DSL do budowy aplikacji desktop, mobile i web z jednego źródła. Poznaj architekturę, możliwości i zastosowania."
---

# Reclapp - Deklaratywna Platforma do Budowy Aplikacji Biznesowych

## Wprowadzenie

**Reclapp** to innowacyjna platforma umożliwiająca tworzenie kompletnych aplikacji biznesowych za pomocą deklaratywnego języka DSL (Domain Specific Language). Zamiast opisywać *jak* budować aplikację, opisujesz *co* aplikacja ma robić - system automatycznie generuje cały kod, infrastrukturę i integracje.

## Kluczowe Cechy

### 🎯 Deklaratywny DSL

Prosty, czytelny język do definiowania:
- Encji i modeli danych
- Eventów (event sourcing)
- Pipeline'ów przetwarzania danych
- Alertów i powiadomień
- Dashboardów w czasie rzeczywistym
- Integracji z hardware (IoT)

### 🔧 Stack-Agnostic

JSON AST jako uniwersalny format wymiany pozwala na:
- Generowanie kodu w dowolnym języku
- Integrację z istniejącymi systemami
- Wsparcie dla wielu platform (web, mobile, desktop)

### 📊 Event Sourcing & CQRS

Wbudowana architektura event-driven:
- Pełna historia zmian
- Odtwarzanie stanu
- Temporalne zapytania
- Read models dla szybkiego dostępu

### 🔌 Hardware Integration

Natywne wsparcie dla IoT:
- MQTT / CoAP
- LED Matrix, GPIO
- Edge computing
- Real-time streaming

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                        DSL Programs                              │
│                    (Declarative Definitions)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DSL Parser (Peggy)                          │
│                     JSON AST Generation                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Execution Planner                             │
│              DAG Construction & Dependency Resolution            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Event Store    │ │   Generators    │ │  Hardware/Edge  │
│  (EventStoreDB) │ │  (Multi-target) │ │  (MQTT/CoAP)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Przykład DSL

```reclapp
# Definicja encji klienta
ENTITY Customer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD nip: String @unique @pattern("[0-9]{10}")
  FIELD status: String @enum("pending", "active") = "pending"
  FIELD riskScore: Int @min(0) @max(100) = 50
}

# Event sourcing
EVENT CustomerVerified {
  customerId: UUID
  verifiedBy: String
  timestamp: DateTime
}

# Alert dla wysokiego ryzyka
ALERT "High Risk" {
  ENTITY Customer
  CONDITION riskScore > 80
  TARGET email, slack
  SEVERITY critical
}

# Dashboard w czasie rzeczywistym
DASHBOARD "Overview" {
  ENTITY Customer
  METRICS totalCount, byStatus, riskDistribution
  STREAM real_time
}
```

## Zastosowania B2B

1. **Onboarding klientów** - automatyczna weryfikacja KRS/CEIDG
2. **Monitoring kontrahentów** - śledzenie zmian finansowych i prawnych
3. **Raportowanie** - automatyczne generowanie analiz i raportów
4. **Procesy zakupowe** - weryfikacja dostawców i limity kredytowe

## Status Projektu

**MVP Ready** - Działający prototyp z:
- ✅ Parser DSL (Peggy)
- ✅ Walidator semantyczny
- ✅ Event Store (in-memory + EventStoreDB)
- ✅ CQRS infrastructure
- ✅ REST API
- ✅ Dashboard React
- ✅ Docker Compose

## Następne Kroki

- Generator kodu dla React/Vue
- Generator API GraphQL
- Integracja z prawdziwymi API (KRS, CEIDG)
- LLM integration dla generowania DSL

## Linki

- [Repozytorium GitHub](#)
- [Dokumentacja DSL](/docs/reclapp-dsl-reference)
- [Docker Hub](#)

---

*Projekt rozwijany w ramach inicjatywy Softreck - prototypowanie i szybkie wdrożenia.*
