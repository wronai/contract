"""User contract (Pydantic).

This model is the single source of truth for JSON Schema generation.
It is intended to be used for:
- LLM response formats
- Backend runtime validation
- Frontend TypeScript SDK generation
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    """Represents a user record."""

    id: UUID = Field(..., description="Unique identifier")
    email: EmailStr = Field(
        ...,
        description="User email address",
        examples=["alice@example.com"],
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=120,
        description="Display name",
        examples=["Alice"],
    )
    age: Optional[int] = Field(
        default=None,
        ge=0,
        le=150,
        description="Optional age",
        examples=[34],
    )
    created_at: datetime = Field(
        ...,
        description="Creation timestamp (RFC3339)",
        examples=["2026-01-01T12:00:00Z"],
    )
