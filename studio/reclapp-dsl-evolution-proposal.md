# Reclapp DSL Evolution - Propozycja Konwersacyjnego Generowania Kontraktów

**Status projektu:** 🔵 Propozycja rozwoju  
**Wersja:** 3.0.0-proposal  
**Organizacja:** Softreck / WronAI

---

## 📊 Problem Statement

Obecny TypeScript DSL (`main.reclapp.ts`) ma następujące wady:

| Problem | Wpływ | Przykład |
|---------|-------|----------|
| **Verbose** | 633 linii na prosty CRM | Każde pole wymaga `{ name: '...', type: '...' }` |
| **Nieczytelny dla nie-programistów** | Klienci nie rozumieją kontraktu | Wymagana wiedza o TS/JS |
| **Trudny do generowania przez LLM** | Hallucinations w strukturze | Brakujące przecinki, nawiasy |
| **Brak walidacji na poziomie DSL** | Błędy runtime | Type jako string może być literówką |

---

## 🎯 Propozycja: 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: Human Conversation (Natural Language)                 │
│  "Potrzebuję CRM z kontaktami, firmami i dealami"              │
└────────────────────────────┬────────────────────────────────────┘
                             │ LLM (Ollama 13B)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: Contract Markdown (contract.md)                       │
│  Czytelny dla człowieka, edytowalny, wersjonowany              │
└────────────────────────────┬────────────────────────────────────┘
                             │ Parser (deterministic)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: Intermediate Representation (contract.ir.json)        │
│  Schema-validated, machine-readable                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ Code Generator
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: Generated Code (target/)                              │
│  TypeScript, Python, Go, Rust, SQL, Docker, K8s                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. 📝 Contract Markdown Format (Layer 2)

### Filozofia

- **Czytaj jak dokumentację** - nie jak kod
- **Pisz jak rozmowę** - naturalne sekcje
- **Waliduj automatycznie** - jasne błędy
- **Wersjonuj w Git** - diff-friendly

### Przykład: `contract.md`

