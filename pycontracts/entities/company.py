"""
Company Entity Contract

@version 2.3.0
"""

from datetime import datetime
from typing import Optional
from pydantic import Field, HttpUrl
from ..base import BaseEntity


class Company(BaseEntity):
    """CRM Company entity"""
    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., min_length=1)
    domain: Optional[str] = None
    website: Optional[HttpUrl] = None
    industry: Optional[str] = None
    size: Optional[str] = Field(None, pattern=r"^(1-10|11-50|51-200|201-500|500\+)$")
    revenue: Optional[float] = Field(None, ge=0)
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
