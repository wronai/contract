"""
Contact Entity Contract

@version 2.3.0
"""

from datetime import datetime
from typing import Optional
from pydantic import EmailStr, Field
from ..base import BaseEntity


class Contact(BaseEntity):
    """CRM Contact entity"""
    id: str = Field(..., description="Unique identifier")
    email: EmailStr = Field(..., description="Contact email address")
    first_name: str = Field(..., min_length=1, alias="firstName")
    last_name: str = Field(..., min_length=1, alias="lastName")
    phone: Optional[str] = Field(None, pattern=r"^\+?[\d\s\-()]+$")
    company_id: Optional[str] = Field(None, alias="companyId")
    position: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    
    @property
    def full_name(self) -> str:
        """Get full name"""
        return f"{self.first_name} {self.last_name}"
