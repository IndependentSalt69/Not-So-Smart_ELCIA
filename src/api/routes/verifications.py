"""
src/api/routes/verifications.py
FastAPI router endpoints for VideoVerification and No-Incident Human Verification workflows (Phase 14).
"""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.db.models.enums import VerificationStatus
from src.schemas.verification import (
    VideoVerificationResponse,
    VideoVerificationListResponse,
    ConfirmClearRequest,
    ReportAnomalyRequest,
)
from src.schemas.incident import IncidentResponse
from src.repositories.verifications import (
    get_verification,
    list_verifications,
    count_verifications,
    confirm_verification_clear,
    report_verification_anomaly,
)

router = APIRouter(prefix="/verifications", tags=["verifications"])


class ReportAnomalyResponse(BaseModel):
    verification: VideoVerificationResponse
    incident: IncidentResponse
    message: str = "Manual incident created and linked to flight verification successfully."


@router.get(
    "",
    summary="List video verifications",
    status_code=status.HTTP_200_OK,
    response_model=VideoVerificationListResponse,
)
def list_all_verifications(
    status_filter: Optional[VerificationStatus] = Query(None, alias="status", description="Filter by verification status"),
    zone_id: Optional[str] = Query(None, description="Filter by operational zone ID or code"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max number of items to return"),
    db: Session = Depends(get_db),
) -> VideoVerificationListResponse:
    """List aerial video verifications with filtering and pagination."""
    items = list_verifications(
        db=db,
        status=status_filter,
        zone_id=zone_id,
        skip=skip,
        limit=limit,
    )
    total = count_verifications(
        db=db,
        status=status_filter,
        zone_id=zone_id,
    )
    return VideoVerificationListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{id_or_job_id}",
    summary="Get video verification details",
    status_code=status.HTTP_200_OK,
    response_model=VideoVerificationResponse,
)
def get_verification_details(
    id_or_job_id: str,
    db: Session = Depends(get_db),
) -> VideoVerificationResponse:
    """Get video flight verification record by UUID or processing job ID."""
    verification = get_verification(db, id_or_job_id)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video verification record '{id_or_job_id}' not found.",
        )
    return verification


@router.post(
    "/{id_or_job_id}/confirm-clear",
    summary="Confirm no anomalies in flight video",
    status_code=status.HTTP_200_OK,
    response_model=VideoVerificationResponse,
)
def confirm_no_anomaly(
    id_or_job_id: str,
    payload: ConfirmClearRequest,
    db: Session = Depends(get_db),
) -> VideoVerificationResponse:
    """
    Human operator confirms that zero anomalies exist in the flight footage (True Negative).
    Transitions verification status to CONFIRMED_CLEAR.
    """
    try:
        updated = confirm_verification_clear(
            db=db,
            verification_id_or_job_id=id_or_job_id,
            reviewer_id=payload.reviewer_id,
            notes=payload.notes,
        )
        return updated
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm verification: {str(e)}",
        )


@router.post(
    "/{id_or_job_id}/report-anomaly",
    summary="Report undetected hazard from flight video",
    status_code=status.HTTP_201_CREATED,
    response_model=ReportAnomalyResponse,
)
def report_undetected_hazard(
    id_or_job_id: str,
    payload: ReportAnomalyRequest,
    db: Session = Depends(get_db),
) -> ReportAnomalyResponse:
    """
    Human operator disputes AI negative finding and registers a genuine Incident
    observed in the aerial drone footage.
    """
    try:
        verification, incident = report_verification_anomaly(
            db=db,
            verification_id_or_job_id=id_or_job_id,
            hazard_type=payload.hazard_type,
            priority=payload.priority,
            severity_score=payload.severity_score,
            location=payload.location,
            description=payload.description,
            timestamp_sec=payload.timestamp_sec,
            frame_number=payload.frame_number,
            zone_id=payload.zone_id,
            custom_zone_name=payload.custom_zone_name,
            reviewer_id=payload.reviewer_id,
        )
        return ReportAnomalyResponse(
            verification=verification,
            incident=incident,
            message="Manual incident created and linked to flight verification successfully.",
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to report anomaly: {str(e)}",
        )
