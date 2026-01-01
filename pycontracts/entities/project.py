"""
Project Entity Contract

@version 2.3.0
"""

from datetime import datetime, date
from typing import Literal, Optional
from pydantic import Field
from ..base import BaseEntity


ProjectStatus = Literal["planning", "active", "on_hold", "completed", "cancelled"]


class Project(BaseEntity):
    """Project entity"""
    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    status: ProjectStatus = "planning"
    owner_id: Optional[str] = Field(None, alias="ownerId")
    start_date: Optional[date] = Field(None, alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")
    budget: Optional[float] = Field(None, ge=0)
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
