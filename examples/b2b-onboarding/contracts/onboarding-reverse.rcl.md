# b2-b-onboarding-api

> B2B customer onboarding with automatic registry verification

| Właściwość | Wartość |
|------------|---------|
| Wersja | 2.0.0 |
| Autor | Reclapp Team |
| Utworzono | 2026-02-01 |

---

## 📦 Encje

### Customer

```yaml
# entity: Customer
id              : uuid                 # @unique @required @auto
name            : text                 # @required
taxId           : text                 # @unique @required
regon           : text?
krsNumber       : text?
email           : email                # @required
phone           : phone?
address         : text?
city            : text?
postalCode      : text?
country         : text?                #  = PL
status          : customerstatus?      #  = pending
riskScore       : int(0..100)?         #  = 50
verifiedAt      : datetime?
createdAt       : datetime             # @required @auto
updatedAt       : datetime             # @required @auto
```

### Verification

```yaml
# entity: Verification
id              : uuid                 # @unique @required @auto
customer        : -> customer          # @required
type            : verificationtype     # @required
source          : text                 # @required
status          : verificationstatus?  #  = pending
result          : json?
score           : int(0..100)?
errorMessage    : text?
requestedAt     : datetime?            # @auto
completedAt     : datetime?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Document

```yaml
# entity: Document
id              : uuid                 # @unique @required @auto
customer        : -> customer          # @required
type            : documenttype         # @required
filename        : text                 # @required
url             : url                  # @required
status          : documentstatus?      #  = pending
verifiedAt      : datetime?
uploadedAt      : datetime?            # @auto
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### OnboardingDocument

```yaml
# entity: OnboardingDocument
id              : uuid                 # @required
customerId      : -> customer          # @required
documentType    : text                 # @required
fileName        : text                 # @required
fileUrl         : text?
status          : text                 # @required
reviewedBy      : text?
reviewedAt      : text?
notes           : text?
createdAt       : text                 # @required
updatedAt       : text?
```

---

## 📡 Zdarzenia

### CustomerRegistered

```yaml
# event: CustomerRegistered
customerId      : uuid
taxId           : text
email           : text
source          : text
```

### VerificationStarted

```yaml
# event: VerificationStarted
verificationId  : uuid
customerId      : uuid
type            : text
source          : text
```

### VerificationCompleted

```yaml
# event: VerificationCompleted
verificationId  : uuid
customerId      : uuid
type            : text
status          : text
score           : int
```

### CustomerVerified

```yaml
# event: CustomerVerified
customerId      : uuid
riskScore       : int
verifiedBy      : text
```

### CustomerRejected

```yaml
# event: CustomerRejected
customerId      : uuid
reason          : text
rejectedBy      : text
```

### RiskScoreChanged

```yaml
# event: RiskScoreChanged
customerId      : uuid
previousScore   : int
newScore        : int
reason          : text
```

### DocumentUploaded

```yaml
# event: DocumentUploaded
documentId      : uuid
customerId      : uuid
type            : text
filename        : text
```

---

## 🚨 Alerty

### HighRiskCustomer

```yaml
# alert: HighRiskCustomer
entity: Customer
when: riskScore > 80
notify: [email, slack]
severity: high
message: "Klient wysokiego ryzyka: {{name}} (score: {{riskScore}})"
```

### VerificationFailed

```yaml
# alert: VerificationFailed
entity: Verification
when: status = 'failed'
notify: [email]
severity: medium
message: "Weryfikacja nieudana dla klienta"
```

### PendingTooLong

```yaml
# alert: PendingTooLong
entity: Customer
when: status = 'pending' AND createdAt < now() - 7d
notify: [email]
severity: low
message: "Klient {{name}} oczekuje na weryfikację ponad 7 dni"
```

---

## 📊 Panele

### OnboardingDashboard

```yaml
# dashboard: OnboardingDashboard
entity: Customer
metrics: [count, avg.riskScore]
layout: grid
```

### VerificationStatus

```yaml
# dashboard: VerificationStatus
entity: Verification
metrics: [count]
layout: grid
```

---

## 🔌 Źródła danych

### KRSRegistry

```yaml
# source: KRSRegistry
type: rest
url: "https://api-krs.ms.gov.pl/api/krs/OdsychPodstawowe"
auth: none
cache: "1h"
```

