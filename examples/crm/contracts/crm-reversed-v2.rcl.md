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
id              : uuid                 # @unique @auto
firstName       : text
lastName        : text
email           : email                # @unique
phone           : phone
company         : -> Company
position        : text
status          : text                 # - = active
source          : text
tags            : string[] | null
notes           : text
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
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
id              : uuid                 # @unique @auto
name            : text                 # @unique
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
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
domain          : string | null
phone           : phone
ownerId         : uuid
status          : text
```

---

### Deal

```yaml
# entity: Deal
id              : uuid                 # @unique @auto
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
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
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
id              : uuid                 # @unique @auto
type            : text
subject         : text
description     : string | null
dueDate         : string | null
completed       : boolean              # - = false
contact         : string
deal            : string
owner           : string               # - @required
createdAt       : datetime             # @auto
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
    "name": "app",
    "version": "1.0.0",
    "description": "Generated from 26 files",
    "domain": "General",
    "type": "Application",
    "users": [],
    "features": []
  },
  "entities": [
    {
      "name": "Contact",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "unique": true,
          "annotations": {}
        },
        {
          "name": "firstName",
          "type": "text",
          "required": true,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "lastName",
          "type": "text",
          "required": true,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "email",
          "type": "email",
          "required": true,
          "auto": false,
          "unique": true,
          "annotations": {}
        },
        {
          "name": "phone",
          "type": "phone",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "company",
          "type": "-> Company",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "position",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "status",
          "type": "text",
          "required": true,
          "auto": false,
          "description": "= active",
          "annotations": {}
        },
        {
          "name": "source",
          "type": "text",
          "required": true,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "tags",
          "type": "string[] | null",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "notes",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "jobTitle",
          "type": "string | null",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "linkedInUrl",
          "type": "string | null",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "ownerId",
          "type": "uuid",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "customFields",
          "type": "Record<string, any> | null",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "lastContactedAt",
          "type": "datetime",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "Company",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "unique": true,
          "annotations": {}
        },
        {
          "name": "name",
          "type": "text",
          "required": true,
          "auto": false,
          "unique": true,
          "annotations": {}
        },
        {
          "name": "industry",
          "type": "string | null",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "website",
          "type": "url",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "size",
          "type": "string | null",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "revenue",
          "type": "string | null",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "address",
          "type": "Record<string, any> | null",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "city",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "country",
          "type": "text",
          "required": true,
          "auto": false,
          "description": "= PL"
        },
        {
          "name": "taxId",
          "type": "text",
          "required": false,
          "auto": false,
          "description": "@unique - NIP"
        },
        {
          "name": "contacts",
          "type": "string",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "deals",
          "type": "string",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "domain",
          "type": "string | null",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "phone",
          "type": "phone",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "ownerId",
          "type": "uuid",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "status",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "Deal",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "unique": true,
          "annotations": {}
        },
        {
          "name": "title",
          "type": "text",
          "required": true,
          "auto": false,
          "description": "@required"
        },
        {
          "name": "value",
          "type": "string",
          "required": true,
          "auto": false,
          "description": "@required"
        },
        {
          "name": "stage",
          "type": "text",
          "required": true,
          "auto": false,
          "description": "= lead",
          "annotations": {}
        },
        {
          "name": "probability",
          "type": "int",
          "required": true,
          "auto": false,
          "description": "= 10",
          "annotations": {}
        },
        {
          "name": "expectedClose",
          "type": "date",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "contact",
          "type": "string",
          "required": true,
          "auto": false,
          "description": "@required"
        },
        {
          "name": "company",
          "type": "string",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "owner",
          "type": "string",
          "required": true,
          "auto": false,
          "description": "@required"
        },
        {
          "name": "notes",
          "type": "string | null",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "lostReason",
          "type": "string | null",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "closedAt",
          "type": "datetime",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "name",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "companyId",
          "type": "-> Company",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "contactId",
          "type": "-> Contact",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "ownerId",
          "type": "uuid",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "amount",
          "type": "int",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "currency",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "expectedCloseDate",
          "type": "string | null",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "actualCloseDate",
          "type": "string | null",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "customFields",
          "type": "Record<string, any> | null",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "Activity",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "unique": true,
          "annotations": {}
        },
        {
          "name": "type",
          "type": "text",
          "required": true,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "subject",
          "type": "text",
          "required": true,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "description",
          "type": "string | null",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "dueDate",
          "type": "string | null",
          "required": false,
          "auto": false,
          "description": null,
          "annotations": {}
        },
        {
          "name": "completed",
          "type": "boolean",
          "required": true,
          "auto": false,
          "description": "= false"
        },
        {
          "name": "contact",
          "type": "string",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "deal",
          "type": "string",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "owner",
          "type": "string",
          "required": true,
          "auto": false,
          "description": "@required"
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "contactId",
          "type": "-> Contact",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "companyId",
          "type": "-> Company",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "dealId",
          "type": "-> Deal",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "ownerId",
          "type": "uuid",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "completedAt",
          "type": "datetime",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "outcome",
          "type": "string | null",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "unique": false,
          "auto": true,
          "annotations": {}
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "User",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "description": "@unique @auto"
        },
        {
          "name": "email",
          "type": "string",
          "required": true,
          "auto": false,
          "description": "@unique @required"
        },
        {
          "name": "name",
          "type": "text",
          "required": true,
          "auto": false,
          "description": "@required"
        },
        {
          "name": "role",
          "type": "string",
          "required": true,
          "auto": false,
          "description": "= sales"
        },
        {
          "name": "avatar",
          "type": "string",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "active",
          "type": "boolean",
          "required": true,
          "auto": false,
          "description": "= true"
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "description": "@auto"
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "Item",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "unique": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "title",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "description",
          "type": "text",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "status",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "unique": false,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "unique": false,
          "auto": true,
          "annotations": {}
        }
      ]
    },
    {
      "name": "Request",
      "fields": [
        {
          "name": "user",
          "type": "JWTPayload",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        }
      ]
    },
    {
      "name": "JWTPayload",
      "fields": [
        {
          "name": "userId",
          "type": "uuid",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "email",
          "type": "email",
          "required": false,
          "unique": true,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "roles",
          "type": "string[]",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        }
      ]
    },
    {
      "name": "Task",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "unique": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "title",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "description",
          "type": "string | null",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "contactId",
          "type": "-> Contact",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "dealId",
          "type": "-> Deal",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "assignedTo",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "dueDate",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "priority",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "status",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "completedAt",
          "type": "datetime",
          "required": false,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "unique": false,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "unique": false,
          "auto": true,
          "annotations": {}
        }
      ]
    },
    {
      "name": "Pipeline",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "unique": true,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "name",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "stages",
          "type": "Record<string, any>",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "defaultStage",
          "type": "text",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "isDefault",
          "type": "bool",
          "required": true,
          "unique": false,
          "auto": false,
          "annotations": {}
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "unique": false,
          "auto": true,
          "annotations": {}
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "unique": false,
          "auto": true,
          "annotations": {}
        }
      ]
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
  "raw": "# CRM System\n\n> Customer Relationship Management with contacts, deals, and activities\n\n| Właściwość | Wartość |\n|------------|---------|\n| Wersja | 2.4.1 |\n| Autor | Reclapp Team |\n| Licencja | MIT |\n\n---\n\n## 📦 Encje\n\n### Contact\n\n```yaml\n# entity: Contact\nid              : uuid                 # @unique @auto\nfirstName       : text                 # @required\nlastName        : text                 # @required\nemail           : email                # @unique @required\nphone           : phone?\ncompany         : text?\nposition        : text?\nstatus          : ContactStatus        # = active\nsource          : LeadSource?\ntags            : text[]?\nnotes           : text?\ncreatedAt       : datetime             # @auto\nupdatedAt       : datetime             # @auto\n```\n\n---\n\n### Company\n\n```yaml\n# entity: Company\nid              : uuid                 # @unique @auto\nname            : text                 # @required @unique\nindustry        : text?\nwebsite         : url?\nsize            : CompanySize?\nrevenue         : money(PLN)?\naddress         : text?\ncity            : text?\ncountry         : text                 # = PL\ntaxId           : text?                # @unique - NIP\ncontacts        : <- Contact[]\ndeals           : <- Deal[]\ncreatedAt       : datetime             # @auto\nupdatedAt       : datetime             # @auto\n```\n\n---\n\n### Deal\n\n```yaml\n# entity: Deal\nid              : uuid                 # @unique @auto\ntitle           : text                 # @required\nvalue           : money(PLN)           # @required\nstage           : DealStage            # = lead\nprobability     : int(0..100)          # = 10\nexpectedClose   : date?\ncontact         : -> Contact           # @required\ncompany         : -> Company?\nowner           : -> User              # @required\nnotes           : text?\nlostReason      : text?\ncreatedAt       : datetime             # @auto\nupdatedAt       : datetime             # @auto\nclosedAt        : datetime?\n```\n\n---\n\n### Activity\n\n```yaml\n# entity: Activity\nid              : uuid                 # @unique @auto\ntype            : ActivityType         # @required\nsubject         : text                 # @required\ndescription     : text?\ndueDate         : datetime?\ncompleted       : bool                 # = false\ncontact         : -> Contact?\ndeal            : -> Deal?\nowner           : -> User              # @required\ncreatedAt       : datetime             # @auto\n```\n\n---\n\n### User\n\n```yaml\n# entity: User\nid              : uuid                 # @unique @auto\nemail           : email                # @unique @required\nname            : text                 # @required\nrole            : UserRole             # = sales\navatar          : url?\nactive          : bool                 # = true\ncreatedAt       : datetime             # @auto\n```\n\n---\n\n## 🏷️ Typy wyliczeniowe\n\n```yaml\n# enum: ContactStatus\n- active         # Aktywny kontakt\n- inactive       # Nieaktywny\n- lead           # Potencjalny klient\n- customer       # Klient\n- churned        # Utracony\n```\n\n```yaml\n# enum: LeadSource\n- website        # Ze strony www\n- referral       # Polecenie\n- linkedin       # LinkedIn\n- coldcall       # Zimny telefon\n- event          # Wydarzenie\n- other          # Inne\n```\n\n```yaml\n# enum: DealStage\n- lead           # Lead\n- qualified      # Zakwalifikowany\n- proposal       # Propozycja\n- negotiation    # Negocjacje\n- won            # Wygrana\n- lost           # Przegrana\n```\n\n```yaml\n# enum: ActivityType\n- call           # Rozmowa telefoniczna\n- email          # Email\n- meeting        # Spotkanie\n- task           # Zadanie\n- note           # Notatka\n```\n\n```yaml\n# enum: CompanySize\n- micro          # 1-9 pracowników\n- small          # 10-49 pracowników\n- medium         # 50-249 pracowników\n- large          # 250+ pracowników\n```\n\n```yaml\n# enum: UserRole\n- admin          # Administrator\n- manager        # Manager\n- sales          # Handlowiec\n- support        # Wsparcie\n```\n\n---\n\n## 📡 Zdarzenia\n\n### ContactCreated\n\n```yaml\n# event: ContactCreated\ncontactId       : uuid\nemail           : text\nsource          : text\ncreatedBy       : uuid\n```\n\n### DealStageChanged\n\n```yaml\n# event: DealStageChanged\ndealId          : uuid\npreviousStage   : text\nnewStage        : text\nchangedBy       : uuid\nvalue           : float\n```\n\n### DealWon\n\n```yaml\n# event: DealWon\ndealId          : uuid\ncontactId       : uuid\ncompanyId       : uuid?\nvalue           : float\nclosedBy        : uuid\n```\n\n### DealLost\n\n```yaml\n# event: DealLost\ndealId          : uuid\nreason          : text\nlostBy          : uuid\n```\n\n### ActivityCompleted\n\n```yaml\n# event: ActivityCompleted\nactivityId      : uuid\ntype            : text\ncontactId       : uuid?\ndealId          : uuid?\ncompletedBy     : uuid\n```\n\n---\n\n## 🚨 Alerty\n\n### High Value Deal\n\n```yaml\n# alert: HighValueDeal\nentity: Deal\nwhen: value > 100000\nnotify: [email, slack]\nseverity: high\nmessage: \"Nowa transakcja o wysokiej wartości: {{title}}\"\n```\n\n### Stale Deal\n\n```yaml\n# alert: StaleDeal\nentity: Deal\nwhen: updatedAt < now() - 14d AND stage != 'won' AND stage != 'lost'\nnotify: [email]\nseverity: medium\nmessage: \"Transakcja {{title}} nie była aktualizowana od 14 dni\"\n```\n\n### Overdue Activity\n\n```yaml\n# alert: OverdueActivity\nentity: Activity\nwhen: dueDate < now() AND completed = false\nnotify: [email]\nseverity: low\nmessage: \"Zaległe zadanie: {{subject}}\"\n```\n\n---\n\n## 📊 Panele\n\n### Sales Dashboard\n\n```yaml\n# dashboard: SalesDashboard\nentity: Deal\nmetrics: [count, sum.value, avg.probability]\nlayout: grid\n```\n\n### Pipeline View\n\n```yaml\n# dashboard: PipelineView\nentity: Deal\nmetrics: [count, sum.value]\nlayout: kanban\n```\n\n---\n\n## 🔄 Przepływy danych\n\n### Deal Analytics\n\n```yaml\n# pipeline: DealAnalytics\ninput: [Deal.*, DealStageChanged]\noutput: DealMetrics\nschedule: \"0 */6 * * *\"\ntransform: [aggregate, calculate]\n```\n\n---\n\n## 🌐 Konfiguracja API\n\n```yaml\n# api:\nprefix: /api/v1\nauth: jwt\nrateLimit: 1000\ncors: *\n```\n\n---\n\n## 🚀 Deployment\n\n```yaml\n# deployment:\ntype: docker\ndatabase: postgresql\ncache: redis\n```\n\n---\n\n## 🔐 Zmienne środowiskowe\n\n```yaml\n# env:\nDATABASE_URL    : string               # @required\nJWT_SECRET      : secret               # @required\nSMTP_HOST       : string               # = localhost\nSMTP_PORT       : number               # = 587\nSLACK_WEBHOOK   : string?\n```\n\n---\n\n*Wygenerowano przez Reclapp Studio*\n",
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
