# CRM System

> Customer Relationship Management with contacts, deals, and activities

| Właściwość | Wartość |
|------------|---------|
| Wersja | 2.4.1 |
| Autor | Reclapp Team |
| Licencja | MIT |

---

## 📦 Encje

### Contact

```yaml
# entity: Contact
email           : email                # @unique
firstName       : text
lastName        : text
phone           : phone
company         : -> Company
jobTitle        : string | null
linkedInUrl     : string | null
source          : text
status          : text
ownerId         : uuid
tags            : string[] | null
customFields    : Record<string, any> | null
lastContactedAt : datetime
createdAt       : datetime             # @auto
id              : uuid                 # @unique @auto
updatedAt       : datetime             # @auto
```

---

### Company

```yaml
# entity: Company
name            : text
domain          : string | null
industry        : string | null
size            : string | null
revenue         : string | null
website         : url
phone           : phone
address         : Record<string, any> | null
ownerId         : uuid
status          : text
createdAt       : datetime             # @auto
id              : uuid                 # @unique @auto
updatedAt       : datetime             # @auto
```

---

### Deal

```yaml
# entity: Deal
name            : text
companyId       : -> Company
contactId       : -> Contact
ownerId         : uuid
stage           : text
amount          : Decimal
currency        : text
probability     : int
expectedCloseDate: string | null
actualCloseDate : string | null
lostReason      : string | null
notes           : string | null
customFields    : Record<string, any> | null
createdAt       : datetime             # @auto
id              : uuid                 # @unique @auto
updatedAt       : datetime             # @auto
```

---

### Activity

```yaml
# entity: Activity
type            : text
subject         : text
description     : string | null
contactId       : -> Contact
companyId       : -> Company
dealId          : -> Deal
ownerId         : uuid
dueDate         : string | null
completedAt     : datetime
outcome         : string | null
createdAt       : datetime             # @auto
id              : uuid                 # @unique @auto
updatedAt       : datetime             # @auto
```

---

### Task

```yaml
# entity: Task
title           : text
description     : string | null
contactId       : -> Contact
dealId          : -> Deal
assignedTo      : text
dueDate         : text
priority        : text
status          : text
completedAt     : datetime
id              : uuid                 # @unique @auto
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Pipeline

```yaml
# entity: Pipeline
name            : text
stages          : Record<string, any>
defaultStage    : text
isDefault       : bool
createdAt       : datetime             # @auto
id              : uuid                 # @unique @auto
updatedAt       : datetime             # @auto
```

---

### Item

```yaml
# entity: Item
id              : uuid                 # @unique @auto
title           : text
description     : text
status          : text
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Request

```yaml
# entity: Request
user            : JWTPayload
```

---

### JWTPayload

```yaml
# entity: JWTPayload
userId          : uuid
email           : email                # @unique
roles           : string[]
```

---

## 📡 Zdarzenia

### ContactCreated

```yaml
# event: ContactCreated
contactId       : String
source          : String
ownerId         : String
timestamp       : DateTime
```

### DealStageChanged

```yaml
# event: DealStageChanged
dealId          : String
previousStage   : String
newStage        : String
ownerId         : String
timestamp       : DateTime
```

### DealWon

```yaml
# event: DealWon
dealId          : String
amount          : Decimal
ownerId         : String
daysInPipeline  : Int
timestamp       : DateTime
```

### DealLost

```yaml
# event: DealLost
dealId          : String
amount          : Decimal
reason          : String
ownerId         : String
timestamp       : DateTime
```

### TaskCompleted

```yaml
# event: TaskCompleted
taskId          : String
assignedTo      : String
dealId          : String
timestamp       : DateTime
```

---

## 🚨 Alerty

### Deal Stalled

```yaml
# alert: Deal Stalled
entity: Deal
when: daysInStage > 14 AND stage != "Closed Won" AND stage != "Closed Lost"
notify: []
severity: medium
```

### High Value Deal at Risk

```yaml
# alert: High Value Deal at Risk
entity: Deal
when: amount > 50000 AND probability < 30
notify: []
severity: high
```

### No Activity Warning

```yaml
# alert: No Activity Warning
entity: Contact
when: daysSinceLastContact > 30 AND status == "active"
notify: []
severity: low
```

### Task Overdue

```yaml
# alert: Task Overdue
entity: Task
when: dueDate < now() AND status != "completed"
notify: []
severity: medium
```

---

## 🔄 Przepływy danych

### LeadScoring

```yaml
# pipeline: LeadScoring
input: [ContactCreated.stream, Activity.stream, Email.stream]
output: dashboard,recommendations
schedule: "0 * * * *"
transform: [calculateEngagement, scoreLeads, rankContacts]
```

### DealForecasting

```yaml
# pipeline: DealForecasting
input: [Deal.changes, DealStageChanged.stream]
output: dashboard,reports
schedule: "0 0 * * *"
transform: [analyzeHistory, predictOutcome, updateForecast]
```

### ActivityTracking

```yaml
# pipeline: ActivityTracking
input: [Email.stream, Meeting.stream, Activity.stream]
output: contactProfile,analytics
transform: [aggregate, enrichContact, updateTimeline]
```

---

## 🔌 Źródła danych

### linked In Api

```yaml
# source: linkedInApi
type: rest
url: "https://api.linkedin.com/v2"
auth: oauth2
```

### email Provider

```yaml
# source: emailProvider
type: rest
url: "${EMAIL_API_URL}"
auth: apiKey
```

---

## ⚙️ Przepływy pracy

### Lead Nurturing

```yaml
# workflow: LeadNurturing
trigger: ContactCreated.event
steps: [[object Object], [object Object], [object Object], [object Object]]
```

### Deal Closing

```yaml
# workflow: DealClosing
trigger: Deal.stageChanged
steps: [[object Object], [object Object], [object Object]]
```

---

## 📊 Panele

### Sales Pipeline

```yaml
# dashboard: Sales Pipeline
entity: Deal
metrics: [totalPipelineValue, dealsByStage, avgDealSize, winRate, avgSalesCycle]
layout: grid
```

### Sales Forecast

```yaml
# dashboard: Sales Forecast
entity: Deal
metrics: [forecastedRevenue, bestCase, worstCase, committed, upside]
layout: grid
```

### Team Performance

```yaml
# dashboard: Team Performance
entity: Team
metrics: [revenueByRep, activitiesByRep, quotaAttainment, leaderboard]
layout: tabs
```

### Contact Insights

```yaml
# dashboard: Contact Insights
entity: Contact
metrics: [totalContacts, leadsBySource, conversionRate, topLeads]
layout: grid
```

---

## 🌐 Konfiguracja API

```yaml
# api:
prefix: /api/v1
```

---

## 🚀 Deployment

```yaml
# deployment:
type: web
database: undefined
```

---

## 🔐 Zmienne środowiskowe

```yaml
# env:
API_PORT        : Int                  # = "8080"
DATABASE_URL    : String               # @required
JWT_SECRET      : String               # @required
EMAIL_API_URL   : String
EMAIL_API_KEY   : String
FRONTEND_URL    : String               # = "http://localhost:3000"
APP_DOMAIN      : String               # = "localhost"
HOSTING_PROVIDER: String               # = "docker"
```

---

*Wygenerowano przez Reclapp Studio*
