"""
src/schemas/inspection.py
Pydantic schemas for Inspection entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.db.models.enums import InspectionResult
from src.core.spatial import GeoJSONPoint, geoalchemy_to_geojson


class InspectionBase(BaseModel):
    inspector_id: UUID
    result: InspectionResult
    inspection_time: Optional[datetime] = None
    notes: Optional[str] = None
    location: Optional[GeoJSONPoint] = Field(None, description="GeoJSON point coordinates [longitude, latitude]")
    evidence_id: Optional[UUID] = None


class InspectionCreate(InspectionBase):
    pass


class InspectionResponse(InspectionBase):
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
