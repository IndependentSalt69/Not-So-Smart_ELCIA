"""
src/schemas/inspection.py
Pydantic schemas for Inspection entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from src.db.models.enums import InspectionResult


class InspectionBase(BaseModel):
    inspector_id: UUID
    result: InspectionResult
    inspection_time: Optional[datetime] = None
    notes: Optional[str] = None
    location: Optional[Any] = None
    evidence_id: Optional[UUID] = None


class InspectionCreate(InspectionBase):
    pass


class InspectionResponse(InspectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_id: UUID
    created_at: datetime
