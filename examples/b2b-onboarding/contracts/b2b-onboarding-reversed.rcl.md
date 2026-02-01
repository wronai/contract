# b2b-onboarding

> Generated from 20 files

| Właściwość | Wartość |
|------------|---------|
| Wersja | 1.0.0 |
| Utworzono | 2026-02-01 |

---

## 📦 Encje

### Customer

```yaml
# entity: Customer
id              : text                 # @required
name            : text                 # @required
taxId           : text                 # @required
regon           : text?
krsNumber       : text?
email           : text                 # @required
phone           : text?
address         : text?
city            : text?
postalCode      : text?
country         : text?
status          : any?
riskScore       : any?
verifiedAt      : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Verification

```yaml
# entity: Verification
id              : text                 # @required
customer        : any                  # @required
type            : any                  # @required
source          : text                 # @required
status          : any?
result          : any?
score           : any?
errorMessage    : text?
requestedAt     : text?
completedAt     : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Document

```yaml
# entity: Document
id              : text                 # @required
customer        : any                  # @required
type            : any                  # @required
filename        : text                 # @required
url             : text                 # @required
status          : any?
verifiedAt      : text?
uploadedAt      : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### OnboardingDocument

```yaml
# entity: OnboardingDocument
id              : text                 # @required
customerId      : text                 # @required
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

*Wygenerowano przez Reclapp Studio*