# Full Lifecycle Examples

10 przykładowych kontraktów do testowania pełnego cyklu życia Reclapp.

## Użycie

### Jedna komenda - pełny cykl

```bash
# Z pliku kontraktu
./bin/reclapp-full-lifecycle examples/full-lifecycle/01-simple-notes.ts

# Z promptu
./bin/reclapp-full-lifecycle --prompt "Create a notes app"

# Z opcjami
./bin/reclapp-full-lifecycle \
  examples/full-lifecycle/02-todo-app.ts \
  --port 4000 \
  --max-iterations 5 \
  --keep-running \
  --verbose
```

### Co robi komenda?

1. **Generuje kod** z kontraktu lub promptu
2. **Instaluje zależności** (npm install)
3. **Uruchamia serwis** (ts-node src/server.ts)
4. **Czeka na health check** (GET /health)
5. **Testuje endpointy** (CRUD dla każdej encji)
6. **Jeśli testy nie przechodzą** → generuje poprawki i powtarza
7. **Raportuje wynik** końcowy

## Przykłady

| # | Nazwa | Encje | Port | Opis |
|---|-------|-------|------|------|
| 01 | Simple Notes | Note | 3001 | Minimalistyczne notatki |
| 02 | Todo App | Task, Category | 3002 | Zarządzanie zadaniami |
| 03 | Inventory | Product, Warehouse | 3003 | Magazyn |
| 04 | Booking | Resource, Booking | 3004 | Rezerwacje |
| 05 | HR System | Employee, Department | 3005 | Zarządzanie pracownikami |
| 06 | Blog | Post, Comment | 3006 | Platforma blogowa |
| 07 | Invoices | Invoice, InvoiceItem | 3007 | Fakturowanie |
| 08 | Support | Ticket, TicketMessage | 3008 | Obsługa klienta |
| 09 | Events | Event, Registration | 3009 | Wydarzenia |
| 10 | Projects | Project, Milestone | 3010 | Śledzenie projektów |

## Uruchomienie wszystkich przykładów

```bash
# Test wszystkich przykładów sekwencyjnie
for i in $(seq -w 1 10); do
  echo "=== Testing example $i ==="
  ./bin/reclapp-full-lifecycle examples/full-lifecycle/${i}-*.ts -o ./test-$i
done
```

## Opcje CLI

| Opcja | Opis | Domyślnie |
|-------|------|-----------|
| `-p, --prompt` | Generuj z promptu | - |
| `-o, --output` | Katalog wyjściowy | ./generated |
| `--port` | Port serwisu | 3000 |
| `--max-iterations` | Max prób naprawy | 3 |
| `--keep-running` | Zostaw serwis włączony | false |
| `-v, --verbose` | Szczegółowe logi | false |

## Przykładowy output

```
╔══════════════════════════════════════════════════════════════╗
║           RECLAPP FULL LIFECYCLE RUNNER v2.3.0               ║
╚══════════════════════════════════════════════════════════════╝

📋 Iteration 1/3
📋 Generating code...
✅ Code generated successfully
📋 Installing dependencies...
📋 Starting service on port 3001...
📋 Waiting for health check...
✅ Service is healthy
📋 Running endpoint tests...
✅ Tests: 6/6 passed

══════════════════════════════════════════════════════════════
✅ FULL LIFECYCLE COMPLETED SUCCESSFULLY
══════════════════════════════════════════════════════════════
   Iterations: 1
   Files: 15
   Tests: 6/6 passed
   Service: http://localhost:3001
```

## Wymagania

- Node.js >= 18.0.0
- Ollama z llama3 (lub innym modelem)
- Python 3.10+ (dla pycontracts)

---

**Reclapp 2.3.0 | Full Lifecycle Examples**
