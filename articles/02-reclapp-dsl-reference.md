---
title: "Reclapp DSL - Kompletna Dokumentacja Składni"
slug: reclapp-dsl-reference
date: 2024-12-31
status: publish
categories: [Projects, DSL, Documentation]
tags: [reclapp, dsl, syntax, reference, tutorial]
featured_image: /images/reclapp-dsl-code.png
excerpt: "Pełna dokumentacja składni języka Reclapp DSL - encje, eventy, pipeline'y, alerty, dashboardy i integracje hardware."
---

# Reclapp DSL - Kompletna Dokumentacja Składni

## Wprowadzenie

Reclapp DSL to deklaratywny język domenowy zaprojektowany do definiowania aplikacji biznesowych. Zamiast pisać kod imperatywny, opisujesz strukturę i zachowanie aplikacji w prostej, czytelnej składni.

## Podstawowa Składnia

### Komentarze

```reclapp
# Komentarz jednoliniowy

/* Komentarz
   wieloliniowy */
```

### Typy Danych

| Typ | Opis | Przykład |
|-----|------|----------|
| `UUID` | Unikalny identyfikator | `550e8400-e29b-41d4-a716-446655440000` |
| `String` | Tekst | `"Hello World"` |
| `Int` | Liczba całkowita | `42` |
| `Float` | Liczba zmiennoprzecinkowa | `3.14` |
| `Boolean` | Wartość logiczna | `true`, `false` |
| `DateTime` | Data i czas | `2024-12-31T12:00:00Z` |
| `Date` | Tylko data | `2024-12-31` |
| `Email` | Adres email (walidowany) | `user@example.com` |
| `URL` | Adres URL | `https://example.com` |
| `JSON` | Dowolne dane JSON | `{"key": "value"}` |
| `Money` | Kwota pieniężna | `1000.00` |

### Modyfikatory Typów

- `Type?` - Typ nullable (może być null)
- `Type[]` - Tablica typu

## Deklaracja Encji (ENTITY)

Encje reprezentują modele danych w aplikacji.

```reclapp
ENTITY Customer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD email: Email @unique @required
  FIELD status: String @enum("pending", "active", "suspended") = "pending"
  FIELD createdAt: DateTime @generated
  FIELD balance: Money = 0
  FIELD tags: String[]
  FIELD metadata: JSON?
}
```

### Adnotacje Pól

| Adnotacja | Opis |
|-----------|------|
| `@generated` | Wartość generowana automatycznie |
| `@required` | Pole wymagane |
| `@unique` | Wartość musi być unikalna |
| `@index` | Tworzony indeks bazy danych |
| `@pattern("regex")` | Walidacja wyrażeniem regularnym |
| `@min(n)` | Minimalna wartość |
| `@max(n)` | Maksymalna wartość |
| `@enum("a", "b")` | Dozwolone wartości |
| `@default(value)` | Wartość domyślna |

## Deklaracja Eventów (EVENT)

Eventy reprezentują zdarzenia w systemie (event sourcing).

```reclapp
EVENT CustomerRegistered {
  customerId: UUID
  name: String
  email: Email
  timestamp: DateTime
}

EVENT OrderPlaced {
  orderId: UUID
  customerId: UUID
  items: JSON
  totalAmount: Money
  timestamp: DateTime
}
```

## Deklaracja Pipeline'ów (PIPELINE)

Pipeline'y definiują przepływ przetwarzania danych.

```reclapp
PIPELINE CustomerRiskAnalysis {
  INPUT customers.active
  TRANSFORM fetchFinancials, calculateRisk, normalize
  OUTPUT dashboard, alerts
  FILTER riskScore > 50
  SCHEDULE "0 */6 * * *"
}
```

### Wbudowane Transformacje

- `normalize` - Normalizacja struktury danych
- `enrich` - Wzbogacenie danymi zewnętrznymi
- `validate` - Walidacja danych
- `aggregate` - Agregacja wartości
- `filter` - Filtrowanie rekordów

## Deklaracja Alertów (ALERT)

Alerty definiują warunki wyzwalające powiadomienia.

```reclapp
ALERT "High Risk Customer" {
  ENTITY Customer
  CONDITION riskScore > 80 AND status == "active"
  TARGET email, slack, mqtt:alerts/risk
  SEVERITY critical
  THROTTLE "4h"
}
```

### Poziomy Severity

- `low` - Niski priorytet
- `medium` - Średni priorytet
- `high` - Wysoki priorytet
- `critical` - Krytyczny

### Typy Celów (TARGET)

- `email` - Powiadomienie email
- `slack` - Wiadomość Slack
- `sms` - SMS
- `webhook` - HTTP webhook
- `mqtt:topic` - Publikacja MQTT

## Deklaracja Dashboardów (DASHBOARD)

Dashboardy definiują wizualizacje w czasie rzeczywistym.

```reclapp
DASHBOARD "Customer Overview" {
  ENTITY Customer
  METRICS totalCount, activeCount, riskDistribution, revenueBySegment
  STREAM real_time
  LAYOUT grid
  REFRESH "30s"
}
```

