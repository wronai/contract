# B2B Onboarding

> Generated from 1 files

| Właściwość | Wartość |
|------------|---------|
| Wersja | 1.0.0 |

---

## 📦 Encje

### Customer

```yaml
# entity: Customer
id              : uuid                 # @unique @auto
name            : text                 # @required
taxId           : text                 # @unique @required - NIP
regon           : text
krsNumber       : text
email           : email                # @required
phone           : phone
address         : text
city            : text
postalCode      : text
country         : text
status          : CustomerStatus
riskScore       : int
verifiedAt      : datetime
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Verification

```yaml
# entity: Verification
id              : uuid                 # @unique @auto
customer        : -> Customer          # @required
type            : VerificationType     # @required
source          : text                 # @required - KRS, CEIDG, etc
status          : VerificationStatus
result          : json
score           : int
errorMessage    : text
requestedAt     : datetime             # @auto
completedAt     : datetime
```

---

### Document

```yaml
# entity: Document
id              : uuid                 # @unique @auto
customer        : -> Customer          # @required
type            : DocumentType         # @required
filename        : text                 # @required
url             : url                  # @required
status          : DocumentStatus
verifiedAt      : datetime
uploadedAt      : datetime             # @auto
```

---

## 🌐 Konfiguracja API

```yaml
# api:
prefix: /api
```

---

---

## 🤖 Plan AI

```json:contract.ai.json
{
  "frontmatter": {
    "contract": null,
    "generation": {
      "mode": "full-stack",
      "output": "./generated"
    },
    "runtime": {
      "port": 3000,
      "healthCheck": "/health"
    },
    "tech": null
  },
  "app": {
    "name": "B2B Onboarding",
    "version": "1.0.0",
    "description": "Generated from 1 files",
    "domain": "General",
    "type": "Application",
    "users": [],
    "features": []
  },
  "entities": [
    {
      "name": "Customer",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "unique": true
        },
        {
          "name": "name",
          "type": "text",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "taxId",
          "type": "text",
          "required": true,
          "auto": false,
          "description": "NIP",
          "unique": true,
          "explicitRequired": true
        },
        {
          "name": "regon",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "krsNumber",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "email",
          "type": "email",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "phone",
          "type": "phone",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "address",
          "type": "text",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "city",
          "type": "text",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "postalCode",
          "type": "text",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "country",
          "type": "text",
          "required": true,
          "auto": false,
          "defaultValue": "PL"
        },
        {
          "name": "status",
          "type": "CustomerStatus",
          "required": true,
          "auto": false,
          "defaultValue": "pending"
        },
        {
          "name": "riskScore",
          "type": "int",
          "required": true,
          "auto": false,
          "defaultValue": "50"
        },
        {
          "name": "verifiedAt",
          "type": "datetime",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "auto": true
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "auto": true
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "Verification",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "unique": true
        },
        {
          "name": "customer",
          "type": "-> Customer",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "type",
          "type": "VerificationType",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "source",
          "type": "text",
          "required": true,
          "auto": false,
          "description": "KRS, CEIDG, etc",
          "explicitRequired": true
        },
        {
          "name": "status",
          "type": "VerificationStatus",
          "required": true,
          "auto": false,
          "defaultValue": "pending"
        },
        {
          "name": "result",
          "type": "json",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "score",
          "type": "int",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "errorMessage",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "requestedAt",
          "type": "datetime",
          "required": true,
          "auto": true
        },
        {
          "name": "completedAt",
          "type": "datetime",
          "required": false,
          "auto": false,
          "description": null
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "Document",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "unique": true
        },
        {
          "name": "customer",
          "type": "-> Customer",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "type",
          "type": "DocumentType",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "filename",
          "type": "text",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "url",
          "type": "url",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "status",
          "type": "DocumentStatus",
          "required": true,
          "auto": false,
          "defaultValue": "pending"
        },
        {
          "name": "verifiedAt",
          "type": "datetime",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "uploadedAt",
          "type": "datetime",
          "required": true,
          "auto": true
        }
      ],
      "typescript": null,
      "example": null
    }
  ],
  "api": {
    "prefix": "/api",
    "port": 8080
  },
  "rules": {
    "validations": [],
    "assertions": []
  },
  "tech": {
    "backend": {
      "framework": "express",
      "language": "typescript",
      "runtime": "node >= 18",
      "features": [
        "cors"
      ],
      "validation": "zod"
    },
    "frontend": null,
    "database": {
      "type": "json-file"
    }
  },
  "tests": {
    "acceptance": [],
    "api": []
  },
  "raw": "# B2B Onboarding\n\n> B2B customer onboarding with automatic registry verification\n\n| Właściwość | Wartość |\n|------------|---------|\n| Wersja | 2.4.1 |\n| Autor | Reclapp Team |\n| Licencja | MIT |\n\n---\n\n## 📦 Encje\n\n### Customer\n\n```yaml\n# entity: Customer\nid              : uuid                 # @unique @auto\nname            : text                 # @required\ntaxId           : text                 # @unique @required - NIP\nregon           : text?\nkrsNumber       : text?\nemail           : email                # @required\nphone           : phone?\naddress         : text\ncity            : text\npostalCode      : text\ncountry         : text                 # = PL\nstatus          : CustomerStatus       # = pending\nriskScore       : int(0..100)          # = 50\nverifiedAt      : datetime?\ncreatedAt       : datetime             # @auto\nupdatedAt       : datetime             # @auto\n```\n\n---\n\n### Verification\n\n```yaml\n# entity: Verification\nid              : uuid                 # @unique @auto\ncustomer        : -> Customer          # @required\ntype            : VerificationType     # @required\nsource          : text                 # @required - KRS, CEIDG, etc\nstatus          : VerificationStatus   # = pending\nresult          : json?\nscore           : int(0..100)?\nerrorMessage    : text?\nrequestedAt     : datetime             # @auto\ncompletedAt     : datetime?\n```\n\n---\n\n### Document\n\n```yaml\n# entity: Document\nid              : uuid                 # @unique @auto\ncustomer        : -> Customer          # @required\ntype            : DocumentType         # @required\nfilename        : text                 # @required\nurl             : url                  # @required\nstatus          : DocumentStatus       # = pending\nverifiedAt      : datetime?\nuploadedAt      : datetime             # @auto\n```\n\n---\n\n## 🏷️ Typy wyliczeniowe\n\n```yaml\n# enum: CustomerStatus\n- pending        # Oczekujący na weryfikację\n- verifying      # W trakcie weryfikacji\n- verified       # Zweryfikowany\n- rejected       # Odrzucony\n- blocked        # Zablokowany\n```\n\n```yaml\n# enum: VerificationType\n- krs            # Weryfikacja KRS\n- ceidg          # Weryfikacja CEIDG\n- vat            # Weryfikacja VAT EU\n- financial      # Weryfikacja finansowa\n- aml            # Anti Money Laundering\n```\n\n```yaml\n# enum: VerificationStatus\n- pending        # Oczekująca\n- inProgress     # W trakcie\n- completed      # Zakończona\n- failed         # Nieudana\n- expired        # Wygasła\n```\n\n```yaml\n# enum: DocumentType\n- registration   # Dokumenty rejestracyjne\n- financial      # Dokumenty finansowe\n- identity       # Dokumenty tożsamości\n- contract       # Umowy\n- other          # Inne\n```\n\n```yaml\n# enum: DocumentStatus\n- pending        # Oczekujący\n- verified       # Zweryfikowany\n- rejected       # Odrzucony\n```\n\n---\n\n## 📡 Zdarzenia\n\n### CustomerRegistered\n\n```yaml\n# event: CustomerRegistered\ncustomerId      : uuid\ntaxId           : text\nemail           : text\nsource          : text\n```\n\n### VerificationStarted\n\n```yaml\n# event: VerificationStarted\nverificationId  : uuid\ncustomerId      : uuid\ntype            : text\nsource          : text\n```\n\n### VerificationCompleted\n\n```yaml\n# event: VerificationCompleted\nverificationId  : uuid\ncustomerId      : uuid\ntype            : text\nstatus          : text\nscore           : int\n```\n\n### CustomerVerified\n\n```yaml\n# event: CustomerVerified\ncustomerId      : uuid\nriskScore       : int\nverifiedBy      : text\n```\n\n### CustomerRejected\n\n```yaml\n# event: CustomerRejected\ncustomerId      : uuid\nreason          : text\nrejectedBy      : text\n```\n\n### RiskScoreChanged\n\n```yaml\n# event: RiskScoreChanged\ncustomerId      : uuid\npreviousScore   : int\nnewScore        : int\nreason          : text\n```\n\n### DocumentUploaded\n\n```yaml\n# event: DocumentUploaded\ndocumentId      : uuid\ncustomerId      : uuid\ntype            : text\nfilename        : text\n```\n\n---\n\n## 🚨 Alerty\n\n### High Risk Customer\n\n```yaml\n# alert: HighRiskCustomer\nentity: Customer\nwhen: riskScore > 80\nnotify: [email, slack]\nseverity: high\nmessage: \"Klient wysokiego ryzyka: {{name}} (score: {{riskScore}})\"\n```\n\n### Verification Failed\n\n```yaml\n# alert: VerificationFailed\nentity: Verification\nwhen: status = 'failed'\nnotify: [email]\nseverity: medium\nmessage: \"Weryfikacja nieudana dla klienta\"\n```\n\n### Pending Too Long\n\n```yaml\n# alert: PendingTooLong\nentity: Customer\nwhen: status = 'pending' AND createdAt < now() - 7d\nnotify: [email]\nseverity: low\nmessage: \"Klient {{name}} oczekuje na weryfikację ponad 7 dni\"\n```\n\n---\n\n## 🔌 Źródła danych\n\n### KRS Registry\n\n```yaml\n# source: KRSRegistry\ntype: rest\nurl: \"https://api-krs.ms.gov.pl/api/krs/OdsychPodstawowe\"\nauth: none\ncache: \"1h\"\n```\n\n### CEIDG Registry\n\n```yaml\n# source: CEIDGRegistry\ntype: rest\nurl: \"https://dane.biznes.gov.pl/api/ceidg/v2/firma\"\nauth: apiKey\ncache: \"1h\"\n```\n\n### VIES VAT\n\n```yaml\n# source: VIESVAT\ntype: soap\nurl: \"https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl\"\nauth: none\ncache: \"24h\"\n```\n\n---\n\n## ⚙️ Przepływy pracy\n\n### Customer Onboarding\n\n```yaml\n# workflow: CustomerOnboarding\ntrigger: CustomerRegistered\nsteps: [verifyKRS, verifyCEIDG, calculateRisk, approveOrReject]\n```\n\n### Risk Recalculation\n\n```yaml\n# workflow: RiskRecalculation\ntrigger: VerificationCompleted\nsteps: [aggregateScores, updateRiskScore, checkThresholds]\n```\n\n---\n\n## 📊 Panele\n\n### Onboarding Dashboard\n\n```yaml\n# dashboard: OnboardingDashboard\nentity: Customer\nmetrics: [count, avg.riskScore]\nlayout: grid\n```\n\n### Verification Status\n\n```yaml\n# dashboard: VerificationStatus\nentity: Verification\nmetrics: [count]\nlayout: grid\n```\n\n---\n\n## 🌐 Konfiguracja API\n\n```yaml\n# api:\nprefix: /api/v1\nauth: jwt\nrateLimit: 100\n```\n\n---\n\n## 🚀 Deployment\n\n```yaml\n# deployment:\ntype: docker\ndatabase: postgresql\ncache: redis\n```\n\n---\n\n## 🔐 Zmienne środowiskowe\n\n```yaml\n# env:\nDATABASE_URL    : string               # @required\nJWT_SECRET      : secret               # @required\nKRS_API_KEY     : secret?\nCEIDG_API_KEY   : secret               # @required\nSLACK_WEBHOOK   : string?\n```\n\n---\n\n*Wygenerowano przez Reclapp Studio*\n",
  "config": {},
  "events": [],
  "alerts": [],
  "sources": [],
  "pipelines": [],
  "dashboards": [],
  "workflows": []
}
```

*Wygenerowano przez Reclapp Studio*
