"""
tests/repositories/test_verifications.py
Unit tests for VideoVerification repository functions and human review workflows.
"""

import uuid
from pathlib import Path
from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session

from src.db.models.enums import VerificationStatus, IncidentType, PriorityLevel, IncidentStatus, UserRole, EvidenceType
from src.db.models.zone import Zone
from src.db.models.user import User
from src.db.models.verification import VideoVerification
from src.db.models.incident import Incident
from src.core.config import settings
from src.repositories.verifications import (
    create_verification,
    get_verification,
    list_verifications,
    count_verifications,
    confirm_verification_clear,
    report_verification_anomaly,
)


@pytest.fixture
def sample_zone(db_session: Session) -> Zone:
    unique_suffix = uuid.uuid4().hex[:6]
    zone = Zone(
        id=uuid.uuid4(),
        code=f"EC-VERIF-{unique_suffix}",
        name=f"Verification Zone {unique_suffix}",
    )
    db_session.add(zone)
    db_session.commit()
    return zone


@pytest.fixture
def sample_reviewer(db_session: Session) -> User:
    unique_suffix = uuid.uuid4().hex[:6]
    user = User(
        id=uuid.uuid4(),
        email=f"reviewer_{unique_suffix}@elcia.in",
        name="QA Reviewer",
        role=UserRole.OPERATOR,
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_zero_detection_verification_contains_source_video(db_session: Session, sample_zone: Zone):
    """1. Test that zero-detection verification record retains source video and metadata."""
    job_id = f"job-{uuid.uuid4()}"
    verif = create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="drone_flight_raw.mp4",
        video_path=f"uploads/{job_id}/drone_flight_raw.mp4",
        annotated_video_url=f"/static/jobs/{job_id}/annotated_output.mp4",
        telemetry_path=f"outputs/jobs/{job_id}/hazard_telemetry.json",
        zone_id=sample_zone.id,
        drone_id="DRONE-ALPHA-1",
        ai_hazard_count=0,
    )

    assert verif.id is not None
    assert verif.job_id == job_id
    assert verif.video_filename == "drone_flight_raw.mp4"
    assert verif.video_path == f"uploads/{job_id}/drone_flight_raw.mp4"
    assert verif.annotated_video_url == f"/static/jobs/{job_id}/annotated_output.mp4"
    assert verif.status == VerificationStatus.PENDING_REVIEW
    assert verif.ai_hazard_count == 0


def test_list_and_count_verifications(db_session: Session, sample_zone: Zone):
    """Test filtering and counting video verifications."""
    job1 = f"job-{uuid.uuid4()}"
    job2 = f"job-{uuid.uuid4()}"

    v1 = create_verification(
        db=db_session,
        job_id=job1,
        video_filename="clip1.mp4",
        video_path="path1",
        zone_id=sample_zone.id,
    )
    v2 = create_verification(
        db=db_session,
        job_id=job2,
        video_filename="clip2.mp4",
        video_path="path2",
        zone_id=sample_zone.id,
    )

    all_verifs = list_verifications(db_session)
    assert len(all_verifs) >= 2

    pending_count = count_verifications(db_session, status=VerificationStatus.PENDING_REVIEW)
    assert pending_count >= 2


def test_confirm_verification_clear(db_session: Session, sample_zone: Zone, sample_reviewer: User):
    """Test confirming a flight as clear (no anomalies) with notes and reviewer info."""
    job_id = f"job-{uuid.uuid4()}"
    verif = create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="flight.mp4",
        video_path="path",
        zone_id=sample_zone.id,
    )

    confirmed = confirm_verification_clear(
        db=db_session,
        verification_id_or_job_id=verif.id,
        reviewer_id=sample_reviewer.id,
        notes="Reviewed 100% of footage; roadway completely dry and unobstructed.",
    )

    assert confirmed.status == VerificationStatus.CONFIRMED_CLEAR
    assert confirmed.reviewer_id == sample_reviewer.id
    assert confirmed.reviewed_at is not None
    assert "roadway completely dry" in confirmed.review_notes
    assert confirmed.created_incident_id is None