```markdown
# CRM System

> System zarządzania relacjami z klientami

**Wersja:** 2.1.0  
**Autor:** Reclapp Team  
**Licencja:** MIT

---

## Encje

### Contact

Osoba kontaktowa w systemie.

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| email | email | ✓ unique | Adres email |
| firstName | text | ✓ | Imię |
| lastName | text | ✓ | Nazwisko |
| phone | phone | | Numer telefonu |
| company | -> Company | | Powiązana firma |
| tags | text[] | | Tagi |
| score | int 0..100 | | Lead score |
| lastContactedAt | datetime | | Ostatni kontakt |

**Reguły:**
- Automatycznie aktualizuj `lastContactedAt` przy każdej aktywności
- Score obliczany z pipeline `LeadScoring`

---

### Company

Firma w systemie.

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| name | text | ✓ | Nazwa firmy |
| domain | url | unique | Domena www |
| industry | enum(IT, Finance, Healthcare, Other) | | Branża |
| size | enum(1-10, 11-50, 51-200, 200+) | | Wielkość |
| contacts | <- Contact[] | | Pracownicy |

---

### Deal

Szansa sprzedażowa.

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| name | text | ✓ | Nazwa deala |
| company | -> Company | | Firma |
| contact | -> Contact | | Osoba kontaktowa |
| stage | enum(Lead, Qualified, Proposal, Negotiation, Won, Lost) | ✓ | Etap |
| amount | money PLN | ✓ | Wartość |
| probability | int 0..100 | | Prawdopodobieństwo |
| expectedClose | date | | Planowane zamknięcie |

**Reguły:**
- Przy zmianie `stage` na Won/Lost ustaw `closedAt`
- Alert gdy `daysInStage > 14`

---

## Zdarzenia

### DealStageChanged

Gdy deal zmienia etap.

| Pole | Typ |
|------|-----|
| dealId | uuid |
| previousStage | text |
| newStage | text |
| changedBy | uuid |

---

## Pipeline

### LeadScoring

Oblicza score dla kontaktów.

**Wejście:** ContactCreated, Activity.*, Email.*  
**Wyjście:** Contact.score  
**Harmonogram:** co godzinę

**Wagi:**
| Aktywność | Punkty |
|-----------|--------|
| Email otwarty | +5 |
| Email kliknięty | +10 |
| Spotkanie | +20 |
| Telefon | +15 |

---

## Alerty

### Deal Stalled

**Warunek:** `deal.daysInStage > 14 AND deal.stage NOT IN (Won, Lost)`  
**Kanały:** email, slack  
**Priorytet:** średni

### High Value at Risk

**Warunek:** `deal.amount > 50000 AND deal.probability < 30`  
**Kanały:** slack  
**Priorytet:** wysoki

---

## Dashboard

### Sales Pipeline

| Metryka | Opis |
|---------|------|
| totalPipelineValue | Suma wartości otwartych deali |
| dealsByStage | Liczba deali per etap |
| winRate | % wygranych deali |
| avgSalesCycle | Średni czas zamknięcia |

**Odświeżanie:** realtime

---

## API

**Prefix:** `/api/v1`  
**Auth:** JWT

| Resource | Operacje | Auth |
|----------|----------|------|
| contacts | CRUD | required |
| companies | CRUD | required |
| deals | CRUD + changeStage | required |
| metrics | read | required |

---

## Deployment

**Typ:** Docker  
**Baza:** PostgreSQL  
**Frontend:** React + Tailwind  
**Backend:** Node + Express

### Zmienne środowiskowe

| Nazwa | Typ | Wymagane | Domyślnie |
|-------|-----|----------|-----------|
| DATABASE_URL | secret | ✓ | |
| JWT_SECRET | secret | ✓ | |
| API_PORT | int | | 8080 |
```

---

## 2. 🔤 Porównanie DSL: TypeScript vs Alternatywy

### Problem z TypeScript

```typescript
// 15 linii na jedną encję z 3 polami!
const Contact: Entity = {
  name: 'Contact',
  fields: [
    { name: 'email', type: 'String', annotations: { unique: true } },
    { name: 'firstName', type: 'String' },
    { name: 'lastName', type: 'String' },
  ]
};
```

### Alternatywa 1: **YAML** (czytelny, ale bez walidacji)

```yaml
# 6 linii - 60% redukcja
Contact:
  email: email @unique
  firstName: text
  lastName: text
```

❌ Brak type-safety, łatwo o literówki

### Alternatywa 2: **CUE** (walidacja, ale krzywa uczenia)

```cue
Contact: {
  email: string & =~"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
  firstName: string
  lastName: string
}
```

❌ Skomplikowana składnia dla nie-programistów

### Alternatywa 3: **Pkl** (Apple, nowy)

```pkl
class Contact {
  email: String(matches(Regex("^.+@.+$")))
  firstName: String
  lastName: String
}
```

❌ Mało popularny, słaba dokumentacja

### Alternatywa 4: **TOML** (prosty, czytelny)

```toml
[Contact]
email = { type = "email", unique = true }
firstName = "text"
lastName = "text"
```

❌ Brak wsparcia dla złożonych struktur

### ✅ Propozycja: **Reclapp Mini-DSL** (inspiracja: HCL + Prisma)

```prisma
// contract.rcl - 4 linie na encję!

entity Contact {
  email     email  @unique
  firstName text
  lastName  text
  company   -> Company
  tags      text[]
  score     int(0..100) = 50
}

entity Company {
  name      text
  domain    url?  @unique
  industry  enum(IT, Finance, Healthcare)
  contacts  <- Contact[]
}

entity Deal {
  name        text
  company     -> Company?
  stage       DealStage = Lead
  amount      money(PLN)
  probability int(0..100)
}

enum DealStage { Lead, Qualified, Proposal, Negotiation, Won, Lost }

pipeline LeadScoring {
  input: [ContactCreated, Activity.*, Email.*]
  output: Contact.score
  schedule: "0 * * * *"
}

alert "Deal Stalled" {
  when: deal.daysInStage > 14 && deal.stage !in [Won, Lost]
  notify: [email, slack]
  severity: medium
}
```

