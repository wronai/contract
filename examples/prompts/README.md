# Reclapp Prompt Examples

Ready-to-use prompts for generating complete working services.

## Usage

### From prompt file:
```bash
# Read prompt and run full lifecycle
reclapp --prompt "$(cat examples/prompts/01-notes-app.txt)"

# Or with shell script
./bin/reclapp-full-lifecycle.sh --prompt "$(cat examples/prompts/02-todo-app.txt)"

# Specify output directory
reclapp --prompt "$(cat examples/prompts/03-contacts-crm.txt)" -o ./my-crm
```

### Quick one-liner:
```bash
# Generate notes app
reclapp --prompt "Create a notes app"

# Generate todo app  
reclapp --prompt "Create a todo app with tasks and categories"

# Generate CRM
reclapp --prompt "Create a CRM with contacts and companies"
```

## Available Prompts

| File | Description | Entities |
|------|-------------|----------|
| `01-notes-app.txt` | Simple notes | Note |
| `02-todo-app.txt` | Task management | Task, Category |
| `03-contacts-crm.txt` | CRM system | Contact, Company, Deal |
| `04-inventory.txt` | Stock management | Product, Warehouse |
| `05-booking.txt` | Reservations | Resource, Booking |
| `06-blog.txt` | Blog platform | Post, Comment |
| `07-hr-system.txt` | Employee management | Employee, Department |
| `08-invoices.txt` | Invoice system | Invoice, InvoiceItem |
| `09-support-tickets.txt` | Support tickets | Ticket, TicketMessage |
| `10-events.txt` | Event management | Event, Registration |

## What Gets Generated

Each prompt generates:
- ✅ Contract AI (3-layer specification)
- ✅ Express.js API with TypeScript
- ✅ CRUD endpoints for all entities
- ✅ Health check endpoint (`/health`)
- ✅ In-memory storage
- ✅ Input validation

## Full Lifecycle

The full lifecycle includes:
1. **Generate Contract** - LLM creates 3-layer specification
2. **Generate Code** - LLM generates TypeScript/Express code
3. **Validate** - 8-stage validation pipeline
4. **Install** - npm install dependencies
5. **Start Service** - Run on specified port
6. **Test** - Health check + CRUD endpoint tests
7. **Report** - Success/failure summary

## Example Output

```
$ reclapp --prompt "$(cat examples/prompts/01-notes-app.txt)"

╭─────── 🚀 Starting ────────╮
│ RECLAPP FULL LIFECYCLE     │
│ Prompt: Create a simple... │
│ Output: ./generated        │
│ Port: 3000                 │
╰────────────────────────────╯

✅ Contract generated
✅ 8/8 validation stages PASSED
✅ Dependencies installed
✅ Service is healthy
✅ Tests: 2/2 passed
✅ FULL LIFECYCLE COMPLETED SUCCESSFULLY
```

## Creating Custom Prompts

Create your own `.txt` file with a description of your application:

```txt
Create a [type of application] with:
- [Entity 1] with [fields]
- [Entity 2] with [fields]
- [Feature 1]
- [Feature 2]
- CRUD API with Express.js and TypeScript
```

Then run:
```bash
reclapp --prompt "$(cat my-custom-prompt.txt)"
```
