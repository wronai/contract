"""
Pydantic Contract Examples for Reclapp 2.3
"""

from .base import ContractBase, Entity, Field, ApiResource, Instruction
from .contracts import (
    NotesContract,
    TodoContract, 
    CRMContract,
    InventoryContract,
    BookingContract,
)

__all__ = [
    'ContractBase',
    'Entity',
    'Field', 
    'ApiResource',
    'Instruction',
    'NotesContract',
    'TodoContract',
    'CRMContract',
    'InventoryContract',
    'BookingContract',
]