def test_report_anomaly_carries_source_job_and_video(
    db_session: Session, sample_zone: Zone, sample_reviewer: User, tmp_path: Path, monkeypatch
):
    """2 & 3 & 4. Test report-anomaly carries source job/video info and creates video evidence."""
    job_id = f"job-{uuid.uuid4()}"
    
    # Create mock annotated output video on disk
    mock_jobs_dir = tmp_path / "jobs"
    mock_job_dir = mock_jobs_dir / job_id
    mock_job_dir.mkdir(parents=True, exist_ok=True)
    annotated_file = mock_job_dir / "annotated_output.mp4"
    annotated_file.write_bytes(b"MOCK_VIDEO_DATA")

    monkeypatch.setattr(settings, "JOBS_DIR", str(mock_jobs_dir))

    verif = create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="flight.mp4",
        video_path=f"uploads/{job_id}/flight.mp4",
        annotated_video_url=f"/static/jobs/{job_id}/annotated_output.mp4",
        zone_id=sample_zone.id,
    )

    location_point = {
        "type": "Point",
        "coordinates": [77.675, 12.840],
    }

    updated_verif, incident = report_verification_anomaly(
        db=db_session,
        verification_id_or_job_id=job_id,
        hazard_type=IncidentType.POTHOLE,
        priority=PriorityLevel.P1,
        severity_score=7.5,
        location=location_point,
        description="Deep structural crater spotted in flight footage",
        timestamp_sec=14.5,
        zone_id=sample_zone.id,
        reviewer_id=sample_reviewer.id,
    )

    assert updated_verif.status == VerificationStatus.ANOMALY_REPORTED
    assert updated_verif.created_incident_id == incident.id

    # Verify incident properties
    assert incident.incident_type == IncidentType.POTHOLE
    assert incident.priority == PriorityLevel.P1
    assert incident.severity_score == 7.5
    assert incident.confidence == 1.0
    assert incident.source == "HUMAN_REPORTED"
    assert incident.status == IncidentStatus.DETECTED

    # 3. Manual incident receives video evidence
    assert len(incident.evidence) == 1
    ev = incident.evidence[0]
    assert ev.evidence_type == EvidenceType.VIDEO
    assert ev.is_primary is True
    # 4. Evidence points to the existing source flight video path
    assert ev.file_path == f"/static/jobs/{job_id}/annotated_output.mp4"


def test_manual_incident_marked_manual_override_and_no_fake_detection(
    db_session: Session, sample_zone: Zone, sample_reviewer: User
):
    """5 & 6. Test manual incident is marked manual_override and no fake AI detection is created."""
    job_id = f"job-{uuid.uuid4()}"
    verif = create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="flight.mp4",
        video_path="path",
        zone_id=sample_zone.id,
    )

    location_point = {
        "type": "Point",
        "coordinates": [77.675, 12.840],
    }

    updated_verif, incident = report_verification_anomaly(
        db=db_session,
        verification_id_or_job_id=job_id,
        hazard_type=IncidentType.WATERLOGGING,
        priority=PriorityLevel.P2,
        severity_score=6.0,
        location=location_point,
        description="Water ponding observed by reviewer",
        zone_id=sample_zone.id,
        reviewer_id=sample_reviewer.id,
    )

    # 6. No fake AI detection is created
    assert len(incident.detections) == 0

    # 5. Manual incident is marked manual_override in audit history
    assert len(incident.status_history) >= 1
    history_comment = incident.status_history[0].comment
    assert "Source: MANUAL_REVIEW" in history_comment
    assert "manual_override=true" in history_comment
    assert job_id in history_comment


def test_missing_source_video_handled_safely(db_session: Session, sample_zone: Zone, sample_reviewer: User):
    """7. Test that when no source video exists on disk, incident creation succeeds safely without fake evidence."""
    job_id = f"job-nonexistent-{uuid.uuid4()}"
    verif = create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="nonexistent.mp4",
        video_path=f"uploads/{job_id}/nonexistent.mp4",
        zone_id=sample_zone.id,
    )

    location_point = {
        "type": "Point",
        "coordinates": [77.675, 12.840],
    }

    updated_verif, incident = report_verification_anomaly(
        db=db_session,
        verification_id_or_job_id=job_id,
        hazard_type=IncidentType.OPEN_MANHOLE,
        priority=PriorityLevel.P1,
        severity_score=9.0,
        location=location_point,
        description="Missing lid observed",
        zone_id=sample_zone.id,
        reviewer_id=sample_reviewer.id,
    )

    assert updated_verif.status == VerificationStatus.ANOMALY_REPORTED
    assert incident.id is not None
    # No non-existent video was attached as evidence
    assert len(incident.evidence) == 0


def test_report_anomaly_fails_without_location_safety(db_session: Session, sample_zone: Zone):
    """Verify that attempting to report anomaly without location coordinates raises an error (GPS Safety Guarantee)."""
    job_id = f"job-{uuid.uuid4()}"
    verif = create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="flight.mp4",
        video_path="path",
        zone_id=sample_zone.id,
    )

    with pytest.raises(ValueError, match="GPS location is unavailable"):
        report_verification_anomaly(
            db=db_session,
            verification_id_or_job_id=job_id,
            hazard_type=IncidentType.WATERLOGGING,
            location=None,  # Missing location
        )