### Porównanie rozmiaru kodu

| Format | Linie | Redukcja vs TS |
|--------|-------|----------------|
| TypeScript (.reclapp.ts) | 633 | baseline |
| YAML | ~200 | 68% |
| Markdown (.md) | ~150 | 76% |
| **Reclapp Mini (.rcl)** | ~80 | **87%** |

---

## 3. 🤖 Pipeline z Ollama (Docker App)

### Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                    reclapp-studio (Docker)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Chat UI   │───▶│   Ollama    │───▶│   Parser    │        │
│  │  (Gradio)   │    │ (Mistral 7B)│    │  (contract) │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                                      │                │
│         ▼                                      ▼                │
│  ┌─────────────┐                      ┌─────────────┐          │
│  │ contract.md │─────────────────────▶│   .rcl      │          │
│  └─────────────┘                      └─────────────┘          │
│                                               │                 │
│                                               ▼                 │
│                                       ┌─────────────┐          │
│                                       │  Generator  │          │
│                                       │  (target/)  │          │
│                                       └─────────────┘          │
│                                               │                 │
│                                               ▼                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      target/                             │   │
│  │  api/  frontend/  database/  docker/  k8s/             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  # Ollama z modelem
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_models:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    command: >
      sh -c "ollama pull mistral:7b-instruct && 
             ollama pull codellama:7b &&
             ollama serve"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Reclapp Studio (Chat + Generator)
  studio:
    build: ./studio
    ports:
      - "7860:7860"  # Gradio UI
      - "8080:8080"  # API
    volumes:
      - ./projects:/app/projects
      - ./templates:/app/templates
    environment:
      OLLAMA_HOST: http://ollama:11434
      DEFAULT_MODEL: mistral:7b-instruct
      CODE_MODEL: codellama:7b
    depends_on:
      ollama:
        condition: service_healthy

  # Preview server (generated apps)
  preview:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./projects:/app/projects
    ports:
      - "3000:3000"
      - "8081:8081"
    command: >
      sh -c "cd /app/projects/current/target/api && npm install && npm run dev &
             cd /app/projects/current/target/frontend && npm install && npm run dev"

volumes:
  ollama_models:
```

### Studio Application (Python/Gradio)

```python
# studio/app.py

import gradio as gr
import httpx
import json
from pathlib import Path
from typing import Generator
import subprocess

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("DEFAULT_MODEL", "mistral:7b-instruct")

# System prompt dla konwersji rozmowy -> contract.md
SYSTEM_PROMPT = """You are a contract designer for Reclapp, a declarative app platform.

Your job is to convert user requirements into a contract.md file.

Rules:
1. Use ONLY the Reclapp Markdown format
2. Ask clarifying questions if requirements are unclear
3. Suggest best practices (e.g., "Should I add audit logging?")
4. Output ONLY valid contract.md sections

Format reference:
- Entities: markdown tables with | Pole | Typ | Wymagane | Opis |
- Relations: -> for belongs_to, <- for has_many
- Types: text, email, phone, url, int, float, money(CURRENCY), date, datetime, bool, enum(...), uuid
- Modifiers: ? for optional, @unique, @index, [] for arrays
- Ranges: int(0..100), text(1..255)

When user says "generate" or "build", output the complete contract.md."""

