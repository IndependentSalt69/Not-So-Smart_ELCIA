"""
tests/services/test_ml_ingestion.py
Unit and integration tests for Phase 11C ML output database ingestion service.
"""

import json
import uuid
import pytest
from pathlib import Path


from src.db.models.enums import IncidentType, PriorityLevel
from src.db.models.incident import Incident
from src.db.models.detection import Detection
from src.db.models.evidence import Evidence
from src.db.models.zone import Zone
from src.repositories.incidents import get_incident, list_incidents
from src.services.ml_ingestion_service import (
    ingest_job_results,
    normalize_severity_score,
    map_priority_level,
    format_incident_code,
)


@pytest.fixture(autouse=True)
def ensure_default_zone(db_session):
    """Ensure EC-01 zone exists in SQLite test database."""
    zone = db_session.query(Zone).filter(Zone.code == "EC-01").first()
    if not zone:
        zone = Zone(
            id=uuid.uuid4(),
            code="EC-01",
            name="Electronics City Phase 1",
            description="Phase 1 test zone",
        )
        db_session.add(zone)
        db_session.commit()
    return zone


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


def test_five_class_ingestion_and_spatial_coordinates(db_session, tmp_path):
    """Test ingestion of all 5 hazard classes, GeoJSON [lon, lat] order, and sub-resource creation."""
    job_id = f"{uuid.uuid4().hex[:8]}-fiveclass"
    job_dir = tmp_path / job_id
    evidence_dir = job_dir / "evidence"
    evidence_dir.mkdir(parents=True)

    # Create dummy evidence files
    (evidence_dir / "hazard_1_CRITICAL.jpg").write_bytes(b"jpgbytes1")
    (evidence_dir / "hazard_2_HIGH.jpg").write_bytes(b"jpgbytes2")
    (evidence_dir / "hazard_3_MEDIUM.jpg").write_bytes(b"jpgbytes3")
    (evidence_dir / "hazard_4_LOW.jpg").write_bytes(b"jpgbytes4")
    (evidence_dir / "hazard_5_CRITICAL.jpg").write_bytes(b"jpgbytes5")

    telemetry = [
        {
            "hazard_id": 1,
            "frame_logged": 100,
            "timestamp_sec": 10.5,
            "latitude": 12.8452,
            "longitude": 77.6631,
            "class_name": "waterlogging",
            "confidence": 0.8742,
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
            "confidence": 0.9234,
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
            "confidence": 0.8123,
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
            "confidence": 0.7456,
            "risk_level": "LOW",
            "severity_score": 25,
            "evidence_file": "hazard_4_LOW.jpg",
        },
        {
            "hazard_id": 5,
            "frame_logged": 500,
            "timestamp_sec": 50.0,
            "latitude": 12.8470,
            "longitude": 77.6650,
            "class_name": "open_manhole",
            "confidence": 0.9678,
            "risk_level": "CRITICAL",
            "severity_score": 95,
            "evidence_file": "hazard_5_CRITICAL.jpg",
        },
    ]

    telemetry_path = job_dir / "hazard_telemetry.json"
    telemetry_path.write_text(json.dumps(telemetry))

    # Run ingestion
    summary = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")

    assert summary["total_hazards"] == 5
    assert summary["incidents_created"] == 5
    assert summary["detections_created"] == 5
    assert summary["evidence_created"] == 5
    assert summary["skipped"] == 0
    assert summary["failed"] == 0

    # Verify created incident types and real dynamic confidence scores
    prefix = format_incident_code(job_id, 1).rsplit("-", 1)[0]
    inc1 = get_incident(db_session, f"{prefix}-1")
    assert inc1 is not None
    assert inc1.incident_type == IncidentType.WATERLOGGING
    assert inc1.confidence == 0.8742
    assert inc1.severity_score == 9.0
    assert inc1.priority == PriorityLevel.P1

    inc2 = get_incident(db_session, f"{prefix}-2")
    assert inc2 is not None
    assert inc2.incident_type == IncidentType.POTHOLE
    assert inc2.confidence == 0.9234
    assert inc2.severity_score == 6.0

    inc3 = get_incident(db_session, f"{prefix}-3")
    assert inc3 is not None
    assert inc3.incident_type == IncidentType.DRAINAGE_OVERFLOW
    assert inc3.confidence == 0.8123

    inc4 = get_incident(db_session, f"{prefix}-4")
    assert inc4 is not None
    assert inc4.incident_type == IncidentType.DAMAGED_FOOTPATH
    assert inc4.confidence == 0.7456

    inc5 = get_incident(db_session, f"{prefix}-5")
    assert inc5 is not None
    assert inc5.incident_type == IncidentType.OPEN_MANHOLE
    assert inc5.confidence == 0.9678
    assert inc5.severity_score == 9.5
    assert inc5.priority == PriorityLevel.P1
    assert inc5.recommended_action == "Install immediate high-visibility barricade and dispatch sewer maintenance crew to replace manhole lid."


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
            "confidence": 0.8850,
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
            "confidence": 0.7654,
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
    assert inc.confidence == 0.7654


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
            "confidence": 0.85,
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
            "confidence": 0.8990,
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

    code = format_incident_code(job_id, 40)
    inc = get_incident(db_session, code)
    assert inc is not None
    assert inc.confidence == 0.8990


