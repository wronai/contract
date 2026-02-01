# api

> Generated from 16 files

| Właściwość | Wartość |
|------------|---------|
| Wersja | 1.0.0 |

---

## 📦 Encje

### User

```yaml
# entity: User
id              : uuid                 # @unique @auto - @unique @auto
email           : email                # @unique - @unique @required
name            : text                 # - @required
avatar          : text
createdAt       : datetime             # @auto - @auto
updatedAt       : datetime             # @auto - @auto
```

---

### Project

```yaml
# entity: Project
id              : uuid                 # @unique @auto - @unique @auto
name            : text                 # - @required
description     : text
owner           : json                 # - @required
status          : json
createdAt       : datetime             # @auto - @auto
updatedAt       : datetime             # @auto - @auto
```

---

### Task

```yaml
# entity: Task
id              : uuid                 # @unique @auto - @unique @auto
title           : text                 # - @required
description     : text
status          : json
priority        : json
project         : -> Project           # - @required
assignee        : json
dueDate         : text
createdAt       : datetime             # @auto - @auto
updatedAt       : datetime             # @auto - @auto
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

### Overdue Tasks

```yaml
# entity: Overdue Tasks
entity          : string
when            : string
notify          : string
severity        : string
message         : string
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

## 🌐 Konfiguracja API

```yaml
# api:
prefix: /api
```

---

*Wygenerowano przez Reclapp Studio*
