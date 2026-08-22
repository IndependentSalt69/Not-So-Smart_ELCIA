"""
src/schemas/detection.py
Pydantic schemas for Detection entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.core.spatial import GeoJSONPoint, geoalchemy_to_geojson


class DetectionBase(BaseModel):
    detection_type: str = Field(..., max_length=64)
    confidence: float = Field(..., ge=0.0, le=1.0)
    frame_number: Optional[int] = None
    detected_at: Optional[datetime] = None
    location: Optional[GeoJSONPoint] = Field(None, description="GeoJSON point coordinates [longitude, latitude]")
    detection_metadata: Optional[Dict[str, Any]] = None


class DetectionCreate(DetectionBase):
    pass


class DetectionResponse(DetectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_id: UUID
    created_at: datetime

    @field_validator("location", mode="before")
    @classmethod
    def convert_spatial_location(cls, v: Any) -> Any:
        if v is not None and not isinstance(v, (dict, GeoJSONPoint)):
            return geoalchemy_to_geojson(v)
        return v
