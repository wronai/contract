# reclapp-contracts

Data models, parsers, and validation logic for Reclapp Contract AI.

## Features

- **Pydantic Models**: Strongly-typed definitions for entities, events, APIs, and workflows.
- **Multi-layer Architecture**:
  - **Layer 1: Definition** - Data structures and API resources.
  - **Layer 2: Generation** - LLM instructions and tech stack patterns.
  - **Layer 3: Validation** - Assertions and quality gates.
- **Parsers**: Tools for converting between different contract formats (JSON, YAML, Markdown).
- **Validation**: Built-in rules for contract consistency and correctness.

## Installation

```bash
pip install reclapp-contracts
```

## Usage

```python
from reclapp_contracts import ContractAI

# Load from JSON
contract = ContractAI.model_validate_json(json_str)

# Access definition
print(f"App: {contract.definition.app.name}")
for entity in contract.definition.entities:
    print(f"Entity: {entity.name}")
```
