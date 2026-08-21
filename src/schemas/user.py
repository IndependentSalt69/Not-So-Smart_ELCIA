"""
src/schemas/user.py
Pydantic schemas for User entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from src.db.models.enums import UserRole


class UserBase(BaseModel):
    name: str = Field(..., max_length=128)
    email: str = Field(..., max_length=255)
    role: UserRole = Field(default=UserRole.OPERATOR)
    is_active: bool = Field(default=True)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    email: Optional[str] = Field(None, max_length=255)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime
