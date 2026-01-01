"""
Deal Entity Contract

@version 2.3.0
"""

from datetime import datetime, date
from typing import Literal, Optional
from pydantic import Field
from ..base import BaseEntity


DealStage = Literal["lead", "qualified", "proposal", "negotiation", "won", "lost"]


class Deal(BaseEntity):
    """CRM Deal/Opportunity entity"""
    id: str = Field(..., description="Unique identifier")
    title: str = Field(..., min_length=1)
    value: float = Field(..., ge=0)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    stage: DealStage = "lead"
    probability: int = Field(default=0, ge=0, le=100)
    contact_id: Optional[str] = Field(None, alias="contactId")
    company_id: Optional[str] = Field(None, alias="companyId")
    expected_close: Optional[date] = Field(None, alias="expectedClose")
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    closed_at: Optional[datetime] = Field(None, alias="closedAt")
    
    @property
    def weighted_value(self) -> float:
        """Calculate weighted deal value"""
        return self.value * (self.probability / 100)
