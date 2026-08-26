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
