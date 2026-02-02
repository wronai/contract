# CRM System

> Express API with TypeScript CRUD endpoints

| Właściwość | Wartość |
|------------|---------|
| Wersja | 1.0.0 |

---

## 📦 Encje

### Contact

```yaml
# entity: Contact
id              : uuid                 # @unique @auto
firstName       : text                 # @required
lastName        : text                 # @required
email           : email                # @unique @required
phone           : phone
company         : text
position        : text
status          : ContactStatus
source          : LeadSource
tags            : text
notes           : text
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Company

```yaml
# entity: Company
id              : uuid                 # @unique @auto
name            : text                 # @unique @required
industry        : text
website         : url
size            : CompanySize
revenue         : money
address         : text
city            : text
country         : text
taxId           : text                 # @unique - NIP
contacts        : <- Contact
deals           : <- Deal
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Deal

```yaml
# entity: Deal
id              : uuid                 # @unique @auto
title           : text                 # @required
value           : money                # @required
stage           : DealStage
probability     : int
expectedClose   : date
contact         : -> Contact           # @required
company         : -> Company
owner           : -> User              # @required
notes           : text
lostReason      : text
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
closedAt        : datetime
```

---

### Activity

```yaml
# entity: Activity
id              : uuid                 # @unique @auto
type            : ActivityType         # @required
subject         : text                 # @required
description     : text
dueDate         : datetime
completed       : boolean
contact         : -> Contact
deal            : -> Deal
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
role            : UserRole
avatar          : url
active          : boolean
createdAt       : datetime             # @auto
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
    "name": "CRM System",
    "version": "1.0.0",
    "description": "Express API with TypeScript CRUD endpoints",
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
          "unique": true
        },
        {
          "name": "firstName",
          "type": "text",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "lastName",
          "type": "text",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "email",
          "type": "email",
          "required": true,
          "auto": false,
          "unique": true,
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
          "name": "company",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
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
          "type": "ContactStatus",
          "required": true,
          "auto": false,
          "defaultValue": "active"
        },
        {
          "name": "source",
          "type": "LeadSource",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "tags",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
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
      "name": "Company",
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
          "unique": true,
          "explicitRequired": true
        },
        {
          "name": "industry",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "website",
          "type": "url",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "size",
          "type": "CompanySize",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "revenue",
          "type": "money",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "address",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
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
          "defaultValue": "PL"
        },
        {
          "name": "taxId",
          "type": "text",
          "required": false,
          "auto": false,
          "description": "NIP",
          "unique": true
        },
        {
          "name": "contacts",
          "type": "<- Contact",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "deals",
          "type": "<- Deal",
          "required": true,
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
      "name": "Deal",
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
          "name": "title",
          "type": "text",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "value",
          "type": "money",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "stage",
          "type": "DealStage",
          "required": true,
          "auto": false,
          "defaultValue": "lead"
        },
        {
          "name": "probability",
          "type": "int",
          "required": true,
          "auto": false,
          "defaultValue": "10"
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
          "type": "-> Contact",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "company",
          "type": "-> Company",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "owner",
          "type": "-> User",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "notes",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "lostReason",
          "type": "text",
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
        },
        {
          "name": "closedAt",
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
      "name": "Activity",
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
          "name": "type",
          "type": "ActivityType",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "subject",
          "type": "text",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "description",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "dueDate",
          "type": "datetime",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "completed",
          "type": "boolean",
          "required": true,
          "auto": false,
          "defaultValue": "false"
        },
        {
          "name": "contact",
          "type": "-> Contact",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "deal",
          "type": "-> Deal",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "owner",
          "type": "-> User",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "auto": true
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
          "unique": true
        },
        {
          "name": "email",
          "type": "email",
          "required": true,
          "auto": false,
          "unique": true,
          "explicitRequired": true
        },
        {
          "name": "name",
          "type": "text",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "role",
          "type": "UserRole",
          "required": true,
          "auto": false,
          "defaultValue": "sales"
        },
        {
          "name": "avatar",
          "type": "url",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "active",
          "type": "boolean",
          "required": true,
          "auto": false,
          "defaultValue": "true"
        },
        {
          "name": "createdAt",
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
