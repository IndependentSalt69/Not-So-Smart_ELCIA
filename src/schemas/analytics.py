"""
src/schemas/analytics.py
Pydantic schemas for CivicPulse backend analytics endpoints.
"""

from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from src.db.models.enums import PriorityLevel, IncidentStatus


class StatusDistributionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: IncidentStatus = Field(..., description="Incident status enum value")
    count: int = Field(..., ge=0, description="Number of incidents in this status")


class PriorityDistributionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    priority: PriorityLevel = Field(..., description="Priority level enum value")
    count: int = Field(..., ge=0, description="Number of incidents in this priority")


class AnalyticsKPI(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_active_incidents: int = Field(..., ge=0, description="Count of active incidents (status not CLOSED or REJECTED)")
    critical_p1_count: int = Field(..., ge=0, description="Count of P1 critical priority incidents")
    high_p2_count: int = Field(..., ge=0, description="Count of P2 high priority incidents")
    routine_p3_count: int = Field(..., ge=0, description="Count of P3 routine priority incidents")
    waterlogged_area_sqm: Optional[float] = Field(
        None,
        description="Measured waterlogged area in sq. meters. Currently null as physical area is not measured by DB schema.",
    )
    pothole_clusters_count: int = Field(..., ge=0, description="Count of pothole incidents")
    pending_verification_count: int = Field(..., ge=0, description="Count of incidents with DETECTED status")
    mean_time_to_resolution_hours: Optional[float] = Field(
        None,
        ge=0.0,
        description="Mean time to resolution in hours derived from duration_seconds of resolved incidents.",
    )


class AnalyticsSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kpis: AnalyticsKPI
    status_distribution: List[StatusDistributionItem]
    priority_distribution: List[PriorityDistributionItem]


class AnalyticsTrendItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: str = Field(..., description="Calendar date string YYYY-MM-DD")
    waterlogging: int = Field(default=0, ge=0, description="Count of waterlogging incidents created on date")
    potholes: int = Field(default=0, ge=0, description="Count of pothole incidents created on date")
    drainage_overflow: int = Field(default=0, ge=0, description="Count of drainage overflow incidents created on date")
    damaged_footpath: int = Field(default=0, ge=0, description="Count of damaged footpath incidents created on date")
    open_manhole: int = Field(default=0, ge=0, description="Count of open manhole incidents created on date")
    rainfall_mm: Optional[float] = Field(
        None,
        description="Observed rainfall in mm. Currently null as weather data is not stored in backend schema.",
    )


class ZoneAnalyticsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone_id: UUID
    zone_code: str = Field(..., description="Unique zone identifier code")
    zone_name: str = Field(..., description="Human readable zone name")
    active_incidents: int = Field(..., ge=0, description="Count of active incidents in zone")
    waterlogged_area_sqm: Optional[float] = Field(
        None,
        description="Measured waterlogged area in sq. meters for zone. Currently null.",
    )
    p1_count: int = Field(..., ge=0, description="Active P1 incidents in zone")
    p2_count: int = Field(..., ge=0, description="Active P2 incidents in zone")
    p3_count: int = Field(..., ge=0, description="Active P3 incidents in zone")


ZoneAnalyticsItem = ZoneAnalyticsResponse
