"""
Entity Contracts

Pydantic models for common business entities.

@version 2.3.0
"""

from .contact import Contact
from .company import Company
from .deal import Deal
from .user import User
from .task import Task
from .project import Project

__all__ = [
    "Contact",
    "Company",
    "Deal",
    "User",
    "Task",
    "Project",
]
