"""
src/schemas/processing.py
Pydantic schemas for ML video processing jobs (Phase 11B).
"""

from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ProcessJobResponse(BaseModel):
    job_id: str = Field(..., description="Unique job UUID string")
    status: JobStatus = Field(..., description="Initial job status (QUEUED)")
    message: str = Field(..., description="Human readable status message")
    created_at: datetime = Field(..., description="UTC ISO timestamp of creation")


class JobStatusResponse(BaseModel):
    job_id: str = Field(..., description="Unique job UUID string")
    status: JobStatus = Field(..., description="Current job status")
    progress_pct: float = Field(0.0, description="Estimated or completed progress percentage (0-100)")
    current_stage: str = Field(..., description="Human readable stage status description")
    hazards_detected: int = Field(0, description="Total unique hazards detected by ML model")
    evidence_count: int = Field(0, description="Total evidence frame snapshots captured")
    created_at: datetime = Field(..., description="UTC ISO timestamp of job creation")
    started_at: Optional[datetime] = Field(None, description="UTC ISO timestamp when ML runner started")
    completed_at: Optional[datetime] = Field(None, description="UTC ISO timestamp when job completed/failed")
    error: Optional[str] = Field(None, description="Error message if status is FAILED")
    results: Optional[Dict[str, Any]] = Field(None, description="Output artifact paths and telemetry metrics when COMPLETED")


from uuid import UUID
from typing import List
from src.schemas.incident import IncidentResponse
from src.schemas.verification import VideoVerificationResponse


class FlightInspectionRunSummary(BaseModel):
    job_id: str = Field(..., description="Unique flight/job UUID string")
    job_prefix: str = Field(..., description="First 8 characters of job UUID (hex)")
    zone_id: Optional[UUID] = Field(None, description="Operational zone UUID")
    zone_code: Optional[str] = Field(None, description="Operational zone code (e.g. EC-01 or OTHER)")
    custom_zone_name: Optional[str] = Field(None, description="Custom operational zone name when zone_code is OTHER")
    total_hazards: int = Field(0, description="Total individual hazards detected or reported for this flight")
    class_counts: Dict[str, int] = Field(default_factory=dict, description="Count of hazards by incident type")
    priority_counts: Dict[str, int] = Field(default_factory=dict, description="Count of hazards by priority level (P1, P2, P3)")
    status: str = Field(..., description="Inspection run status: COMPLETED, PENDING_REVIEW, CONFIRMED_CLEAR, ANOMALY_REPORTED, PROCESSING, QUEUED, FAILED")
    created_at: datetime = Field(..., description="Timestamp of flight creation/start")
    completed_at: Optional[datetime] = Field(None, description="Timestamp of processing completion or review")
    annotated_video_url: Optional[str] = Field(None, description="Browser-accessible annotated video URL if available")
    has_human_report: bool = Field(False, description="True if one or more hazards in this run were reported manually by an operator")


class FlightInspectionRunListResponse(BaseModel):
    items: List[FlightInspectionRunSummary]
    total: int
    skip: int = 0
    limit: int = 20


class FlightInspectionRunDetail(BaseModel):
    summary: FlightInspectionRunSummary
    incidents: List[IncidentResponse] = Field(default_factory=list, description="List of all distinct incident records created for this flight run")
    verification: Optional[VideoVerificationResponse] = Field(None, description="Associated VideoVerification record if 0 AI incidents were detected")
