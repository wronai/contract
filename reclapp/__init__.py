"""
Reclapp - AI-Native Declarative Platform for B2B Applications

Usage:
    reclapp --prompt "Create a notes app"
    reclapp generate examples/contract-ai/crm-contract.ts
    reclapp-lifecycle --prompt "Create a CRM system"
"""

__version__ = "2.3.1"
__author__ = "Reclapp Team"

try:
    from pathlib import Path

    _core_pkg = Path(__file__).parent.parent / "src" / "python" / "reclapp"
    if _core_pkg.exists():
        __path__.append(str(_core_pkg))
except Exception:
    pass

from .cli import main, lifecycle

__all__ = ["main", "lifecycle", "__version__"]