class ReclappStudio:
    def __init__(self):
        self.conversation_history = []
        self.current_contract = ""
    
    async def chat(self, message: str, history: list) -> Generator[str, None, None]:
        """Chat with Ollama to design contract"""
        
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        for h in history:
            messages.append({"role": "user", "content": h[0]})
            if h[1]:
                messages.append({"role": "assistant", "content": h[1]})
        
        messages.append({"role": "user", "content": message})
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_HOST}/api/chat",
                json={
                    "model": DEFAULT_MODEL,
                    "messages": messages,
                    "stream": True
                },
                timeout=120.0
            )
            
            full_response = ""
            async for line in response.aiter_lines():
                if line:
                    data = json.loads(line)
                    if "message" in data:
                        chunk = data["message"].get("content", "")
                        full_response += chunk
                        yield full_response
            
            # Check if this is a contract output
            if "# " in full_response and "## Encje" in full_response:
                self.current_contract = full_response
    
    def parse_contract(self, contract_md: str) -> dict:
        """Parse contract.md to intermediate representation"""
        # Simplified parser - in production use proper parser
        ir = {
            "app": {},
            "entities": [],
            "events": [],
            "pipelines": [],
            "alerts": [],
            "dashboards": []
        }
        
        current_section = None
        current_entity = None
        
        for line in contract_md.split("\n"):
            line = line.strip()
            
            # Parse app metadata
            if line.startswith("# "):
                ir["app"]["name"] = line[2:]
            elif line.startswith("**Wersja:**"):
                ir["app"]["version"] = line.split("**")[2].strip()
            
            # Parse sections
            elif line == "## Encje":
                current_section = "entities"
            elif line == "## Zdarzenia":
                current_section = "events"
            elif line == "## Pipeline":
                current_section = "pipelines"
            elif line == "## Alerty":
                current_section = "alerts"
            
            # Parse entities
            elif current_section == "entities" and line.startswith("### "):
                current_entity = {"name": line[4:], "fields": []}
                ir["entities"].append(current_entity)
            
            elif current_entity and line.startswith("|") and "Pole" not in line and "---" not in line:
                parts = [p.strip() for p in line.split("|")[1:-1]]
                if len(parts) >= 3:
                    field = {
                        "name": parts[0],
                        "type": parts[1],
                        "required": "✓" in parts[2],
                        "description": parts[3] if len(parts) > 3 else ""
                    }
                    current_entity["fields"].append(field)
        
        return ir
    
    def generate_code(self, ir: dict, output_dir: str) -> dict:
        """Generate code from intermediate representation"""
        # Use existing reclapp generator
        result = subprocess.run(
            ["./bin/reclapp", "generate", "--ir", json.dumps(ir), "-o", output_dir],
            capture_output=True,
            text=True
        )
        
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr
        }
    
    def save_contract(self, project_name: str) -> str:
        """Save current contract to project"""
        project_dir = Path(f"projects/{project_name}")
        project_dir.mkdir(parents=True, exist_ok=True)
        
        contract_path = project_dir / "contract.md"
        contract_path.write_text(self.current_contract)
        
        return str(contract_path)


# Gradio UI
studio = ReclappStudio()

