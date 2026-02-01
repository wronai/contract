# saas-starter

> Generated from 27 files

| Właściwość | Wartość |
|------------|---------|
| Wersja | 1.0.0 |
| Utworzono | 2026-02-01 |

---

## 📦 Encje

### Request

```yaml
# entity: Request
user            : jwtpayload?
```

### JWTPayload

```yaml
# entity: JWTPayload
userId          : text                 # @required
email           : text?
roles           : string[]?
```

### Invoice

```yaml
# entity: Invoice
id              : text                 # @required
organizationId  : text                 # @required
stripeInvoiceId : text                 # @required
subscriptionId  : text?
amount          : int                  # @required
currency        : text                 # @required
status          : text                 # @required
paidAt          : text?
dueDate         : text                 # @required
invoiceUrl      : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Subscription

```yaml
# entity: Subscription
id              : text                 # @required
organizationId  : text                 # @required
stripeSubscriptionId: text                 # @required
plan            : text                 # @required
status          : text                 # @required
currentPeriodStart: text                 # @required
currentPeriodEnd: text                 # @required
cancelAtPeriodEnd: bool                 # @required
quantity        : int                  # @required
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### AuditLog

```yaml
# entity: AuditLog
id              : text                 # @required
organizationId  : text                 # @required
userId          : text                 # @required
action          : text                 # @required
resource        : text                 # @required
resourceId      : text?
metadata        : record<string, any>?
ipAddress       : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### User

```yaml
# entity: User
id              : text                 # @required
email           : text                 # @required
name            : text                 # @required
role            : text                 # @required
organizationId  : text                 # @required
avatarUrl       : text?
lastLoginAt     : text?
isActive        : bool                 # @required
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Organization

```yaml
# entity: Organization
id              : text                 # @required
name            : text                 # @required
slug            : text                 # @required
plan            : text                 # @required
status          : text                 # @required
ownerId         : text                 # @required
settings        : record<string, any>?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Usage

```yaml
# entity: Usage
id              : text                 # @required
organizationId  : text                 # @required
metric          : text                 # @required
value           : int                  # @required
period          : text                 # @required
recordedAt      : text                 # @required
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

---

*Wygenerowano przez Reclapp Studio*