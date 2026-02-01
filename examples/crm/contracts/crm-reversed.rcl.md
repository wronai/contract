# crm

> Generated from 42 files

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

### Contact

```yaml
# entity: Contact
id              : text                 # @required
email           : text?
firstName       : text                 # @required
lastName        : text                 # @required
phone           : text?
company         : any?
jobTitle        : text?
linkedInUrl     : text?
source          : text?
status          : text?
ownerId         : text?
tags            : any | null?
customFields    : record<string, any>?
score           : any?
lastContactedAt : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Deal

```yaml
# entity: Deal
id              : text                 # @required
name            : text                 # @required
company         : any?
contact         : any?
ownerId         : text                 # @required
stage           : any?
amount          : any?
currency        : text?
probability     : any?
expectedCloseDate: text?
actualCloseDate : text?
lostReason      : text?
notes           : text?
customFields    : record<string, any>?
daysInStage     : int?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Meeting

```yaml
# entity: Meeting
id              : text                 # @required
title           : text                 # @required
description     : text?
contacts        : any?
deal            : any?
ownerId         : text                 # @required
startTime       : text                 # @required
endTime         : text                 # @required
location        : text?
meetingUrl      : text?
status          : any?
outcome         : text?
notes           : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Company

```yaml
# entity: Company
id              : text                 # @required
name            : text                 # @required
domain          : text?
industry        : any?
size            : any?
revenue         : int?
website         : text?
phone           : text?
address         : record<string, any>?
ownerId         : text?
status          : text?
contacts        : any?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Activity

```yaml
# entity: Activity
id              : text                 # @required
type            : any                  # @required
subject         : text                 # @required
description     : text?
contact         : any?
company         : any?
deal            : any?
ownerId         : text                 # @required
dueDate         : text?
completedAt     : text?
outcome         : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Email

```yaml
# entity: Email
id              : text                 # @required
contact         : any                  # @required
deal            : any?
subject         : text                 # @required
body            : text?
direction       : any?
status          : any?
openedAt        : text?
clickedAt       : text?
repliedAt       : text?
sentAt          : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Task

```yaml
# entity: Task
id              : text                 # @required
title           : text                 # @required
description     : text?
contact         : any?
deal            : any?
assignedTo      : text                 # @required
dueDate         : text                 # @required
priority        : any?
status          : any?
completedAt     : text?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Note

```yaml
# entity: Note
id              : text                 # @required
content         : text                 # @required
contact         : any?
company         : any?
deal            : any?
authorId        : text                 # @required
isPinned        : bool?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### User

```yaml
# entity: User
id              : text                 # @required
email           : text                 # @required
name            : text                 # @required
role            : any?
avatar          : text?
active          : bool?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Pipeline

```yaml
# entity: Pipeline
id              : text                 # @required
name            : text                 # @required
stages          : record<string, any>  # @required
defaultStage    : text?
isDefault       : bool?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

### Team

```yaml
# entity: Team
id              : text                 # @required
name            : text                 # @required
managerId       : text?
memberIds       : any?
quota           : int?
createdAt       : text                 # @required
updatedAt       : text                 # @required
```

---

*Wygenerowano przez Reclapp Studio*