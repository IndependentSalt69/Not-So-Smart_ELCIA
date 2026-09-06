"""
src/repositories/verifications.py
Repository functions for VideoVerification lifecycle and human-in-the-loop QA workflows.
"""

from datetime import datetime, timezone
from typing import Optional, List, Union, Tuple, Dict, Any
from uuid import UUID
import uuid

from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import Session

from src.db.models.enums import VerificationStatus, IncidentStatus, EvidenceType, IncidentType, PriorityLevel
from src.db.models.verification import VideoVerification
from src.db.models.incident import Incident
from src.db.models.detection import Detection
from src.db.models.evidence import Evidence
from src.db.models.history import IncidentStatusHistory
from src.db.models.zone import Zone
from src.repositories.zones import get_zone, list_zones
from src.repositories.incidents import get_incident
from src.core.spatial import geojson_to_geoalchemy, GeoJSONPoint
from src.services.ml_ingestion_service import RECOMMENDED_ACTIONS


def create_verification(
    db: Session,
    job_id: str,
    video_filename: str,
    video_path: str,
    annotated_video_url: Optional[str] = None,
    telemetry_path: Optional[str] = None,
    zone_id: Optional[Union[UUID, str]] = None,
    drone_id: Optional[str] = None,
    ai_hazard_count: int = 0,
) -> VideoVerification:
    """Creates a new VideoVerification record for an aerial flight."""
    resolved_zone = None
    if zone_id:
        resolved_zone = get_zone(db, zone_id)

    verification = VideoVerification(
        job_id=job_id,
        video_filename=video_filename,
        video_path=video_path,
        annotated_video_url=annotated_video_url,
        telemetry_path=telemetry_path,
        zone_id=resolved_zone.id if resolved_zone else None,
        drone_id=drone_id,
        ai_hazard_count=ai_hazard_count,
        status=VerificationStatus.PENDING_REVIEW,
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)
    return verification


def get_verification(
    db: Session,
    verification_id_or_job_id: Union[UUID, str],
) -> Optional[VideoVerification]:
    """Retrieves a VideoVerification record by UUID primary key or job_id string."""
    try:
        if isinstance(verification_id_or_job_id, UUID):
            val_uuid = verification_id_or_job_id
        else:
            val_uuid = UUID(str(verification_id_or_job_id))
        stmt = select(VideoVerification).where(
            or_(VideoVerification.id == val_uuid, VideoVerification.job_id == str(verification_id_or_job_id))
        )
    except (ValueError, AttributeError):
        stmt = select(VideoVerification).where(VideoVerification.job_id == str(verification_id_or_job_id))

    return db.execute(stmt).scalars().first()


