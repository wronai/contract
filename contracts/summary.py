"""Summary contract (Pydantic).

This is an example aggregate payload contract.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class Summary(BaseModel):
    """Represents an aggregated system summary."""

    total_users: int = Field(..., ge=0, description="Total number of users")
    active_users: int = Field(..., ge=0, description="Number of active users")
    generated_at: str = Field(
        ...,
        description="Generation timestamp (RFC3339)",
        examples=["2026-01-01T12:00:00Z"],
    )
