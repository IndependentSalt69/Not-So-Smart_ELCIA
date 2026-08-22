"""
src/schemas/zone.py
Pydantic schemas for Zone entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.core.spatial import GeoJSONPolygon, geoalchemy_to_geojson


class ZoneBase(BaseModel):
    code: str = Field(..., max_length=32, description="Unique zone code e.g. EC-01")
    name: str = Field(..., max_length=128, description="Human-readable zone name")
    description: Optional[str] = Field(None, description="Optional description")
    geometry: Optional[GeoJSONPolygon] = Field(None, description="GeoJSON polygon geometry representing zone boundary")


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = None
    geometry: Optional[GeoJSONPolygon] = None


class ZoneResponse(ZoneBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

    @field_validator("geometry", mode="before")
    @classmethod
    def convert_spatial_geometry(cls, v: Any) -> Any:
        if v is not None and not isinstance(v, (dict, GeoJSONPolygon)):
            return geoalchemy_to_geojson(v)
        return v