def test_missing_confidence_raises_error(db_session, tmp_path):
    """Test that missing confidence in telemetry raises ValueError and does not fallback to fake 0.95."""
    job_id = f"{uuid.uuid4().hex[:8]}-noconf"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    telemetry = [
        {
            "hazard_id": 50,
            "class_name": "waterlogging",
            "severity_score": 50,
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    with pytest.raises(ValueError, match="missing required 'confidence' field"):
        ingest_job_results(db_session, job_id, job_dir)


def test_invalid_confidence_range_raises_error(db_session, tmp_path):
    """Test that out-of-bounds confidence values raise ValueError."""
    job_id = f"{uuid.uuid4().hex[:8]}-badconf"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    telemetry = [
        {
            "hazard_id": 60,
            "class_name": "waterlogging",
            "confidence": 1.45,
            "severity_score": 50,
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    with pytest.raises(ValueError, match="out of bounds"):
        ingest_job_results(db_session, job_id, job_dir)


def test_confidence_end_to_end_propagation(db_session, tmp_path):
    """Test end-to-end propagation proving non-0.95 confidence (e.g. 0.8742) survives to DB and Detection models."""
    job_id = f"{uuid.uuid4().hex[:8]}-e2econf"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    expected_conf = 0.8742
    telemetry = [
        {
            "hazard_id": 77,
            "frame_logged": 120,
            "timestamp_sec": 4.0,
            "latitude": 12.8412,
            "longitude": 77.6638,
            "class_name": "waterlogging",
            "confidence": expected_conf,
            "risk_level": "HIGH",
            "severity_score": 75,
            "evidence_file": None,
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    summary = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")
    assert summary["incidents_created"] == 1
    assert summary["detections_created"] == 1

    code = format_incident_code(job_id, 77)
    inc = get_incident(db_session, code)
    assert inc is not None
    assert inc.confidence == expected_conf

    from src.repositories.detections import list_incident_detections
    dets = list_incident_detections(db_session, inc.id)
    assert len(dets) == 1
    assert dets[0].confidence == expected_conf


def test_real_duration_propagation_from_timestamps(db_session, tmp_path):
    """Test real hazard persistence duration derived from first_seen_sec and last_seen_sec."""
    job_id = f"{uuid.uuid4().hex[:8]}-realdur"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    telemetry = [
        {
            "hazard_id": 81,
            "frame_logged": 100,
            "timestamp_sec": 10.0,
            "first_seen_sec": 10.0,
            "last_seen_sec": 24.5,
            "duration_seconds": 14.5,
            "latitude": 12.8450,
            "longitude": 77.6630,
            "class_name": "waterlogging",
            "confidence": 0.895,
            "risk_level": "HIGH",
            "severity_score": 70,
            "evidence_file": None,
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    summary = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")
    assert summary["incidents_created"] == 1

    code = format_incident_code(job_id, 81)
    inc = get_incident(db_session, code)
    assert inc is not None
    assert inc.duration_seconds == 14.5
    assert inc.duration_seconds != 180.0


def test_short_duration_hazard_propagation(db_session, tmp_path):
    """Test short-duration hazard persistence duration (e.g. 1.0s)."""
    job_id = f"{uuid.uuid4().hex[:8]}-shortdur"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    telemetry = [
        {
            "hazard_id": 82,
            "frame_logged": 50,
            "timestamp_sec": 10.0,
            "first_seen_sec": 10.0,
            "last_seen_sec": 11.0,
            "duration_seconds": 1.0,
            "latitude": 12.8450,
            "longitude": 77.6630,
            "class_name": "pothole",
            "confidence": 0.92,
            "risk_level": "MEDIUM",
            "severity_score": 50,
            "evidence_file": None,
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    summary = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")
    assert summary["incidents_created"] == 1

    code = format_incident_code(job_id, 82)
    inc = get_incident(db_session, code)
    assert inc is not None
    assert inc.duration_seconds == 1.0


def test_missing_duration_does_not_become_180s(db_session, tmp_path):
    """Test that missing duration in telemetry results in None, never falling back to 180s."""
    job_id = f"{uuid.uuid4().hex[:8]}-nodur"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    telemetry = [
        {
            "hazard_id": 83,
            "frame_logged": 30,
            "timestamp_sec": 5.0,
            "latitude": 12.8450,
            "longitude": 77.6630,
            "class_name": "drainage_overflow",
            "confidence": 0.85,
            "risk_level": "MEDIUM",
            "severity_score": 45,
            "evidence_file": None,
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    summary = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")
    assert summary["incidents_created"] == 1

    code = format_incident_code(job_id, 83)
    inc = get_incident(db_session, code)
    assert inc is not None
    assert inc.duration_seconds is None
    assert inc.duration_seconds != 180.0


def test_derived_duration_from_first_last_seen(db_session, tmp_path):
    """Test that if duration_seconds is omitted but first/last_seen_sec exist, duration is derived."""
    job_id = f"{uuid.uuid4().hex[:8]}-deriveddur"
    job_dir = tmp_path / job_id
    job_dir.mkdir(parents=True)

    telemetry = [
        {
            "hazard_id": 84,
            "frame_logged": 30,
            "timestamp_sec": 12.4,
            "first_seen_sec": 12.4,
            "last_seen_sec": 27.8,
            "latitude": 12.8450,
            "longitude": 77.6630,
            "class_name": "open_manhole",
            "confidence": 0.98,
            "risk_level": "CRITICAL",
            "severity_score": 95,
            "evidence_file": None,
        }
    ]
    (job_dir / "hazard_telemetry.json").write_text(json.dumps(telemetry))

    summary = ingest_job_results(db_session, job_id, job_dir, zone_id="EC-01")
    assert summary["incidents_created"] == 1

    code = format_incident_code(job_id, 84)
    inc = get_incident(db_session, code)
    assert inc is not None
    assert inc.duration_seconds == 15.4
    assert inc.duration_seconds != 180.0
