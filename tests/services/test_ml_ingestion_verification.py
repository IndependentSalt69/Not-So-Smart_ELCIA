"""
tests/services/test_ml_ingestion_verification.py
Tests verifying that VideoVerification records are created ONLY when incidents_created == 0.
"""

import json
import uuid
from pathlib import Path
import pytest
from sqlalchemy.orm import Session

from src.db.models.zone import Zone
from src.db.models.verification import VideoVerification
from src.db.models.incident import Incident
from src.services.ml_ingestion_service import ingest_job_results


@pytest.fixture
def test_zone(db_session: Session) -> Zone:
    unique_suffix = uuid.uuid4().hex[:6]
    zone = Zone(
        id=uuid.uuid4(),
        code=f"EC-INGEST-{unique_suffix}",
        name="Ingestion Test Zone",
    )
    db_session.add(zone)
    db_session.commit()
    return zone


def test_zero_incidents_creates_video_verification(tmp_path: Path, db_session: Session, test_zone: Zone):
    """When ML output has zero hazards, a VideoVerification record is created in PENDING_REVIEW."""
    job_id = f"job-zero-{uuid.uuid4().hex[:8]}"
    out_dir = tmp_path / "output_zero"
    out_dir.mkdir(parents=True, exist_ok=True)
    telemetry_file = out_dir / "hazard_telemetry.json"
    telemetry_file.write_text("[]")  # 0 hazards

    summary = ingest_job_results(
        db=db_session,
        job_id=job_id,
        output_dir=out_dir,
        zone_id=test_zone.id,
    )

    assert summary["total_hazards"] == 0
    assert summary["incidents_created"] == 0
    assert "verification_id" in summary
    assert summary["verification_status"] == "PENDING_REVIEW"

    # Verify DB has the verification record
    verif = db_session.query(VideoVerification).filter(VideoVerification.job_id == job_id).first()
    assert verif is not None
    assert str(verif.id) == summary["verification_id"]
    assert verif.status.value == "PENDING_REVIEW"
    assert verif.ai_hazard_count == 0


def test_hazards_detected_does_not_create_video_verification(tmp_path: Path, db_session: Session, test_zone: Zone):
    """When ML creates incidents (>0), VideoVerification is NOT created (Scope restriction)."""
    job_id = f"job-hazards-{uuid.uuid4().hex[:8]}"
    out_dir = tmp_path / "output_hazards"
    out_dir.mkdir(parents=True, exist_ok=True)
    telemetry_file = out_dir / "hazard_telemetry.json"
    
    hazard_item = {
        "hazard_id": 1,
        "class_name": "pothole",
        "confidence": 0.88,
        "severity_score": 6.5,
        "risk_level": "HIGH",
        "latitude": 12.840,
        "longitude": 77.675,
        "frame_logged": 45,
    }
    telemetry_file.write_text(json.dumps([hazard_item]))

    summary = ingest_job_results(
        db=db_session,
        job_id=job_id,
        output_dir=out_dir,
        zone_id=test_zone.id,
    )

    assert summary["total_hazards"] == 1
    assert summary["incidents_created"] == 1
    assert "verification_id" not in summary

    # Verify no VideoVerification was created
    verif = db_session.query(VideoVerification).filter(VideoVerification.job_id == job_id).first()
    assert verif is None
