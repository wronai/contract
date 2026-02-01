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
id              : uuid                 # @unique @auto
firstName       : text                 # @required
lastName        : text                 # @required
email           : email                # @unique @required
phone           : phone?
company         : text?
position        : text?
status          : ContactStatus        # = active
source          : LeadSource?
tags            : text[]?
notes           : text?
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Company

```yaml
# entity: Company
id              : uuid                 # @unique @auto
name            : text                 # @required @unique
industry        : text?
website         : url?
size            : CompanySize?
revenue         : money(PLN)?
address         : text?
city            : text?
country         : text                 # = PL
taxId           : text?                # @unique - NIP
contacts        : <- Contact[]
deals           : <- Deal[]
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Deal

```yaml
# entity: Deal
id              : uuid                 # @unique @auto
title           : text                 # @required
value           : money(PLN)           # @required
stage           : DealStage            # = lead
probability     : int(0..100)          # = 10
expectedClose   : date?
contact         : -> Contact           # @required
company         : -> Company?
owner           : -> User              # @required
notes           : text?
lostReason      : text?
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
closedAt        : datetime?
```

---

### Activity

```yaml
# entity: Activity
id              : uuid                 # @unique @auto
type            : ActivityType         # @required
subject         : text                 # @required
description     : text?
dueDate         : datetime?
completed       : bool                 # = false
contact         : -> Contact?
deal            : -> Deal?
owner           : -> User              # @required
createdAt       : datetime             # @auto
```

---

### User

```yaml
# entity: User
id              : uuid                 # @unique @auto
email           : email                # @unique @required
name            : text                 # @required
role            : UserRole             # = sales
avatar          : url?
active          : bool                 # = true
createdAt       : datetime             # @auto
```

---

## 🏷️ Typy wyliczeniowe

```yaml
# enum: ContactStatus
- active         # Aktywny kontakt
- inactive       # Nieaktywny
- lead           # Potencjalny klient
- customer       # Klient
- churned        # Utracony
```

```yaml
# enum: LeadSource
- website        # Ze strony www
- referral       # Polecenie
- linkedin       # LinkedIn
- coldcall       # Zimny telefon
- event          # Wydarzenie
- other          # Inne
```

```yaml
# enum: DealStage
- lead           # Lead
- qualified      # Zakwalifikowany
- proposal       # Propozycja
- negotiation    # Negocjacje
- won            # Wygrana
- lost           # Przegrana
```

```yaml
# enum: ActivityType
- call           # Rozmowa telefoniczna
- email          # Email
- meeting        # Spotkanie
- task           # Zadanie
- note           # Notatka
```

```yaml
# enum: CompanySize
- micro          # 1-9 pracowników
- small          # 10-49 pracowników
- medium         # 50-249 pracowników
- large          # 250+ pracowników
```

```yaml
# enum: UserRole
- admin          # Administrator
- manager        # Manager
- sales          # Handlowiec
- support        # Wsparcie
```

---

## 📡 Zdarzenia

### ContactCreated

```yaml
# event: ContactCreated
contactId       : uuid
email           : text
source          : text
createdBy       : uuid
```

### DealStageChanged

```yaml
# event: DealStageChanged
dealId          : uuid
previousStage   : text
newStage        : text
changedBy       : uuid
value           : float
```

### DealWon

```yaml
# event: DealWon
dealId          : uuid
contactId       : uuid
companyId       : uuid?
value           : float
closedBy        : uuid
```

### DealLost

```yaml
# event: DealLost
dealId          : uuid
reason          : text
lostBy          : uuid
```

### ActivityCompleted

```yaml
# event: ActivityCompleted
activityId      : uuid
type            : text
contactId       : uuid?
dealId          : uuid?
completedBy     : uuid
```

---

## 🚨 Alerty

### High Value Deal

```yaml
# alert: HighValueDeal
entity: Deal
when: value > 100000
notify: [email, slack]
severity: high
message: "Nowa transakcja o wysokiej wartości: {{title}}"
```

### Stale Deal

```yaml
# alert: StaleDeal
entity: Deal
when: updatedAt < now() - 14d AND stage != 'won' AND stage != 'lost'
notify: [email]
severity: medium
message: "Transakcja {{title}} nie była aktualizowana od 14 dni"
```

### Overdue Activity

```yaml
# alert: OverdueActivity
entity: Activity
when: dueDate < now() AND completed = false
notify: [email]
severity: low
message: "Zaległe zadanie: {{subject}}"
```

---

## 📊 Panele

### Sales Dashboard

```yaml
# dashboard: SalesDashboard
entity: Deal
metrics: [count, sum.value, avg.probability]
layout: grid
```

### Pipeline View

```yaml
# dashboard: PipelineView
entity: Deal
metrics: [count, sum.value]
layout: kanban
```

---

## 🔄 Przepływy danych

### Deal Analytics

```yaml
# pipeline: DealAnalytics
input: [Deal.*, DealStageChanged]
output: DealMetrics
schedule: "0 */6 * * *"
transform: [aggregate, calculate]
```

---

## 🌐 Konfiguracja API

```yaml
# api:
prefix: /api/v1
auth: jwt
rateLimit: 1000
cors: *
```

---

## 🚀 Deployment

```yaml
# deployment:
type: docker
database: postgresql
cache: redis
```

---

## 🔐 Zmienne środowiskowe

```yaml
# env:
DATABASE_URL    : string               # @required
JWT_SECRET      : secret               # @required
SMTP_HOST       : string               # = localhost
SMTP_PORT       : number               # = 587
SLACK_WEBHOOK   : string?
```

---

*Wygenerowano przez Reclapp Studio*
