# Pydantic Contract Examples

Przykłady kontraktów w formacie Pydantic dla Reclapp 2.3.

## Użycie

```python
from examples.pydantic_contracts import NotesContract, TodoContract, CRMContract

# Utwórz kontrakt
contract = NotesContract.create()

# Eksportuj jako JSON
print(contract.model_dump_json(indent=2))

# Eksportuj jako dict
data = contract.model_dump()
```

## Przykłady

| Plik | Opis | Encje |
|------|------|-------|
| `01_notes.py` | Notatki | Note |
| `02_todo.py` | Zadania | Task, Category |
| `03_crm.py` | CRM | Contact, Company, Deal |
| `04_inventory.py` | Magazyn | Product, Warehouse |
| `05_booking.py` | Rezerwacje | Resource, Booking |

## Testowanie

```bash
# Test wszystkich kontraktów
python3 -m pytest examples/pydantic-contracts/test_contracts.py -v

# Lub bezpośrednio
python3 examples/pydantic-contracts/01_notes.py
```

## Generowanie kodu z Pydantic

```bash
# Eksportuj do JSON Schema
python3 -c "
from examples.pydantic_contracts import NotesContract
import json
contract = NotesContract.create()
print(json.dumps(contract.model_dump(), indent=2))
" > /tmp/notes-contract.json

# Użyj w full lifecycle
./bin/reclapp-full-lifecycle.sh /tmp/notes-contract.json
```
