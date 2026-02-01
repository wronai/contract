#!/usr/bin/env python3
"""
Reclapp Schema Generator
Generates JSON Schemas for Reclapp Contract AI specification.
"""

import json
import argparse
from pathlib import Path
from typing import Any, Dict, Type
from pydantic import BaseModel

# Add paths to sys.path to ensure we can import reclapp_contracts
import sys
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root / "reclapp-contracts"))

from reclapp_contracts.models import ContractAI, DefinitionLayer, GenerationLayer, ValidationLayer

def generate_json_schema(model: Type[BaseModel]) -> Dict[str, Any]:
    return model.model_json_schema()

def main():
    parser = argparse.ArgumentParser(description="Generate Reclapp Contract AI JSON Schemas")
    parser.add_argument("--output", "-o", type=Path, default=Path("contracts/json"), help="Output directory")
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)

    models = {
        "contract-ai": ContractAI,
        "definition": DefinitionLayer,
        "generation": GenerationLayer,
        "validation": ValidationLayer,
    }

    print(f"Generating schemas to {args.output}...")
    for name, model in models.items():
        schema = generate_json_schema(model)
        output_path = args.output / f"{name}.json"
        output_path.write_text(json.dumps(schema, indent=2))
        print(f"  ✓ {output_path}")

    print("Done!")

if __name__ == "__main__":
    main()
