#!/usr/bin/env python3
"""
API Response - Formatowanie odpowiedzi API

Pokazuje jak pięknie wyświetlić dane JSON/dict
z API bez pisania własnego formatowania.

Run: python examples/api_response.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd

# Symulowana odpowiedź z API
api_response = {
    "status": "success",
    "data": {
        "user": {
            "id": 123,
            "name": "Jan Kowalski",
            "email": "jan@example.com",
            "roles": ["admin", "user"]
        },
        "metadata": {
            "request_id": "abc-123-xyz",
            "timestamp": "2024-01-08T10:30:00Z"
        }
    }
}

# ============================================================================
# SPOSÓB 1: Debug output (szybkie sprawdzenie)
# ============================================================================

clickmd.md("# 📡 Formatowanie odpowiedzi API\n")
clickmd.md("## 1. Debug output\n")

clickmd.debug(api_response, name="API Response")

# ============================================================================
# SPOSÓB 2: Jako JSON z syntax highlighting
# ============================================================================

clickmd.md("\n## 2. JSON z kolorowaniem\n")

import json
json_str = json.dumps(api_response, indent=2)

clickmd.md(f"""
```json
{json_str}
```
""")

# ============================================================================
# SPOSÓB 3: Jako tabela (dla list)
# ============================================================================

clickmd.md("\n## 3. Lista użytkowników jako tabela\n")

users = [
    {"id": 1, "name": "Anna", "role": "admin"},
    {"id": 2, "name": "Bartek", "role": "user"},
    {"id": 3, "name": "Celina", "role": "user"},
]

clickmd.table(
    headers=["ID", "Imię", "Rola"],
    rows=[[str(u["id"]), u["name"], u["role"]] for u in users]
)

# ============================================================================
# SPOSÓB 4: Tree view (dla zagnieżdżonych danych)
# ============================================================================

clickmd.md("\n## 4. Tree view dla struktury\n")

clickmd.tree(api_response, name="response")

# ============================================================================
# SPOSÓB 5: Panel z podsumowaniem
# ============================================================================

clickmd.md("\n## 5. Panel z podsumowaniem\n")

user = api_response["data"]["user"]
clickmd.panel(
    f"Użytkownik: {user['name']}\n"
    f"Email: {user['email']}\n"
    f"Role: {', '.join(user['roles'])}",
    title="👤 Profil użytkownika",
    style="info"
)

# ============================================================================
# PRAKTYCZNY PRZYKŁAD: Obsługa błędów API
# ============================================================================

clickmd.md("\n## 6. Obsługa błędów API\n")

def handle_api_error(response):
    """Przykład obsługi błędu API z clickmd."""
    if response.get("status") == "error":
        clickmd.error(f"API Error: {response.get('message', 'Unknown error')}")
        if "details" in response:
            clickmd.md("```json\n" + json.dumps(response["details"], indent=2) + "\n```")
        return False
    
    clickmd.success("API request successful")
    return True

# Symulacja błędu
error_response = {
    "status": "error",
    "message": "Rate limit exceeded",
    "details": {
        "limit": 100,
        "current": 150,
        "reset_at": "2024-01-08T11:00:00Z"
    }
}

handle_api_error(error_response)

# Symulacja sukcesu
success_response = {"status": "success", "data": {"id": 1}}
handle_api_error(success_response)