def list_verifications(
    db: Session,
    status: Optional[VerificationStatus] = None,
    zone_id: Optional[Union[UUID, str]] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[VideoVerification]:
    """Lists video verification records with optional status and zone filters."""
    stmt = select(VideoVerification)

    if status is not None:
        stmt = stmt.where(VideoVerification.status == status)

    if zone_id is not None:
        zone = get_zone(db, zone_id)
        if zone:
            stmt = stmt.where(VideoVerification.zone_id == zone.id)

    stmt = stmt.order_by(desc(VideoVerification.created_at)).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def count_verifications(
    db: Session,
    status: Optional[VerificationStatus] = None,
    zone_id: Optional[Union[UUID, str]] = None,
) -> int:
    """Counts total video verifications matching criteria."""
    stmt = select(func.count(VideoVerification.id))

    if status is not None:
        stmt = stmt.where(VideoVerification.status == status)

    if zone_id is not None:
        zone = get_zone(db, zone_id)
        if zone:
            stmt = stmt.where(VideoVerification.zone_id == zone.id)

    return db.execute(stmt).scalar_one()


def confirm_verification_clear(
    db: Session,
    verification_id_or_job_id: Union[UUID, str],
    reviewer_id: Optional[UUID] = None,
    notes: Optional[str] = None,
) -> VideoVerification:
    """
    Operator confirms that no anomalies exist in the flight footage (True Negative).
    Persists reviewer, review timestamp, and optional notes without creating any Incident.
    """
    verification = get_verification(db, verification_id_or_job_id)
    if not verification:
        raise ValueError(f"Video verification record '{verification_id_or_job_id}' not found.")

    verification.status = VerificationStatus.CONFIRMED_CLEAR
    verification.reviewer_id = reviewer_id
    verification.reviewed_at = datetime.now(timezone.utc)
    if notes:
        verification.review_notes = notes

    db.commit()
    db.refresh(verification)
    return verification


def report_verification_anomaly(
    db: Session,
    verification_id_or_job_id: Union[UUID, str],
    hazard_type: IncidentType,
    priority: PriorityLevel = PriorityLevel.P2,
    severity_score: float = 5.0,
    location: Optional[Union[Dict[str, Any], GeoJSONPoint]] = None,
    description: Optional[str] = None,
    timestamp_sec: Optional[float] = None,
    frame_number: Optional[int] = None,
    zone_id: Optional[Union[UUID, str]] = None,
    reviewer_id: Optional[UUID] = None,
) -> Tuple[VideoVerification, Incident]:
    """
    Operator rejects the AI zero-incident finding and reports an undetected anomaly.
    Creates a genuine Incident record in DETECTED status, attaches video evidence,
    and updates the verification record to ANOMALY_REPORTED.

    GPS Safety: If no location is provided and no actual GPS point can be extracted,
    raises ValueError requiring explicit location coordinates.
    """
    verification = get_verification(db, verification_id_or_job_id)
    if not verification:
        raise ValueError(f"Video verification record '{verification_id_or_job_id}' not found.")

    # 1. Resolve Location (Strict GPS Safety Guarantee)
    location_elem = None
    if location is not None:
        if isinstance(location, dict):
            coords = location.get("coordinates")
            if coords and len(coords) == 2:
                location_elem = geojson_to_geoalchemy(location)
        else:
            location_elem = geojson_to_geoalchemy(location.model_dump())

    if location_elem is None:
        raise ValueError(
            "GPS location is unavailable for this flight/timestamp. "
            "Operator must explicitly provide geographic coordinates before creating a manual incident."
        )

    # 2. Resolve Operational Zone
    effective_zone = None
    if zone_id:
        effective_zone = get_zone(db, zone_id)
    elif verification.zone_id:
        effective_zone = get_zone(db, verification.zone_id)

    if not effective_zone:
        # Fallback to first available zone
        all_zones = list_zones(db)
        if all_zones:
            effective_zone = all_zones[0]

    if not effective_zone:
        raise ValueError("No operational zone available in database for incident creation.")

    # 3. Create Unique Incident Code
    job_prefix = verification.job_id.replace("-", "")[:8].upper()
    ts_suffix = int(timestamp_sec) if timestamp_sec is not None else 0
    base_code = f"INC-{job_prefix}-M{ts_suffix}"
    
    # Ensure unique incident code
    incident_code = base_code
    counter = 1
    while get_incident(db, incident_code):
        incident_code = f"{base_code}-{counter}"
        counter += 1

    rec_action = RECOMMENDED_ACTIONS.get(hazard_type, "Inspect site and issue maintenance work order.")

    # 4. Create Genuine Incident (marked as human verified / manual review)
    incident = Incident(
        id=uuid.uuid4(),
        incident_code=incident_code,
        incident_type=hazard_type,
        confidence=1.0,  # Human verified
        severity_score=severity_score,
        priority=priority,
        zone_id=effective_zone.id,
        status=IncidentStatus.DETECTED,
        started_at=datetime.now(timezone.utc),
        duration_seconds=0.0,
        recommended_action=rec_action,
        location=location_elem,
    )
    db.add(incident)
    db.flush()

    # 5. Resolve and Attach Source Flight Video Evidence Asset
    # Prefer processed/annotated video if generated and exists on disk;
    # otherwise fallback to original uploaded flight video if it exists on disk.
    from pathlib import Path
    from src.core.config import settings, PROJECT_ROOT

    resolved_video_path = None

    # Priority 1: Check if processed/annotated video exists in jobs directory
    job_annotated = Path(settings.JOBS_DIR) / verification.job_id / "annotated_output.mp4"
    if job_annotated.exists() and job_annotated.is_file():
        resolved_video_path = f"/static/jobs/{verification.job_id}/annotated_output.mp4"
    elif verification.annotated_video_url:
        # If annotated_video_url was recorded, verify if the local file exists
        clean_url = verification.annotated_video_url.lstrip("/")
        if (Path(clean_url).exists() and Path(clean_url).is_file()) or (PROJECT_ROOT / clean_url).exists():
            resolved_video_path = verification.annotated_video_url

    # Priority 2: Check original flight video path if annotated video is absent
    if not resolved_video_path and verification.video_path:
        vp = Path(verification.video_path)
        if vp.exists() and vp.is_file():
            norm = str(vp).replace("\\", "/")
            if "uploads/" in norm:
                sub = norm.split("uploads/", 1)[-1]
                resolved_video_path = f"/static/uploads/{sub}"
            else:
                resolved_video_path = str(vp)
        elif (PROJECT_ROOT / verification.video_path).exists():
            norm = verification.video_path.replace("\\", "/")
            if "uploads/" in norm:
                sub = norm.split("uploads/", 1)[-1]
                resolved_video_path = f"/static/uploads/{sub}"
            else:
                resolved_video_path = str(PROJECT_ROOT / verification.video_path)

    # Priority 3: Check job uploads directory if still not resolved
    if not resolved_video_path:
        upload_job_dir = Path(settings.UPLOADS_DIR) / verification.job_id
        if upload_job_dir.exists() and upload_job_dir.is_dir():
            for f in upload_job_dir.iterdir():
                if f.is_file() and f.suffix.lower() in [".mp4", ".mov", ".avi", ".webm"]:
                    resolved_video_path = f"/static/uploads/{verification.job_id}/{f.name}"
                    break

    # Attach evidence only if an actual source video was resolved and exists
    if resolved_video_path:
        ev = Evidence(
            id=uuid.uuid4(),
            incident_id=incident.id,
            evidence_type=EvidenceType.VIDEO,
            file_path=resolved_video_path,
            description=f"Source flight video from flight {verification.job_id[:8]} (Human-reported {hazard_type.value})",
            is_primary=True,
        )
        db.add(ev)

    # 6. Add Audit Status History Record
    history = IncidentStatusHistory(
        id=uuid.uuid4(),
        incident_id=incident.id,
        old_status=None,
        new_status=IncidentStatus.DETECTED,
        changed_by=reviewer_id,
        comment=(
            f"Source: MANUAL_REVIEW (manual_override=true, job_id={verification.job_id}, "
            f"verification_id={verification.id}). "
            f"Operator reported {hazard_type.value}: {description or 'Undetected hazard observed by operator in flight video'}"
        ),
        changed_at=datetime.now(timezone.utc),
    )
    db.add(history)

    # 7. Update VideoVerification Record
    verification.status = VerificationStatus.ANOMALY_REPORTED
    verification.reviewer_id = reviewer_id
    verification.reviewed_at = datetime.now(timezone.utc)
    verification.review_notes = description
    verification.created_incident_id = incident.id

    db.commit()
    db.refresh(verification)
    db.refresh(incident)

    return verification, incident