with gr.Blocks(title="Reclapp Studio", theme=gr.themes.Soft()) as app:
    gr.Markdown("# 🚀 Reclapp Studio")
    gr.Markdown("Opisz swoją aplikację w języku naturalnym, a wygeneruję dla Ciebie kod.")
    
    with gr.Row():
        with gr.Column(scale=1):
            chatbot = gr.Chatbot(
                label="Rozmowa",
                height=500,
                show_copy_button=True
            )
            
            msg = gr.Textbox(
                label="Twoja wiadomość",
                placeholder="Opisz jaką aplikację chcesz stworzyć...",
                lines=2
            )
            
            with gr.Row():
                send_btn = gr.Button("Wyślij", variant="primary")
                clear_btn = gr.Button("Wyczyść")
        
        with gr.Column(scale=1):
            with gr.Tab("Contract"):
                contract_preview = gr.Markdown(label="Podgląd kontraktu")
            
            with gr.Tab("Wygenerowany kod"):
                code_tree = gr.Textbox(label="Struktura plików", lines=20)
            
            with gr.Row():
                project_name = gr.Textbox(label="Nazwa projektu", value="my-app")
                generate_btn = gr.Button("🔨 Generuj kod", variant="primary")
    
    # Event handlers
    async def respond(message, history):
        response = ""
        async for chunk in studio.chat(message, history):
            response = chunk
            yield history + [[message, response]]
    
    msg.submit(respond, [msg, chatbot], [chatbot])
    send_btn.click(respond, [msg, chatbot], [chatbot])
    clear_btn.click(lambda: [], None, [chatbot])
    
    def on_generate(project_name):
        if not studio.current_contract:
            return "Najpierw wygeneruj kontrakt w rozmowie.", ""
        
        # Save contract
        contract_path = studio.save_contract(project_name)
        
        # Parse to IR
        ir = studio.parse_contract(studio.current_contract)
        
        # Generate code
        output_dir = f"projects/{project_name}/target"
        result = studio.generate_code(ir, output_dir)
        
        if result["success"]:
            # Get tree
            tree_result = subprocess.run(
                ["tree", "-I", "node_modules", output_dir],
                capture_output=True,
                text=True
            )
            return studio.current_contract, tree_result.stdout
        else:
            return studio.current_contract, f"Error: {result['error']}"
    
    generate_btn.click(
        on_generate,
        [project_name],
        [contract_preview, code_tree]
    )

if __name__ == "__main__":
    app.launch(server_name="0.0.0.0", server_port=7860)
```

---

## 4. 🔧 Reclapp Mini-DSL Parser

### Gramatyka (PEG.js)

```pegjs
// grammar/reclapp-mini.pegjs

Contract = _ statements:(Statement _)* { 
  return { type: 'Contract', statements: statements.map(s => s[0]) } 
}

Statement 
  = EntityDeclaration
  / EnumDeclaration
  / PipelineDeclaration
  / AlertDeclaration
  / DashboardDeclaration
  / ConfigDeclaration

EntityDeclaration = "entity" _ name:Identifier _ "{" _ fields:FieldList _ "}" {
  return { type: 'Entity', name, fields }
}

FieldList = fields:(Field _)* { return fields.map(f => f[0]) }

Field = name:Identifier _ type:FieldType modifiers:Modifiers? defaultValue:DefaultValue? {
  return { name, type, modifiers: modifiers || [], defaultValue }
}

FieldType 
  = RelationType
  / ArrayType
  / EnumType
  / RangeType
  / MoneyType
  / BaseType

RelationType = direction:("->" / "<-") _ target:Identifier optional:"?"? array:"[]"? {
  return { 
    type: 'relation', 
    direction: direction === '->' ? 'belongsTo' : 'hasMany',
    target,
    optional: !!optional,
    array: !!array
  }
}

ArrayType = base:BaseType "[]" { return { type: 'array', elementType: base } }

EnumType = "enum(" _ values:EnumValues _ ")" { return { type: 'enum', values } }
EnumValues = first:Identifier rest:(_ "," _ Identifier)* { 
  return [first, ...rest.map(r => r[3])] 
}

RangeType = base:("int" / "text") "(" min:Number ".." max:Number ")" {
  return { type: base, min, max }
}

MoneyType = "money(" currency:Identifier ")" { return { type: 'money', currency } }

BaseType = type:("text" / "email" / "phone" / "url" / "int" / "float" / "bool" / "date" / "datetime" / "uuid" / "json") {
  return { type }
}

Modifiers = mods:(_ Modifier)* { return mods.map(m => m[1]) }
Modifier = "@" name:Identifier { return name }

DefaultValue = _ "=" _ value:(String / Number / Identifier) { return value }

