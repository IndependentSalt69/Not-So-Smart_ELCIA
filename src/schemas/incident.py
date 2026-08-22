"""
src/schemas/incident.py
Pydantic schemas for Incident entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus
from src.core.spatial import GeoJSONPoint, geoalchemy_to_geojson


class IncidentBase(BaseModel):
    incident_code: str = Field(..., max_length=64, description="Unique tracking code e.g. EC-001")
    incident_type: IncidentType
    confidence: float = Field(..., ge=0.0, le=1.0)
    severity_score: float = Field(..., ge=0.0, le=10.0)
    priority: PriorityLevel
    zone_id: UUID
    status: IncidentStatus = Field(default=IncidentStatus.DETECTED)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    recommended_action: Optional[str] = None
    location: Optional[GeoJSONPoint] = Field(None, description="GeoJSON point coordinates [longitude, latitude]")


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    incident_type: Optional[IncidentType] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    severity_score: Optional[float] = Field(None, ge=0.0, le=10.0)
    priority: Optional[PriorityLevel] = None
    zone_id: Optional[UUID] = None
    status: Optional[IncidentStatus] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    recommended_action: Optional[str] = None
    location: Optional[GeoJSONPoint] = None


class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus
    changed_by: Optional[UUID] = Field(None, description="ID of operator/user making status change")
    comment: Optional[str] = Field(None, description="Audit comment for status transition")


class IncidentResponse(IncidentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

    @field_validator("location", mode="before")
    @classmethod
    def convert_spatial_location(cls, v: Any) -> Any:
        if v is not None and not isinstance(v, (dict, GeoJSONPoint)):
            return geoalchemy_to_geojson(v)
        return v


class IncidentListResponse(BaseModel):
    items: List[IncidentResponse]
    total: int
    skip: int
    limit: int
