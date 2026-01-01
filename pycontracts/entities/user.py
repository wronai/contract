"""
User Entity Contract

@version 2.3.0
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import EmailStr, Field
from ..base import BaseEntity


UserRole = Literal["admin", "user", "viewer"]


class User(BaseEntity):
    """System User entity"""
    id: str = Field(..., description="Unique identifier")
    email: EmailStr = Field(..., description="User email")
    name: str = Field(..., min_length=1)
    role: UserRole = "user"
    avatar_url: Optional[str] = Field(None, alias="avatarUrl")
    is_active: bool = Field(default=True, alias="isActive")
    last_login: Optional[datetime] = Field(None, alias="lastLogin")
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")
