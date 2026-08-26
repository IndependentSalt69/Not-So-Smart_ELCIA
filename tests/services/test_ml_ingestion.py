"""
tests/services/test_ml_ingestion.py
Unit and integration tests for Phase 11C ML output database ingestion service.
"""

import json
import uuid
import pytest
from pathlib import Path


from src.db.session import SessionLocal
from src.db.models.enums import IncidentType, PriorityLevel
from src.db.models.incident import Incident
from src.db.models.detection import Detection
from src.db.models.evidence import Evidence
from src.repositories.incidents import get_incident, list_incidents
from src.services.ml_ingestion_service import (
    ingest_job_results,
    normalize_severity_score,
    map_priority_level,
    format_incident_code,
)


@pytest.fixture
def db_session():
    """Provides a transactional database session for tests."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_severity_normalization():
    """Test 0-100 ML score to 0-10 backend score normalization and boundary validation."""
    assert normalize_severity_score(0) == 0.0
    assert normalize_severity_score(50) == 5.0
    assert normalize_severity_score(100) == 10.0
    assert normalize_severity_score(87.57) == 8.76

    with pytest.raises(ValueError):
        normalize_severity_score(-5)

    with pytest.raises(ValueError):
        normalize_severity_score(105)


def test_priority_mapping():
    """Test mapping of severity score and risk level strings to PriorityLevel enum."""
    assert map_priority_level(90, "CRITICAL") == PriorityLevel.P1
    assert map_priority_level(80, "HIGH") == PriorityLevel.P1
    assert map_priority_level(50, "MEDIUM") == PriorityLevel.P2
    assert map_priority_level(20, "LOW") == PriorityLevel.P3


def test_incident_code_formatting():
    """Test deterministic job-scoped incident code generation."""
    code = format_incident_code("69f15ee8-a31b-4d91-ac03-ef9799907bef", 18)
    assert code == "INC-69F15EE8-18"


def test_four_class_ingestion_and_spatial_coordinates(db_session, tmp_path):
    """Test ingestion of all 4 hazard classes, GeoJSON [lon, lat] order, and sub-resource creation."""
    job_id = f"{uuid.uuid4().hex[:8]}-fourclass"
    job_dir = tmp_path / job_id
    evidence_dir = job_dir / "evidence"
    evidence_dir.mkdir(parents=True)

    # Create dummy evidence files
    (evidence_dir / "hazard_1_CRITICAL.jpg").write_bytes(b"jpgbytes1")
    (evidence_dir / "hazard_2_HIGH.jpg").write_bytes(b"jpgbytes2")
    (evidence_dir / "hazard_3_MEDIUM.jpg").write_bytes(b"jpgbytes3")
    (evidence_dir / "hazard_4_LOW.jpg").write_bytes(b"jpgbytes4")

    telemetry = [
        {
            "hazard_id": 1,
            "frame_logged": 100,
            "timestamp_sec": 10.5,
            "latitude": 12.8452,
            "longitude": 77.6631,
            "class_name": "waterlogging",
            "risk_level": "CRITICAL",
            "severity_score": 90,
            "evidence_file": "hazard_1_CRITICAL.jpg",
        },
        {
            "hazard_id": 2,
            "frame_logged": 200,
            "timestamp_sec": 20.0,
            "latitude": 12.8455,
            "longitude": 77.6635,
            "class_name": "pothole",
            "risk_level": "HIGH",
            "severity_score": 60,
            "evidence_file": "hazard_2_HIGH.jpg",
        },
        {
            "hazard_id": 3,
            "frame_logged": 300,
            "timestamp_sec": 30.0,
            "latitude": 12.8460,
            "longitude": 77.6640,
            "class_name": "drainage_overflow",
            "risk_level": "MEDIUM",
            "severity_score": 45,
            "evidence_file": "hazard_3_MEDIUM.jpg",
        },
        {
            "hazard_id": 4,
            "frame_logged": 400,
            "timestamp_sec": 40.0,
            "latitude": 12.8465,
            "longitude": 77.6645,
            "class_name": "damaged_footpath",
            "risk_level": "LOW",
            "severity_score": 25,
            "evidence_file": "hazard_4_LOW.jpg",
        },
    ]

    telemetry_path = job_dir / "hazard_telemetry.json"
    telemetry_path.write_text(json.dumps(telemetry))

    # Run ingestion
    summary = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")

    assert summary["total_hazards"] == 4
    assert summary["incidents_created"] == 4
    assert summary["detections_created"] == 4
    assert summary["evidence_created"] == 4
    assert summary["skipped"] == 0
    assert summary["failed"] == 0

    # Verify created incident types
    prefix = format_incident_code(job_id, 1).rsplit("-", 1)[0]
    inc1 = get_incident(db_session, f"{prefix}-1")
    assert inc1 is not None
    assert inc1.incident_type == IncidentType.WATERLOGGING
    assert inc1.severity_score == 9.0
    assert inc1.priority == PriorityLevel.P1

    inc2 = get_incident(db_session, f"{prefix}-2")
    assert inc2 is not None
    assert inc2.incident_type == IncidentType.POTHOLE
    assert inc2.severity_score == 6.0

    inc3 = get_incident(db_session, f"{prefix}-3")
    assert inc3 is not None
    assert inc3.incident_type == IncidentType.DRAINAGE_OVERFLOW

    inc4 = get_incident(db_session, f"{prefix}-4")
    assert inc4 is not None
    assert inc4.incident_type == IncidentType.DAMAGED_FOOTPATH


def test_idempotent_duplicate_ingestion(db_session, tmp_path):
    """Verify running ingestion twice on the same job produces 0 duplicate records."""
    job_id = f"{uuid.uuid4().hex[:8]}-idempotent"
    job_dir = tmp_path / job_id
    evidence_dir = job_dir / "evidence"
    evidence_dir.mkdir(parents=True)
    (evidence_dir / "hazard_10_CRITICAL.jpg").write_bytes(b"jpgbytes")

    telemetry = [
        {
            "hazard_id": 10,
            "frame_logged": 500,
            "timestamp_sec": 50.0,
            "latitude": 12.8450,
            "longitude": 77.6630,
            "class_name": "pothole",
            "risk_level": "CRITICAL",
            "severity_score": 85,
            "evidence_file": "hazard_10_CRITICAL.jpg",
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    # First ingestion
    sum1 = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")
    assert sum1["incidents_created"] == 1
    assert sum1["skipped"] == 0

    # Count incidents
    count_before = len(list_incidents(db_session))

    # Second ingestion (identical job)
    sum2 = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")
    assert sum2["incidents_created"] == 0
    assert sum2["skipped"] == 1

    count_after = len(list_incidents(db_session))
    assert count_before == count_after, "Database incident row count must not increase on duplicate ingestion."


def test_null_gps_location_handling(db_session, tmp_path):
    """Test ingestion when latitude and longitude are null or 0.0."""
    job_id = f"{uuid.uuid4().hex[:8]}-nullgps"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    telemetry = [
        {
            "hazard_id": 20,
            "frame_logged": 150,
            "timestamp_sec": 15.0,
            "latitude": None,
            "longitude": None,
            "class_name": "waterlogging",
            "risk_level": "MEDIUM",
            "severity_score": 40,
            "evidence_file": None,
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    summary = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")
    assert summary["incidents_created"] == 1
    assert summary["missing_gps"] == 1

    code = format_incident_code(job_id, 20)
    inc = get_incident(db_session, code)
    assert inc is not None
    assert inc.location is None


def test_missing_telemetry_file(db_session, tmp_path):
    """Test that missing hazard_telemetry.json raises FileNotFoundError."""
    job_id = f"{uuid.uuid4().hex[:8]}-missing"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    with pytest.raises(FileNotFoundError):
        ingest_job_results(db_session, job_id, job_dir)


def test_malformed_telemetry_json(db_session, tmp_path):
    """Test that malformed JSON telemetry file raises ValueError."""
    job_id = f"{uuid.uuid4().hex[:8]}-malformed"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)
    (job_dir / "hazard_telemetry.json").write_text("{invalid json format...")

    with pytest.raises(ValueError):
        ingest_job_results(db_session, job_id, job_dir)


def test_invalid_hazard_class(db_session, tmp_path):
    """Test that an invalid class name raises ValueError."""
    job_id = f"{uuid.uuid4().hex[:8]}-invalidcls"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    telemetry = [
        {
            "hazard_id": 30,
            "class_name": "alien_spacecraft",
            "severity_score": 50,
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    with pytest.raises(ValueError):
        ingest_job_results(db_session, job_id, job_dir)


def test_missing_evidence_file_skips_evidence_record(db_session, tmp_path):
    """Test that referencing a non-existent evidence file skips Evidence creation without breaking Incident/Detection."""
    job_id = f"{uuid.uuid4().hex[:8]}-misev"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    telemetry = [
        {
            "hazard_id": 40,
            "frame_logged": 100,
            "timestamp_sec": 10.0,
            "latitude": 12.8450,
            "longitude": 77.6630,
            "class_name": "pothole",
            "risk_level": "HIGH",
            "severity_score": 60,
            "evidence_file": "non_existent_file_999.jpg",
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    summary = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")
    assert summary["incidents_created"] == 1
    assert summary["detections_created"] == 1
    assert summary["evidence_created"] == 0


