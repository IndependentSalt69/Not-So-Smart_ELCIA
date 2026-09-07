"""
src/schemas/verification.py
Pydantic schemas for VideoVerification entity serialization, validation, and human review requests.
"""

from datetime import datetime
from typing import Optional, List, Union
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.db.models.enums import VerificationStatus, IncidentType, PriorityLevel
from src.core.spatial import GeoJSONPoint


class VideoVerificationBase(BaseModel):
    job_id: str
    video_filename: str
    video_path: str
    annotated_video_url: Optional[str] = None
    telemetry_path: Optional[str] = None
    zone_id: Optional[UUID] = None
    custom_zone_name: Optional[str] = Field(None, max_length=128)
    drone_id: Optional[str] = None
    ai_hazard_count: int = 0
    status: VerificationStatus = VerificationStatus.PENDING_REVIEW
    reviewer_id: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_incident_id: Optional[UUID] = None

    @field_validator("custom_zone_name", mode="before")
    @classmethod
    def clean_custom_zone_name(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return v


class VideoVerificationCreate(VideoVerificationBase):
    pass


class VideoVerificationResponse(VideoVerificationBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class VideoVerificationListResponse(BaseModel):
    items: List[VideoVerificationResponse]
    total: int
    skip: int = 0
    limit: int = 100


class ConfirmClearRequest(BaseModel):
    reviewer_id: Optional[UUID] = None
    notes: Optional[str] = Field(None, description="Optional operator notes confirming no anomalies")


class ReportAnomalyRequest(BaseModel):
    reviewer_id: Optional[UUID] = None
    hazard_type: IncidentType = Field(..., description="Civic hazard class observed by human operator")
    priority: PriorityLevel = Field(PriorityLevel.P2, description="Assigned priority level (P1, P2, P3)")
    severity_score: float = Field(5.0, ge=0.0, le=10.0, description="Hazard severity score from 0.0 to 10.0")
    description: Optional[str] = Field(None, description="Human operator observation notes")
    timestamp_sec: Optional[float] = Field(None, description="Video playback timestamp in seconds where anomaly appears")
    frame_number: Optional[int] = Field(None, description="Frame number of the anomaly observation")
    zone_id: Optional[Union[UUID, str]] = Field(None, description="Operational zone UUID or code (e.g. EC-01 or OTHER)")
    custom_zone_name: Optional[str] = Field(None, max_length=128, description="Custom zone name if zone_id is OTHER or None")
    location: Optional[GeoJSONPoint] = Field(
        None,
        description="GeoJSON point coordinates [longitude, latitude]. Required if flight GPS is unavailable.",
    )

    @field_validator("custom_zone_name", mode="before")
    @classmethod
    def clean_custom_zone_name(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return v
