"""Generate JSON Schema files from Pydantic models.

Usage:
  python contracts/generate_json.py

Outputs:
  contracts/json/*.json

The generator scans Python files in the same directory as this script
(excluding itself) and exports JSON Schema for each Pydantic BaseModel.
"""

from __future__ import annotations

import importlib.util
import inspect
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple, Type

from pydantic import BaseModel


def _load_module_from_path(path: Path) -> Any:
    spec = importlib.util.spec_from_file_location(path.stem, str(path))
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load module spec: {path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _collect_models(module: Any) -> List[Type[BaseModel]]:
    models: List[Type[BaseModel]] = []

    for _, obj in inspect.getmembers(module, inspect.isclass):
        try:
            if obj is BaseModel:
                continue
            if issubclass(obj, BaseModel):
                # Only include models defined in this module
                if getattr(obj, "__module__", None) == getattr(module, "__name__", None):
                    models.append(obj)
        except TypeError:
            continue

    # Deterministic ordering
    models.sort(key=lambda m: m.__name__)
    return models


def _schema_filename(model: Type[BaseModel]) -> str:
    return f"{model.__name__}.json"


def generate_json_schemas(base_dir: Path, out_dir: Path) -> List[Tuple[Type[BaseModel], Path]]:
    out_dir.mkdir(parents=True, exist_ok=True)

    py_files = sorted(
        [
            p
            for p in base_dir.glob("*.py")
            if p.name not in {"generate_json.py", "__init__.py"} and not p.name.startswith("test_")
        ]
    )

    written: List[Tuple[Type[BaseModel], Path]] = []

    for py_file in py_files:
        module = _load_module_from_path(py_file)
        models = _collect_models(module)

        for model in models:
            schema: Dict[str, Any] = model.model_json_schema()
            out_path = out_dir / _schema_filename(model)
            out_path.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            written.append((model, out_path))

    return written


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    out_dir = base_dir / "json"

    written = generate_json_schemas(base_dir=base_dir, out_dir=out_dir)

    print(f"✅ Generated {len(written)} JSON Schema files in: {out_dir}")
    for model, p in written:
        print(f"- {model.__name__}: {p.relative_to(base_dir)}")


if __name__ == "__main__":
    main()
