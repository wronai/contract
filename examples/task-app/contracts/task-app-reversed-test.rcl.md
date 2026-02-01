# app

> Generated from 16 files

| Właściwość | Wartość |
|------------|---------|
| Wersja | 1.0.0 |

---

## 📦 Encje

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

### Task

```yaml
# entity: Task
id              : uuid                 # @unique @auto
title           : text
description     : text
status          : json
priority        : json
project         : -> Project
assignee        : json
dueDate         : text
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Project

```yaml
# entity: Project
id              : uuid                 # @unique @auto
name            : text
description     : text
owner           : json
status          : json
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### User

```yaml
# entity: User
id              : uuid                 # @unique @auto
email           : email                # @unique
name            : text
avatar          : text
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
