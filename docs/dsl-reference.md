# Reclapp DSL Reference

## Important: Full DSL vs Mini-DSL

This document describes the **full Reclapp DSL** (the grammar in `dsl/grammar/reclapp.pegjs`) which uses uppercase keywords like `ENTITY` and `FIELD`.

For the **Mini-DSL** used by Reclapp Studio and stored as `.reclapp.rcl` (lowercase `app`, `entity`, `enum`, etc.), see:

- [Reclapp Studio Guide](./studio-guide.md)
- Example Mini-DSL contracts in [`examples/*/contracts/*.reclapp.rcl`](../examples/)

Mini-DSL quick example:

```rcl
app "CRM" {
  version: "1.0.0"
}

entity Contact {
  id uuid @unique @generated
  email email @unique
  createdAt datetime @generated
}
```

## Overview

Reclapp DSL is a declarative domain-specific language for building multi-platform business applications. Instead of describing *how* to build an application, you describe *what* the application should contain and do.

## Table of Contents

1. [Basic Syntax](#basic-syntax)
2. [Entity Declaration](#entity-declaration)
3. [Event Declaration](#event-declaration)
4. [Pipeline Declaration](#pipeline-declaration)
5. [Alert Declaration](#alert-declaration)
6. [Dashboard Declaration](#dashboard-declaration)
7. [Source Declaration](#source-declaration)
8. [Device Declaration](#device-declaration)
9. [Workflow Declaration](#workflow-declaration)
10. [Types and Annotations](#types-and-annotations)
11. [Expressions](#expressions)
12. [Examples](#examples)

---

## Basic Syntax

### Comments

```reclapp
# This is a single-line comment

/* This is a
   multi-line comment */
```

### Identifiers

Identifiers must start with a letter or underscore, followed by letters, numbers, or underscores:

```reclapp
myEntity
_privateField
Customer2
```

### Strings

Strings are enclosed in double quotes:

```reclapp
"Hello, World!"
"user@example.com"
```

### Numbers

```reclapp
42        # Integer
3.14      # Float
-100      # Negative
```

### Booleans

```reclapp
true
false
```

---

## Entity Declaration

Entities represent data models in your application.

### Syntax

```reclapp
ENTITY EntityName {
  FIELD fieldName: Type @annotation1 @annotation2 = defaultValue
  ...
}
```

### Example

```reclapp
ENTITY Customer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD email: Email @unique @required
  FIELD status: String @enum("pending", "active", "suspended") = "pending"
  FIELD createdAt: DateTime @generated
  FIELD balance: Money = 0
  FIELD tags: String[]
  FIELD metadata: JSON
}
```

### Built-in Types

| Type | Description |
|------|-------------|
| `UUID` | Universally unique identifier |
| `String` | Text value |
| `Int` | Integer number |
| `Float` | Decimal number |
| `Boolean` | True/false value |
| `DateTime` | Date and time |
| `Date` | Date only |
| `Email` | Email address (validated) |
| `URL` | URL (validated) |
| `JSON` | Arbitrary JSON data |
| `Money` | Monetary value |

### Type Modifiers

- `Type?` - Nullable type
- `Type[]` - Array of type

### Field Annotations

| Annotation | Description |
|------------|-------------|
| `@generated` | Auto-generated value |
| `@required` | Field is required |
| `@unique` | Value must be unique |
| `@index` | Create database index |
| `@pattern("regex")` | Validate against regex |
| `@min(n)` | Minimum value |
| `@max(n)` | Maximum value |
| `@enum("a", "b")` | Allowed values |
| `@default(value)` | Default value |

---

## Event Declaration

Events represent things that happen in your system (for event sourcing).

### Syntax

```reclapp
EVENT EventName {
  fieldName: Type
  ...
}
```

### Example

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

---

## Pipeline Declaration

Pipelines define data processing flows.

### Syntax

```reclapp
PIPELINE PipelineName {
  INPUT source.path
  TRANSFORM transform1, transform2, ...
  OUTPUT output1, output2, ...
  FILTER condition
  SCHEDULE "cron expression"
}
```

### Example

```reclapp
PIPELINE CustomerRiskAnalysis {
  INPUT customers.active
  TRANSFORM fetchFinancials, calculateRisk, normalize
  OUTPUT dashboard, alerts
  FILTER riskScore > 50
  SCHEDULE "0 */6 * * *"
}
```

### Built-in Transforms

- `normalize` - Normalize data structure
- `enrich` - Enrich with external data
- `validate` - Validate data
- `aggregate` - Aggregate values
- `filter` - Filter records

---

## Alert Declaration

Alerts define conditions that trigger notifications.

### Syntax

```reclapp
ALERT "Alert Name" {
  ENTITY EntityType "optional name"
  CONDITION expression
  TARGET target1, target2, protocol:path
  SEVERITY level
  THROTTLE "duration"
}
```

### Example

```reclapp
ALERT "High Risk Customer" {
  ENTITY Customer
  CONDITION riskScore > 80 AND status == "active"
  TARGET email, slack, mqtt:alerts/risk
  SEVERITY critical
  THROTTLE "4h"
}
```

### Severity Levels

- `low`
- `medium`
- `high`
- `critical`

### Target Types

- `email` - Email notification
- `slack` - Slack message
- `sms` - SMS message
- `webhook` - HTTP webhook
- `mqtt:topic` - MQTT publish

---

## Dashboard Declaration

Dashboards define real-time visualizations.

### Syntax

```reclapp
DASHBOARD "Dashboard Name" {
  ENTITY EntityType "optional filter"
  METRICS metric1, metric2, ...
  STREAM mode
  LAYOUT layoutType
  REFRESH "interval"
}
```

### Example

```reclapp
DASHBOARD "Customer Overview" {
  ENTITY Customer
  METRICS totalCount, activeCount, riskDistribution, revenueBySegment
  STREAM real_time
  LAYOUT grid
}
```

### Stream Modes

- `real_time` - Live updates
- `hourly` - Update every hour
- `daily` - Update daily
- `weekly` - Update weekly
- `manual` - Manual refresh only

### Layout Types

- `grid` - Grid layout
- `flex` - Flexible layout
- `tabs` - Tabbed layout

---

## Source Declaration

Sources define external data connections.

### Syntax

```reclapp
SOURCE sourceName {
  TYPE sourceType
  URL "endpoint"
  AUTH authMethod
  CACHE "duration"
  MAPPING {
    source.path -> targetField
    ...
  }
}
```

### Example

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

### Source Types

- `rest` - REST API
- `graphql` - GraphQL API
- `database` - Database connection
- `file` - File source

### Auth Methods

- `none` - No authentication
- `basic` - Basic auth
- `bearer` - Bearer token
- `api_key` - API key
- `oauth2` - OAuth 2.0

---

## Device Declaration

Devices define hardware integrations.

### Syntax

```reclapp
DEVICE "device-name" {
  TYPE deviceType
  PROTOCOL protocol
  TOPIC "mqtt/topic"
  SUBSCRIBE event1, event2
  PUBLISH event3, event4
  CONFIG {
    key: value
    ...
  }
}
```

### Example

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

### Protocols

- `mqtt` - MQTT protocol
- `coap` - CoAP protocol
- `http` - HTTP/REST
- `websocket` - WebSocket

---

## Workflow Declaration

Workflows define multi-step processes.

### Syntax

```reclapp
WORKFLOW WorkflowName {
  TRIGGER event.name

  StepName {
    ACTION actionName
    ON_SUCCESS: GOTO NextStep
    ON_FAILURE: GOTO ErrorStep
    TIMEOUT "duration"
  }
  ...
}
```

### Example

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

---

## Expressions

### Comparison Operators

- `==` - Equal
- `!=` - Not equal
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal

### Logical Operators

- `AND` - Logical and
- `OR` - Logical or
- `NOT` - Logical not

### Arithmetic Operators

- `+` - Addition
- `-` - Subtraction
- `*` - Multiplication
- `/` - Division
- `%` - Modulo

### Path Expressions

```reclapp
entity.field
entity.nested.field
entity.array[0]
```

### Function Calls

```reclapp
now()
count(items)
sum(values)
avg(scores)
```

---

## Complete Example

```reclapp
# =============================================================================
# B2B Customer Management System
# =============================================================================

# Data Sources
SOURCE krsApi {
  TYPE rest
  URL "https://api.krs.pl/v1"
  AUTH api_key
  CACHE "24h"
}

# Entities
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

# Events
EVENT CustomerRegistered {
  customerId: UUID
  name: String
  nip: String
  timestamp: DateTime
}

EVENT CustomerVerified {
  customerId: UUID
  verifiedBy: String
  timestamp: DateTime
}

# Pipelines
PIPELINE RiskAssessment {
  INPUT customers.pending
  TRANSFORM fetchFinancials, calculateRisk
  OUTPUT customers.update, alerts
  SCHEDULE "0 6 * * *"
}

# Alerts
ALERT "High Risk Customer" {
  ENTITY Customer
  CONDITION riskScore > 80
  TARGET email, slack
  SEVERITY high
}

# Dashboards
DASHBOARD "Customer Overview" {
  ENTITY Customer
  METRICS totalCount, byStatus, riskDistribution
  STREAM real_time
}

# Workflows
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

## Best Practices

1. **Use meaningful names** - Entity and field names should be descriptive
2. **Add comments** - Document complex logic and business rules
3. **Group related declarations** - Keep entities, events, and workflows organized
4. **Use consistent naming** - PascalCase for entities/events, camelCase for fields
5. **Define all events** - Every state change should have a corresponding event
6. **Set appropriate thresholds** - Configure alerts with meaningful conditions
7. **Use caching wisely** - Set appropriate cache durations for external sources

---

## Grammar (EBNF)

For the complete grammar specification, see [grammar/reclapp.pegjs](../dsl/grammar/reclapp.pegjs).