### Tryby Stream

- `real_time` - Aktualizacje na żywo
- `hourly` - Co godzinę
- `daily` - Codziennie
- `weekly` - Co tydzień
- `manual` - Tylko ręczne odświeżanie

## Deklaracja Źródeł (SOURCE)

Źródła definiują połączenia z zewnętrznymi API i bazami danych.

```reclapp
SOURCE companyRegistry {
  TYPE rest
  URL "https://api.krs.pl/v1/company"
  AUTH api_key
  CACHE "24h"
  MAPPING {
    response.name -> companyName
    response.nip -> taxId
    response.address -> address
  }
}
```

### Typy Źródeł

- `rest` - REST API
- `graphql` - GraphQL API
- `database` - Połączenie bazodanowe
- `file` - Źródło plikowe

## Deklaracja Urządzeń (DEVICE)

Urządzenia definiują integracje hardware.

```reclapp
DEVICE "status-display" {
  TYPE led_matrix
  PROTOCOL mqtt
  TOPIC "devices/display/status"
  SUBSCRIBE Customer.riskHigh, Alert.critical
  CONFIG {
    width: 64
    height: 32
    brightness: 80
  }
}
```

### Protokoły

- `mqtt` - MQTT
- `coap` - CoAP
- `http` - HTTP/REST
- `websocket` - WebSocket

## Deklaracja Workflow (WORKFLOW)

Workflow definiują wieloetapowe procesy.

```reclapp
WORKFLOW CustomerOnboarding {
  TRIGGER CustomerRegistered

  VerifyIdentity {
    ACTION verifyKYC
    ON_SUCCESS: GOTO CheckCredit
    ON_FAILURE: GOTO ManualReview
    TIMEOUT "5m"
  }

  CheckCredit {
    ACTION fetchCreditScore
    ON_SUCCESS: GOTO Approve
    ON_FAILURE: GOTO Reject
  }

  ManualReview {
    ACTION notifyReviewer
    ON_SUCCESS: GOTO Approve
    ON_FAILURE: GOTO Reject
    TIMEOUT "48h"
  }

  Approve {
    ACTION activateCustomer
  }

  Reject {
    ACTION sendRejectionNotice
  }
}
```

## Wyrażenia

### Operatory Porównania

- `==` - Równe
- `!=` - Różne
- `>` - Większe
- `<` - Mniejsze
- `>=` - Większe lub równe
- `<=` - Mniejsze lub równe

### Operatory Logiczne

- `AND` - I logiczne
- `OR` - Lub logiczne
- `NOT` - Negacja

### Wyrażenia Ścieżkowe

```reclapp
entity.field
entity.nested.field
entity.array[0]
```

## Best Practices

1. **Używaj znaczących nazw** - Nazwy encji i pól powinny być opisowe
2. **Dodawaj komentarze** - Dokumentuj złożoną logikę biznesową
3. **Grupuj deklaracje** - Organizuj kod tematycznie
4. **Spójna konwencja nazewnictwa** - PascalCase dla encji/eventów, camelCase dla pól
5. **Definiuj wszystkie eventy** - Każda zmiana stanu powinna mieć odpowiadający event

## Przykład Kompletnej Aplikacji

```reclapp
# =============================================================================
# System Zarządzania Klientami B2B
# =============================================================================

# Źródła danych
SOURCE krsApi {
  TYPE rest
  URL "https://api.krs.pl/v1"
  AUTH api_key
  CACHE "24h"
}

# Encje
ENTITY Customer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD nip: String @required @unique @pattern("[0-9]{10}")
  FIELD email: Email @required
  FIELD status: String @enum("pending", "active", "suspended") = "pending"
  FIELD riskScore: Int @min(0) @max(100) = 50
  FIELD creditLimit: Money = 0
  FIELD createdAt: DateTime @generated
}

# Eventy
EVENT CustomerRegistered {
  customerId: UUID
  name: String
  nip: String
  timestamp: DateTime
}

# Pipeline
PIPELINE RiskAssessment {
  INPUT customers.pending
  TRANSFORM fetchFinancials, calculateRisk
  OUTPUT customers.update, alerts
  SCHEDULE "0 6 * * *"
}

# Alert
ALERT "High Risk Customer" {
  ENTITY Customer
  CONDITION riskScore > 80
  TARGET email, slack
  SEVERITY high
}

# Dashboard
DASHBOARD "Customer Overview" {
  ENTITY Customer
  METRICS totalCount, byStatus, riskDistribution
  STREAM real_time
}

# Workflow
WORKFLOW Onboarding {
  TRIGGER CustomerRegistered

  Verify {
    ACTION verifyWithKRS
    ON_SUCCESS: GOTO Activate
    ON_FAILURE: GOTO Review
  }

  Review {
    ACTION notifyAdmin
    TIMEOUT "24h"
  }

  Activate {
    ACTION setStatusActive
  }
}
```

---

*Dokumentacja Reclapp DSL v1.0 - aktualizacja: grudzień 2024*
