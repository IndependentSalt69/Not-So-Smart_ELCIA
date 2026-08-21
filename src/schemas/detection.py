"""
src/schemas/detection.py
Pydantic schemas for Detection entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class DetectionBase(BaseModel):
    detection_type: str = Field(..., max_length=64)
    confidence: float = Field(..., ge=0.0, le=1.0)
    frame_number: Optional[int] = None
    detected_at: Optional[datetime] = None
    location: Optional[Any] = None
    detection_metadata: Optional[Dict[str, Any]] = None


class DetectionCreate(DetectionBase):
    pass


class DetectionResponse(DetectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_id: UUID
    created_at: datetime
