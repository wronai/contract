"""
Pydantic Contract Examples

10 przykładowych kontraktów w formacie Pydantic.
"""

from .notes_contract import NotesContract
from .todo_contract import TodoContract
from .inventory_contract import InventoryContract
from .booking_contract import BookingContract
from .hr_contract import HRContract

__all__ = [
    'NotesContract',
    'TodoContract',
    'InventoryContract',
    'BookingContract',
    'HRContract',
]