### CEIDGRegistry

```yaml
# source: CEIDGRegistry
type: rest
url: "https://dane.biznes.gov.pl/api/ceidg/v2/firma"
auth: apiKey
cache: "1h"
```

### VIESVAT

```yaml
# source: VIESVAT
type: soap
url: "https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl"
auth: none
cache: "24h"
```

---

## ⚙️ Przepływy pracy

### CustomerOnboarding

```yaml
# workflow: CustomerOnboarding
trigger: CustomerRegistered
steps: [verifyKRS, verifyCEIDG, calculateRisk, approveOrReject]
```

### RiskRecalculation

```yaml
# workflow: RiskRecalculation
trigger: VerificationCompleted
steps: [aggregateScores, updateRiskScore, checkThresholds]
```

---

---

## 🤖 Plan AI

```json:contract.ai.json
{
  "app": {
    "name": "B2B Onboarding",
    "version": "2.0.0",
    "description": "B2B customer onboarding with automatic registry verification",
    "author": "Reclapp Team",
    "license": "MIT"
  },
  "entities": [
    {
      "name": "Customer",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "unique": true,
          "auto": true
        },
        {
          "name": "name",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "taxId",
          "type": "text",
          "required": true,
          "unique": true,
          "auto": false
        },
        {
          "name": "regon",
          "type": "text",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "krsNumber",
          "type": "text",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "email",
          "type": "email",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "phone",
          "type": "phone",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "address",
          "type": "text",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "city",
          "type": "text",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "postalCode",
          "type": "text",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "country",
          "type": "text",
          "required": false,
          "unique": false,
          "auto": false,
          "default": "PL"
        },
        {
          "name": "status",
          "type": "CustomerStatus",
          "required": false,
          "unique": false,
          "auto": false,
          "default": "pending"
        },
        {
          "name": "riskScore",
          "type": "int(0..100)",
          "required": false,
          "unique": false,
          "auto": false,
          "default": "50"
        },
        {
          "name": "verifiedAt",
          "type": "DateTime",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "required": true,
          "unique": false,
          "auto": true
        },
        {
          "name": "updatedAt",
          "type": "DateTime",
          "required": true,
          "unique": false,
          "auto": true
        }
      ]
    },
    {
      "name": "Verification",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "unique": true,
          "auto": true
        },
        {
          "name": "customer",
          "type": "-> Customer",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "type",
          "type": "VerificationType",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "source",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "status",
          "type": "VerificationStatus",
          "required": false,
          "unique": false,
          "auto": false,
          "default": "pending"
        },
        {
          "name": "result",
          "type": "json",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "score",
          "type": "int(0..100)",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "errorMessage",
          "type": "text",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "requestedAt",
          "type": "DateTime",
          "required": false,
          "unique": false,
          "auto": true
        },
        {
          "name": "completedAt",
          "type": "DateTime",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "createdAt",
          "type": "text",
          "required": true,
          "annotations": {}
        },
        {
          "name": "updatedAt",
          "type": "text",
          "required": true,
          "annotations": {}
        }
      ]
    },
    {
      "name": "Document",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "unique": true,
          "auto": true
        },
        {
          "name": "customer",
          "type": "-> Customer",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "type",
          "type": "DocumentType",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "filename",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "url",
          "type": "url",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "status",
          "type": "DocumentStatus",
          "required": false,
          "unique": false,
          "auto": false,
          "default": "pending"
        },
        {
          "name": "verifiedAt",
          "type": "DateTime",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "uploadedAt",
          "type": "DateTime",
          "required": false,
          "unique": false,
          "auto": true
        },
        {
          "name": "createdAt",
          "type": "text",
          "required": true,
          "annotations": {}
        },
        {
          "name": "updatedAt",
          "type": "text",
          "required": true,
          "annotations": {}
        }
      ]
    }
  ],
  "events": [
    {
      "name": "CustomerRegistered",
      "fields": [
        {
          "name": "customerId",
          "type": "uuid"
        },
        {
          "name": "taxId",
          "type": "text"
        },
        {
          "name": "email",
          "type": "text"
        },
        {
          "name": "source",
          "type": "text"
        }
      ]
    },
    {
      "name": "VerificationStarted",
      "fields": [
        {
          "name": "verificationId",
          "type": "uuid"
        },
        {
          "name": "customerId",
          "type": "uuid"
        },
        {
          "name": "type",
          "type": "text"
        },
        {
          "name": "source",
          "type": "text"
        }
      ]
    },
    {
      "name": "VerificationCompleted",
      "fields": [
        {
          "name": "verificationId",
          "type": "uuid"
        },
        {
          "name": "customerId",
          "type": "uuid"
        },
        {
          "name": "type",
          "type": "text"
        },
        {
          "name": "status",
          "type": "text"
        },
        {
          "name": "score",
          "type": "int"
        }
      ]
    },
    {
      "name": "CustomerVerified",
      "fields": [
        {
          "name": "customerId",
          "type": "uuid"
        },
        {
          "name": "riskScore",
          "type": "int"
        },
        {
          "name": "verifiedBy",
          "type": "text"
        }
      ]
    },
    {
      "name": "CustomerRejected",
      "fields": [
        {
          "name": "customerId",
          "type": "uuid"
        },
        {
          "name": "reason",
          "type": "text"
        },
        {
          "name": "rejectedBy",
          "type": "text"
        }
      ]
    },
    {
      "name": "RiskScoreChanged",
      "fields": [
        {
          "name": "customerId",
          "type": "uuid"
        },
        {
          "name": "previousScore",
          "type": "int"
        },
        {
          "name": "newScore",
          "type": "int"
        },
        {
          "name": "reason",
          "type": "text"
        }
      ]
    },
    {
      "name": "DocumentUploaded",
      "fields": [
        {
          "name": "documentId",
          "type": "uuid"
        },
        {
          "name": "customerId",
          "type": "uuid"
        },
        {
          "name": "type",
          "type": "text"
        },
        {
          "name": "filename",
          "type": "text"
        }
      ]
    }
  ],
  "alerts": [
    {
      "name": "HighRiskCustomer",
      "condition": "riskScore > 80",
      "targets": [
        "email",
        "slack"
      ],
      "severity": "high",
      "entity": "Customer",
      "message": "Klient wysokiego ryzyka: {{name}} (score: {{riskScore}})"
    },
    {
      "name": "VerificationFailed",
      "condition": "status = 'failed'",
      "targets": [
        "email"
      ],
      "severity": "medium",
      "entity": "Verification",
      "message": "Weryfikacja nieudana dla klienta"
    },
    {
      "name": "PendingTooLong",
      "condition": "status = 'pending' AND createdAt < now() - 7d",
      "targets": [
        "email"
      ],
      "severity": "low",
      "entity": "Customer",
      "message": "Klient {{name}} oczekuje na weryfikację ponad 7 dni"
    }
  ],
  "pipelines": [],
  "dashboards": [
    {
      "name": "OnboardingDashboard",
      "metrics": [
        "count",
        "avg.riskScore"
      ],
      "entity": "Customer",
      "layout": "grid"
    },
    {
      "name": "VerificationStatus",
      "metrics": [
        "count"
      ],
      "entity": "Verification",
      "layout": "grid"
    }
  ],
  "sources": [
    {
      "name": "KRSRegistry",
      "type": "rest",
      "url": "https://api-krs.ms.gov.pl/api/krs/OdsychPodstawowe",
      "auth": "none",
      "cache": "1h"
    },
    {
      "name": "CEIDGRegistry",
      "type": "rest",
      "url": "https://dane.biznes.gov.pl/api/ceidg/v2/firma",
      "auth": "apiKey",
      "cache": "1h"
    },
    {
      "name": "VIESVAT",
      "type": "soap",
      "url": "https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl",
      "auth": "none",
      "cache": "24h"
    }
  ],
  "workflows": [
    {
      "name": "CustomerOnboarding",
      "trigger": "CustomerRegistered",
      "steps": [
        "verifyKRS",
        "verifyCEIDG",
        "calculateRisk",
        "approveOrReject"
      ]
    },
    {
      "name": "RiskRecalculation",
      "trigger": "VerificationCompleted",
      "steps": [
        "aggregateScores",
        "updateRiskScore",
        "checkThresholds"
      ]
    }
  ],
  "config": {}
}
```

*Wygenerowano przez Reclapp Studio*