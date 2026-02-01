# B2B Onboarding

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
status          : CustomerStatus?      #  = pending
riskScore       : int(0..100)?         #  = 50
verifiedAt      : datetime?
createdAt       : datetime             # @required @auto
updatedAt       : datetime             # @required @auto
```

### Verification

```yaml
# entity: Verification
id              : uuid                 # @unique @required @auto
customer        : -> Customer          # @required
type            : VerificationType     # @required
source          : text                 # @required
status          : VerificationStatus?  #  = pending
result          : json?
score           : int(0..100)?
errorMessage    : text?
requestedAt     : datetime?            # @auto
completedAt     : datetime?
createdAt       : datetime             # @required
updatedAt       : datetime             # @required
```

### Document

```yaml
# entity: Document
id              : uuid                 # @unique @required @auto
customer        : -> Customer          # @required
type            : DocumentType         # @required
filename        : text                 # @required
url             : url                  # @required
status          : DocumentStatus?      #  = pending
verifiedAt      : datetime?
uploadedAt      : datetime?            # @auto
createdAt       : datetime             # @required
updatedAt       : datetime             # @required
```

### OnboardingDocument

```yaml
# entity: OnboardingDocument
id              : uuid                 # @required
customerId      : -> Customer          # @required
documentType    : text                 # @required
fileName        : text                 # @required
fileUrl         : text?
status          : text                 # @required
reviewedBy      : text?
reviewedAt      : datetime?
notes           : text?
createdAt       : datetime             # @required
updatedAt       : datetime?
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

## 🌐 Konfiguracja API

```yaml
# api:
prefix: undefined
auth: undefined
```

---

*Wygenerowano przez Reclapp Studio*