# b2-b-onboarding-api

> Generated from 19 files

| Właściwość | Wartość |
|------------|---------|
| Wersja | 2.0.0 |
| Utworzono | 2026-02-01 |

---

## 📦 Encje

### Customer

```yaml
# entity: Customer
id              : uuid                 # @required
name            : text                 # @required
taxId           : uuid                 # @required
regon           : text?
krsNumber       : text?
email           : email                # @required
phone           : phone?
address         : text?
city            : text?
postalCode      : text?
country         : text?
status          : json?
riskScore       : json?
verifiedAt      : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Verification

```yaml
# entity: Verification
id              : uuid                 # @required
customer        : -> customer          # @required
type            : json                 # @required
source          : text                 # @required
status          : json?
result          : json?
score           : json?
errorMessage    : text?
requestedAt     : text?
completedAt     : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Document

```yaml
# entity: Document
id              : uuid                 # @required
customer        : -> customer          # @required
type            : json                 # @required
filename        : text                 # @required
url             : url                  # @required
status          : json?
verifiedAt      : text?
uploadedAt      : text?
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

## 🌐 Konfiguracja API

```yaml
# api:
prefix: /api
auth: undefined
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
          "type": "String",
          "required": false,
          "unique": true,
          "auto": true
        },
        {
          "name": "name",
          "type": "String",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "taxId",
          "type": "String",
          "required": true,
          "unique": true,
          "auto": false
        },
        {
          "name": "regon",
          "type": "String",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "krsNumber",
          "type": "String",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "email",
          "type": "String",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "phone",
          "type": "String",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "address",
          "type": "String",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "city",
          "type": "String",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "postalCode",
          "type": "String",
          "required": false,
          "unique": false,
          "auto": false
        },
        {
          "name": "country",
          "type": "String",
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
          "required": false,
          "unique": false,
          "auto": true
        },
        {
          "name": "updatedAt",
          "type": "DateTime",
          "required": false,
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
          "type": "String",
          "required": false,
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
          "type": "String",
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
          "type": "Json",
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
          "type": "String",
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
        }
      ]
    },
    {
      "name": "Document",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "required": false,
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
          "type": "String",
          "required": true,
          "unique": false,
          "auto": false
        },
        {
          "name": "url",
          "type": "String",
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