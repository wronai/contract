# B2B Onboarding

> B2B customer onboarding with automatic registry verification

| Właściwość | Wartość |
|------------|---------|
| Wersja | 2.0.0 |
| Autor | Reclapp Team |
| Licencja | MIT |

---

## 📦 Encje

### Customer

```yaml
# entity: Customer
id              : uuid                 # @unique @auto
name            : text                 # @required
taxId           : text                 # @unique @required - NIP
regon           : text?
krsNumber       : text?
email           : email                # @required
phone           : phone?
address         : text
city            : text
postalCode      : text
country         : text                 # = PL
status          : CustomerStatus       # = pending
riskScore       : int(0..100)          # = 50
verifiedAt      : datetime?
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
status          : VerificationStatus   # = pending
result          : json?
score           : int(0..100)?
errorMessage    : text?
requestedAt     : datetime             # @auto
completedAt     : datetime?
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
status          : DocumentStatus       # = pending
verifiedAt      : datetime?
uploadedAt      : datetime             # @auto
```

---

## 🏷️ Typy wyliczeniowe

```yaml
# enum: CustomerStatus
- pending        # Oczekujący na weryfikację
- verifying      # W trakcie weryfikacji
- verified       # Zweryfikowany
- rejected       # Odrzucony
- blocked        # Zablokowany
```

```yaml
# enum: VerificationType
- krs            # Weryfikacja KRS
- ceidg          # Weryfikacja CEIDG
- vat            # Weryfikacja VAT EU
- financial      # Weryfikacja finansowa
- aml            # Anti Money Laundering
```

```yaml
# enum: VerificationStatus
- pending        # Oczekująca
- inProgress     # W trakcie
- completed      # Zakończona
- failed         # Nieudana
- expired        # Wygasła
```

```yaml
# enum: DocumentType
- registration   # Dokumenty rejestracyjne
- financial      # Dokumenty finansowe
- identity       # Dokumenty tożsamości
- contract       # Umowy
- other          # Inne
```

```yaml
# enum: DocumentStatus
- pending        # Oczekujący
- verified       # Zweryfikowany
- rejected       # Odrzucony
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

### High Risk Customer

```yaml
# alert: HighRiskCustomer
entity: Customer
when: riskScore > 80
notify: [email, slack]
severity: high
message: "Klient wysokiego ryzyka: {{name}} (score: {{riskScore}})"
```

### Verification Failed

```yaml
# alert: VerificationFailed
entity: Verification
when: status = 'failed'
notify: [email]
severity: medium
message: "Weryfikacja nieudana dla klienta"
```

### Pending Too Long

```yaml
# alert: PendingTooLong
entity: Customer
when: status = 'pending' AND createdAt < now() - 7d
notify: [email]
severity: low
message: "Klient {{name}} oczekuje na weryfikację ponad 7 dni"
```

---

## 🔌 Źródła danych

### KRS Registry

```yaml
# source: KRSRegistry
type: rest
url: "https://api-krs.ms.gov.pl/api/krs/OdsychPodstawowe"
auth: none
cache: "1h"
```

### CEIDG Registry

```yaml
# source: CEIDGRegistry
type: rest
url: "https://dane.biznes.gov.pl/api/ceidg/v2/firma"
auth: apiKey
cache: "1h"
```

### VIES VAT

```yaml
# source: VIESVAT
type: soap
url: "https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl"
auth: none
cache: "24h"
```

---

## ⚙️ Przepływy pracy

### Customer Onboarding

```yaml
# workflow: CustomerOnboarding
trigger: CustomerRegistered
steps: [verifyKRS, verifyCEIDG, calculateRisk, approveOrReject]
```

### Risk Recalculation

```yaml
# workflow: RiskRecalculation
trigger: VerificationCompleted
steps: [aggregateScores, updateRiskScore, checkThresholds]
```

---

## 📊 Panele

### Onboarding Dashboard

```yaml
# dashboard: OnboardingDashboard
entity: Customer
metrics: [count, avg.riskScore]
layout: grid
```

### Verification Status

```yaml
# dashboard: VerificationStatus
entity: Verification
metrics: [count]
layout: grid
```

---

## 🌐 Konfiguracja API

```yaml
# api:
prefix: /api/v1
auth: jwt
rateLimit: 100
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
KRS_API_KEY     : secret?
CEIDG_API_KEY   : secret               # @required
SLACK_WEBHOOK   : string?
```

---

*Wygenerowano przez Reclapp Studio*
