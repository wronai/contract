# 📡 Formatowanie odpowiedzi API

## 1. Debug output

🔍 API Response
```
{
  'status': 'success',
  'data': {
    'user': {
      'id':       ...,
      'name':       ...,
      'email':       ...,
      'roles':       ...,
    },
    'metadata': {
      'request_id':       ...,
      'timestamp':       ...,
    },
  },
}
```

## 2. JSON z kolorowaniem



```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 123,
      "name": "Jan Kowalski",
      "email": "jan@example.com",
      "roles": [
        "admin",
        "user"
      ]
    },
    "metadata": {
      "request_id": "abc-123-xyz",
      "timestamp": "2024-01-08T10: 30: 00Z"
    }
  }
}
```



## 3. Lista użytkowników jako tabela

```
┌────┬────────┬───────┐
│ID  │Imię    │Rola   │
├────┼────────┼───────┤
│1   │Anna    │admin  │
│2   │Bartek  │user   │
│3   │Celina  │user   │
└────┴────────┴───────┘
```

## 4. Tree view dla struktury

```
response
├── status: success
└── data/
    ├── user/
    │   ├── id: 123
    │   ├── name: Jan Kowalski
    │   ├── email: jan@example.com
    │   └── roles: ['admin', 'user']
    └── metadata/
        ├── request_id: abc-123-xyz
        └── timestamp: 2024-01-08T10:30:00Z
```

## 5. Panel z podsumowaniem

```
┌── 👤 Profil użytkownika ──────────────────────────────────────────────────┐
│ Użytkownik: Jan Kowalski                                                 │
│ Email: jan@example.com                                                   │
│ Role: admin, user                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

## 6. Obsługa błędów API

🛑 API Error: Rate limit exceeded

```json
{
  "limit": 100,
  "current": 150,
  "reset_at": "2024-01-08T11: 00: 00Z"
}
```

✅ API request successful