EnumDeclaration = "enum" _ name:Identifier _ "{" _ values:EnumValueList _ "}" {
  return { type: 'Enum', name, values }
}
EnumValueList = first:Identifier rest:(_ "," _ Identifier)* { 
  return [first, ...rest.map(r => r[3])] 
}

PipelineDeclaration = "pipeline" _ name:Identifier _ "{" _ props:PipelineProps _ "}" {
  return { type: 'Pipeline', name, ...Object.fromEntries(props) }
}
PipelineProps = props:(PipelineProp _)* { return props.map(p => p[0]) }
PipelineProp 
  = "input:" _ value:ArrayLiteral { return ['input', value] }
  / "output:" _ value:DottedIdentifier { return ['output', value] }
  / "schedule:" _ value:String { return ['schedule', value] }

AlertDeclaration = "alert" _ name:String _ "{" _ props:AlertProps _ "}" {
  return { type: 'Alert', name, ...Object.fromEntries(props) }
}
AlertProps = props:(AlertProp _)* { return props.map(p => p[0]) }
AlertProp
  = "when:" _ value:Expression { return ['condition', value] }
  / "notify:" _ value:ArrayLiteral { return ['targets', value] }
  / "severity:" _ value:Identifier { return ['severity', value] }

// Primitives
Identifier = [a-zA-Z_][a-zA-Z0-9_]* { return text() }
DottedIdentifier = first:Identifier rest:("." Identifier)* { 
  return text() 
}
String = '"' chars:[^"]* '"' { return chars.join('') }
Number = digits:[0-9]+ { return parseInt(digits.join(''), 10) }
ArrayLiteral = "[" _ first:ArrayElement rest:(_ "," _ ArrayElement)* _ "]" {
  return [first, ...rest.map(r => r[3])]
}
ArrayElement = String / DottedIdentifier / Identifier
Expression = [^\n}]+ { return text().trim() }

_ = [ \t\n\r]* // Whitespace
```

### Parser Implementation

```typescript
// parser/mini-parser.ts

import * as peg from 'peggy';
import * as fs from 'fs';
import * as path from 'path';

const grammar = fs.readFileSync(
  path.join(__dirname, '../grammar/reclapp-mini.pegjs'),
  'utf-8'
);

const parser = peg.generate(grammar);

export interface ParseResult {
  success: boolean;
  ast?: any;
  errors?: ParseError[];
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  expected?: string[];
  found?: string;
}

export function parse(input: string): ParseResult {
  try {
    const ast = parser.parse(input);
    return { success: true, ast };
  } catch (e: any) {
    return {
      success: false,
      errors: [{
        message: e.message,
        line: e.location?.start?.line || 0,
        column: e.location?.start?.column || 0,
        expected: e.expected?.map((exp: any) => exp.description),
        found: e.found
      }]
    };
  }
}

export function toIR(ast: any): IntermediateRepresentation {
  const ir: IntermediateRepresentation = {
    entities: [],
    enums: [],
    pipelines: [],
    alerts: [],
    dashboards: [],
    config: {}
  };
  
  for (const statement of ast.statements) {
    switch (statement.type) {
      case 'Entity':
        ir.entities.push(transformEntity(statement));
        break;
      case 'Enum':
        ir.enums.push(statement);
        break;
      case 'Pipeline':
        ir.pipelines.push(statement);
        break;
      case 'Alert':
        ir.alerts.push(statement);
        break;
      case 'Dashboard':
        ir.dashboards.push(statement);
        break;
    }
  }
  
  return ir;
}

function transformEntity(entity: any): IREntity {
  return {
    name: entity.name,
    fields: entity.fields.map((f: any) => ({
      name: f.name,
      type: resolveType(f.type),
      nullable: f.type.optional || f.modifiers.includes('optional'),
      unique: f.modifiers.includes('unique'),
      index: f.modifiers.includes('index'),
      default: f.defaultValue
    }))
  };
}

function resolveType(type: any): string {
  if (typeof type === 'string') return type;
  if (type.type === 'relation') return `relation:${type.direction}:${type.target}`;
  if (type.type === 'array') return `${resolveType(type.elementType)}[]`;
  if (type.type === 'enum') return `enum:${type.values.join(',')}`;
  if (type.type === 'money') return `money:${type.currency}`;
  return type.type;
}
```

---

## 5. 📊 Porównanie Języków do Generowania

| Język | Czytelność | Type Safety | LLM-friendly | Multi-target | Debuggowanie |
|-------|------------|-------------|--------------|--------------|--------------|
| TypeScript | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| YAML | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| JSON Schema | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| CUE | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Pkl | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Dhall | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Reclapp Mini** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Markdown** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### Rekomendacja

**Dual-format approach:**

1. **contract.md** - dla rozmów z klientami, dokumentacji, LLM
2. **contract.rcl** - dla programistów, walidacji, generowania

Oba formaty konwertowalne w obie strony:

```bash
# Markdown -> Mini DSL
reclapp convert contract.md -o contract.rcl

# Mini DSL -> Markdown
reclapp convert contract.rcl -o contract.md

# Either -> Generated code
reclapp generate contract.md -o target/
reclapp generate contract.rcl -o target/
```

---

## 6. 🎯 Rekomendowany Stack Technologiczny

### Dla LLM Generation (Ollama)

| Model | Rozmiar | Użycie | Jakość |
|-------|---------|--------|--------|
| **Mistral 7B Instruct** | 4.1GB | Rozmowa -> contract.md | ⭐⭐⭐⭐ |
| **CodeLlama 7B** | 3.8GB | contract.md -> .rcl | ⭐⭐⭐⭐⭐ |
| **Phi-3 Mini** | 2.3GB | Szybkie walidacje | ⭐⭐⭐ |
| **Llama 3.2 3B** | 2.0GB | Lekki, edge | ⭐⭐⭐ |

### Dla Parser/Generator

| Komponent | Technologia | Powód |
|-----------|-------------|-------|
| Parser | PEG.js / tree-sitter | Deterministyczny, szybki |
| IR Schema | JSON Schema + Zod | Walidacja, TypeScript |
| Generator | EJS Templates | Elastyczność |
| CLI | Commander.js | Standard |

---

## 7. 🚀 Roadmap Implementacji

### Phase 1: Markdown Parser (1 tydzień)
- [ ] Parser contract.md -> IR
- [ ] Walidacja schemy
- [ ] Testy jednostkowe

### Phase 2: Mini-DSL (2 tygodnie)
- [ ] Gramatyka PEG.js
- [ ] Parser .rcl -> IR
- [ ] Konwersja md <-> rcl
- [ ] LSP dla VS Code

### Phase 3: Ollama Studio (2 tygodnie)
- [ ] Docker compose setup
- [ ] Gradio UI
- [ ] Prompty dla Mistral
- [ ] Pipeline chat -> generate

### Phase 4: Multi-target Generator (2 tygodnie)
- [ ] Template system (EJS)
- [ ] Target: TypeScript/Node
- [ ] Target: Python/FastAPI
- [ ] Target: Go/Fiber
- [ ] Target: Rust/Axum

---

## 8. Przykład Workflow

```bash
# 1. Uruchom studio
docker compose up -d

# 2. Otwórz przeglądarkę
open http://localhost:7860

# 3. Rozmawiaj z AI
> "Potrzebuję CRM z kontaktami i firmami"
> "Dodaj też zarządzanie dealami"
> "Każdy deal ma etapy: Lead, Qualified, Won, Lost"
> "Generuj"

# 4. AI generuje contract.md

# 5. Kliknij "Generuj kod"

# 6. Podgląd w http://localhost:3000
```

---

*Dokument wygenerowany: 2025-01-01*  
*Autor: Claude (Anthropic)*  
*Projekt: Reclapp DSL Evolution v3.0*
