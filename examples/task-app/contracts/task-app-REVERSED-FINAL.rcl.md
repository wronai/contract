# Task Management App

> Generated from 16 files

| Właściwość | Wartość |
|------------|---------|
| Wersja | 1.0.0 |

---

## 📦 Encje

### User

```yaml
# entity: User
id              : uuid                 # @unique @required @auto
email           : email                # @unique @required
name            : text                 # @required
avatar          : text
createdAt       : datetime             # @required @auto
updatedAt       : datetime             # @required @auto
```

---

### Project

```yaml
# entity: Project
id              : uuid                 # @unique @required @auto
name            : text                 # @required
description     : text
owner           : text                 # @required
status          : text
createdAt       : datetime             # @required @auto
updatedAt       : datetime             # @required @auto
```

---

### Task

```yaml
# entity: Task
id              : uuid                 # @unique @required @auto
title           : text                 # @required
description     : text
status          : text
priority        : text
project         : -> Project           # @required
assignee        : text
dueDate         : date
createdAt       : datetime             # @required @auto
updatedAt       : datetime             # @required @auto
```

---

### TaskCreated

```yaml
# entity: TaskCreated
taskId          : uuid
projectId       : uuid
assigneeId      : uuid
```

---

### TaskCompleted

```yaml
# entity: TaskCompleted
taskId          : uuid
completedBy     : uuid
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
    "name": "Task Management App",
    "version": "1.0.0",
    "description": "Generated from 16 files",
    "domain": "General",
    "type": "Application",
    "users": [],
    "features": []
  },
  "entities": [
    {
      "name": "User",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "unique": true,
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
          "name": "name",
          "type": "text",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "avatar",
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
          "explicitRequired": true
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "explicitRequired": true
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "Project",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
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
          "name": "description",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "owner",
          "type": "text",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "status",
          "type": "text",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "explicitRequired": true
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "explicitRequired": true
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "Task",
      "description": null,
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "auto": true,
          "unique": true,
          "explicitRequired": true
        },
        {
          "name": "title",
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
          "name": "status",
          "type": "text",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "priority",
          "type": "text",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "project",
          "type": "-> Project",
          "required": true,
          "auto": false,
          "explicitRequired": true
        },
        {
          "name": "assignee",
          "type": "text",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "dueDate",
          "type": "date",
          "required": false,
          "auto": false,
          "description": null
        },
        {
          "name": "createdAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "explicitRequired": true
        },
        {
          "name": "updatedAt",
          "type": "datetime",
          "required": true,
          "auto": true,
          "explicitRequired": true
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "TaskCreated",
      "description": null,
      "fields": [
        {
          "name": "taskId",
          "type": "uuid",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "projectId",
          "type": "uuid",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "assigneeId",
          "type": "uuid",
          "required": false,
          "auto": false,
          "description": null
        }
      ],
      "typescript": null,
      "example": null
    },
    {
      "name": "TaskCompleted",
      "description": null,
      "fields": [
        {
          "name": "taskId",
          "type": "uuid",
          "required": true,
          "auto": false,
          "description": null
        },
        {
          "name": "completedBy",
          "type": "uuid",
          "required": true,
          "auto": false,
          "description": null
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
  "raw": "# Task Management App\n\n> Simple task management with tasks, projects, and users\n\n| Property | Value |\n|----------|-------|\n| Version | 1.0.0 |\n| Author | Reclapp |\n| License | MIT |\n\n---\n\n## 📦 Entities\n\n### User\n\n```yaml\n# entity: User\nid          : uuid      # @unique @auto\nemail       : email     # @unique @required\nname        : text      # @required\navatar      : url?\ncreatedAt   : datetime  # @auto\nupdatedAt   : datetime  # @auto\n```\n\n### Project\n\n```yaml\n# entity: Project\nid          : uuid      # @unique @auto\nname        : text      # @required\ndescription : text?\nowner       : -> User   # @required\nstatus      : ProjectStatus = active\ncreatedAt   : datetime  # @auto\nupdatedAt   : datetime  # @auto\n```\n\n### Task\n\n```yaml\n# entity: Task\nid          : uuid         # @unique @auto\ntitle       : text         # @required\ndescription : text?\nstatus      : TaskStatus = todo\npriority    : Priority = medium\nproject     : -> Project   # @required\nassignee    : -> User?\ndueDate     : date?\ncreatedAt   : datetime     # @auto\nupdatedAt   : datetime     # @auto\n```\n\n---\n\n## 🏷️ Enums\n\n```yaml\n# enum: ProjectStatus\n- active      # Aktywny\n- archived    # Zarchiwizowany\n- deleted     # Usunięty\n```\n\n```yaml\n# enum: TaskStatus\n- todo        # Do zrobienia\n- inProgress  # W trakcie\n- done        # Zakończone\n- blocked     # Zablokowane\n```\n\n```yaml\n# enum: Priority\n- low         # Niski\n- medium      # Średni\n- high        # Wysoki\n- urgent      # Pilny\n```\n\n---\n\n## 📡 Events\n\n### TaskCreated\n\n```yaml\n# event: TaskCreated\ntaskId      : uuid\nprojectId   : uuid\nassigneeId  : uuid?\n```\n\n### TaskCompleted\n\n```yaml\n# event: TaskCompleted\ntaskId      : uuid\ncompletedBy : uuid\n```\n\n---\n\n## 🚨 Alerts\n\n### Overdue Tasks\n\n```yaml\n# alert: OverdueTasks\nentity: Task\nwhen: status != 'done' AND dueDate < now()\nnotify: [email]\nseverity: medium\nmessage: \"Zadanie {{title}} jest opóźnione\"\n```\n\n---\n\n## 🌐 API Config\n\n```yaml\n# api:\nprefix: /api/v1\nauth: jwt\nrateLimit: 100\n```\n\n---\n\n*Generated by Reclapp*\n",
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
