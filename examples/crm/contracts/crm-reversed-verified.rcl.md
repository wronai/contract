# app

> Generated from 26 files

| Właściwość | Wartość |
|------------|---------|
| Wersja | 1.0.0 |

---

## 📦 Encje

### Contact

```yaml
# entity: Contact
id              : uuid                 # @unique @auto - @unique @auto
firstName       : text                 # - @required
lastName        : text                 # - @required
email           : email                # @unique - @unique @required
phone           : phone
company         : -> Company
position        : text
status          : text                 # - = active
source          : text
tags            : string[] | null
notes           : text
createdAt       : datetime             # @auto - @auto
updatedAt       : datetime             # @auto - @auto
jobTitle        : string | null
linkedInUrl     : string | null
ownerId         : uuid
customFields    : Record<string, any> | null
lastContactedAt : datetime
```

---

### Company

```yaml
# entity: Company
id              : uuid                 # @unique @auto - @unique @auto
name            : text                 # - @required @unique
industry        : string | null
website         : url
size            : string | null
revenue         : string | null
address         : Record<string, any> | null
city            : text
country         : text                 # - = PL
taxId           : uuid                 # - @unique - NIP
contacts        : string
deals           : string
createdAt       : datetime             # @auto - @auto
updatedAt       : datetime             # @auto - @auto
domain          : string | null
phone           : phone
ownerId         : uuid
status          : text
```

---

### Deal

```yaml
# entity: Deal
id              : uuid                 # @unique @auto - @unique @auto
title           : text                 # - @required
value           : string               # - @required
stage           : text                 # - = lead
probability     : int                  # - = 10
expectedClose   : date
contact         : string               # - @required
company         : string
owner           : string               # - @required
notes           : string | null
lostReason      : string | null
createdAt       : datetime             # @auto - @auto
updatedAt       : datetime             # @auto - @auto
closedAt        : datetime
name            : text
companyId       : -> Company
contactId       : -> Contact
ownerId         : uuid
amount          : int
currency        : text
expectedCloseDate: string | null
actualCloseDate : string | null
customFields    : Record<string, any> | null
```

---

### Activity

```yaml
# entity: Activity
id              : uuid                 # @unique @auto - @unique @auto
type            : text                 # - @required
subject         : text                 # - @required
description     : string | null
dueDate         : string | null
completed       : boolean              # - = false
contact         : string
deal            : string
owner           : string               # - @required
createdAt       : datetime             # @auto - @auto
contactId       : -> Contact
companyId       : -> Company
dealId          : -> Deal
ownerId         : uuid
completedAt     : datetime
outcome         : string | null
updatedAt       : datetime             # @auto
```

---

### User

```yaml
# entity: User
id              : uuid                 # @auto - @unique @auto
email           : string               # - @unique @required
name            : text                 # - @required
role            : string               # - = sales
avatar          : string
active          : boolean              # - = true
createdAt       : datetime             # @auto - @auto
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

### Task

```yaml
# entity: Task
id              : uuid                 # @unique @auto
title           : text
description     : string | null
contactId       : -> Contact
dealId          : -> Deal
assignedTo      : text
dueDate         : text
priority        : text
status          : text
completedAt     : datetime
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Pipeline

```yaml
# entity: Pipeline
id              : uuid                 # @unique @auto
name            : text
stages          : Record<string, any>
defaultStage    : text
isDefault       : bool
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

## 🌐 Konfiguracja API

```yaml
# api:
prefix: /api
```

---

*Wygenerowano przez Reclapp Studio*
