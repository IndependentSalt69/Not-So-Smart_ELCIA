"""
src/schemas/zone.py
Pydantic schemas for Zone entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ZoneBase(BaseModel):
    code: str = Field(..., max_length=32, description="Unique zone code e.g. EC-01")
    name: str = Field(..., max_length=128, description="Human-readable zone name")
    description: Optional[str] = Field(None, description="Optional description")
    geometry: Optional[Any] = Field(None, description="Optional PostGIS polygon geometry")


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = None
    geometry: Optional[Any] = None


class ZoneResponse(ZoneBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime
