"""
src/api/routes/incidents.py
Incident management and associated sub-resources REST API endpoints.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from src.api.dependencies import get_db
from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus
from src.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentStatusUpdate,
    IncidentResponse,
    IncidentListResponse,
)
from src.schemas.evidence import EvidenceCreate, EvidenceResponse
from src.schemas.detection import DetectionCreate, DetectionResponse
from src.schemas.assignment import AssignmentCreate, AssignmentResponse
from src.schemas.inspection import InspectionCreate, InspectionResponse
from src.schemas.history import StatusHistoryResponse

from src.repositories import (
    create_incident as repo_create_incident,
    get_incident as repo_get_incident,
    list_incidents as repo_list_incidents,
    count_incidents as repo_count_incidents,
    update_incident as repo_update_incident,
    update_incident_status as repo_update_incident_status,
    get_zone as repo_get_zone,
    get_user as repo_get_user,
    create_evidence as repo_create_evidence,
    list_incident_evidence as repo_list_evidence,
    create_detection as repo_create_detection,
    list_incident_detections as repo_list_detections,
    create_assignment as repo_create_assignment,
    get_incident_assignments as repo_get_assignments,
    create_inspection as repo_create_inspection,
    list_incident_inspections as repo_list_inspections,
    list_incident_status_history as repo_list_status_history,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])


# ==============================================================================
# INCIDENTS ENDPOINTS
# ==============================================================================

@router.post(
    "/",
    summary="Create incident",
    status_code=status.HTTP_201_CREATED,
    response_model=IncidentResponse,
)
def create_new_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
) -> IncidentResponse:
    """Create a new civic incident record."""
    # Verify zone exists
    zone = repo_get_zone(db=db, zone_id=payload.zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zone '{payload.zone_id}' not found.",
        )

    try:
        incident = repo_create_incident(
            db=db,
            incident_code=payload.incident_code,
            incident_type=payload.incident_type,
            confidence=payload.confidence,
            severity_score=payload.severity_score,
            priority=payload.priority,
            zone_id=payload.zone_id,
            status=payload.status,
            started_at=payload.started_at,
            ended_at=payload.ended_at,
            duration_seconds=payload.duration_seconds,
            recommended_action=payload.recommended_action,
            location=payload.location,
        )
        return incident
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incident with code '{payload.incident_code}' already exists.",
        )


@router.get(
    "/",
    summary="List incidents",
    status_code=status.HTTP_200_OK,
    response_model=IncidentListResponse,
)
def list_all_incidents(
    zone_id: Optional[UUID] = Query(None, description="Filter by operational zone ID"),
    status_param: Optional[IncidentStatus] = Query(None, alias="status", description="Filter by status"),
    priority: Optional[PriorityLevel] = Query(None, description="Filter by priority level"),
    incident_type: Optional[IncidentType] = Query(None, description="Filter by incident type"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of items to return"),
    sort_by: str = Query("created_at", description="Sort field: created_at or priority"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    db: Session = Depends(get_db),
) -> IncidentListResponse:
    """List civic incidents with multi-criteria filtering, sorting, and pagination."""
    incidents = repo_list_incidents(
        db=db,
        zone_id=zone_id,
        status=status_param,
        priority=priority,
        incident_type=incident_type,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        order=order,
    )
    total = repo_count_incidents(
        db=db,
        zone_id=zone_id,
        status=status_param,
        priority=priority,
        incident_type=incident_type,
    )
    return IncidentListResponse(
        items=incidents,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{incident_id}",
    summary="Get incident details",
    status_code=status.HTTP_200_OK,
    response_model=IncidentResponse,
)
def get_incident_by_id(
    incident_id: str,
    db: Session = Depends(get_db),
) -> IncidentResponse:
    """Get details for a single civic incident by UUID or tracking code."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return incident


@router.patch(
    "/{incident_id}",
    summary="Update incident details",
    status_code=status.HTTP_200_OK,
    response_model=IncidentResponse,
)
def update_incident_details(
    incident_id: str,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
) -> IncidentResponse:
    """Update fields on an existing civic incident."""
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        incident = repo_get_incident(db=db, incident_id=incident_id)
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident '{incident_id}' not found.",
            )
        return incident

    updated = repo_update_incident(db=db, incident_id=incident_id, **update_data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return updated


@router.patch(
    "/{incident_id}/status",
    summary="Update incident status",
    status_code=status.HTTP_200_OK,
    response_model=IncidentResponse,
)
def update_status(
    incident_id: str,
    payload: IncidentStatusUpdate,
    db: Session = Depends(get_db),
) -> IncidentResponse:
    """Update status of an incident and append an audit history record."""
    updated = repo_update_incident_status(
        db=db,
        incident_id=incident_id,
        status=payload.status,
        changed_by=payload.changed_by,
        comment=payload.comment,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return updated


# ==============================================================================
# EVIDENCE ENDPOINTS
# ==============================================================================

@router.post(
    "/{incident_id}/evidence",
    summary="Attach evidence asset to incident",
    status_code=status.HTTP_201_CREATED,
    response_model=EvidenceResponse,
)
def add_incident_evidence(
    incident_id: str,
    payload: EvidenceCreate,
    db: Session = Depends(get_db),
) -> EvidenceResponse:
    """Attach media evidence asset (image/video path) to an incident."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    evidence = repo_create_evidence(
        db=db,
        incident_id=incident.id,
        evidence_type=payload.evidence_type,
        file_path=payload.file_path,
        captured_at=payload.captured_at,
        description=payload.description,
        is_primary=payload.is_primary,
    )
    return evidence


@router.get(
    "/{incident_id}/evidence",
    summary="List incident evidence assets",
    status_code=status.HTTP_200_OK,
    response_model=List[EvidenceResponse],
)
def list_evidence_for_incident(
    incident_id: str,
    db: Session = Depends(get_db),
) -> List[EvidenceResponse]:
    """List all media evidence assets attached to an incident."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return repo_list_evidence(db=db, incident_id=incident.id)


# ==============================================================================
# DETECTIONS ENDPOINTS
# ==============================================================================

@router.post(
    "/{incident_id}/detections",
    summary="Log detection frame observation",
    status_code=status.HTTP_201_CREATED,
    response_model=DetectionResponse,
)
def add_incident_detection(
    incident_id: str,
    payload: DetectionCreate,
    db: Session = Depends(get_db),
) -> DetectionResponse:
    """Log a frame-level model detection observation for an incident."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    detection = repo_create_detection(
        db=db,
        incident_id=incident.id,
        detection_type=payload.detection_type,
        confidence=payload.confidence,
        frame_number=payload.frame_number,
        detected_at=payload.detected_at,
        location=payload.location,
        detection_metadata=payload.detection_metadata,
    )
    return detection


@router.get(
    "/{incident_id}/detections",
    summary="List incident detections",
    status_code=status.HTTP_200_OK,
    response_model=List[DetectionResponse],
)
def list_detections_for_incident(
    incident_id: str,
    db: Session = Depends(get_db),
) -> List[DetectionResponse]:
    """List model frame observations linked to an incident."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return repo_list_detections(db=db, incident_id=incident.id)


# ==============================================================================
# ASSIGNMENTS ENDPOINTS
# ==============================================================================

@router.post(
    "/{incident_id}/assignments",
    summary="Assign incident to user/team",
    status_code=status.HTTP_201_CREATED,
    response_model=AssignmentResponse,
)
def add_incident_assignment(
    incident_id: str,
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
) -> AssignmentResponse:
    """Assign incident to a maintenance crew or operator user."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    user = repo_get_user(db=db, user_id=payload.assigned_to)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{payload.assigned_to}' not found.",
        )

    assignment = repo_create_assignment(
        db=db,
        incident_id=incident.id,
        assigned_to=user.id,
        assigned_team=payload.assigned_team,
        assigned_at=payload.assigned_at,
        completed_at=payload.completed_at,
        notes=payload.notes,
    )
    return assignment


@router.get(
    "/{incident_id}/assignments",
    summary="Get incident assignments",
    status_code=status.HTTP_200_OK,
    response_model=List[AssignmentResponse],
)
def list_assignments_for_incident(
    incident_id: str,
    db: Session = Depends(get_db),
) -> List[AssignmentResponse]:
    """List team/operator assignments for an incident."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return repo_get_assignments(db=db, incident_id=incident.id)


# ==============================================================================
# INSPECTIONS ENDPOINTS
# ==============================================================================

@router.post(
    "/{incident_id}/inspections",
    summary="Record field inspection",
    status_code=status.HTTP_201_CREATED,
    response_model=InspectionResponse,
)
def add_incident_inspection(
    incident_id: str,
    payload: InspectionCreate,
    db: Session = Depends(get_db),
) -> InspectionResponse:
    """Record a field inspector's verification result for an incident."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    inspector = repo_get_user(db=db, user_id=payload.inspector_id)
    if not inspector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspector user '{payload.inspector_id}' not found.",
        )

    inspection = repo_create_inspection(
        db=db,
        incident_id=incident.id,
        inspector_id=inspector.id,
        result=payload.result,
        inspection_time=payload.inspection_time,
        notes=payload.notes,
        location=payload.location,
        evidence_id=payload.evidence_id,
    )
    return inspection


@router.get(
    "/{incident_id}/inspections",
    summary="List incident inspections",
    status_code=status.HTTP_200_OK,
    response_model=List[InspectionResponse],
)
def list_inspections_for_incident(
    incident_id: str,
    db: Session = Depends(get_db),
) -> List[InspectionResponse]:
    """List field inspections recorded for an incident."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return repo_list_inspections(db=db, incident_id=incident.id)


# ==============================================================================
# STATUS HISTORY ENDPOINT
# ==============================================================================

@router.get(
    "/{incident_id}/history",
    summary="Get incident status audit history",
    status_code=status.HTTP_200_OK,
    response_model=List[StatusHistoryResponse],
)
def list_status_history_for_incident(
    incident_id: str,
    db: Session = Depends(get_db),
) -> List[StatusHistoryResponse]:
    """List chronological status transition history log for an incident."""
    incident = repo_get_incident(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )
    return repo_list_status_history(db=db, incident_id=incident.id)
