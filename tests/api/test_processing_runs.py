"""
tests/api/test_processing_runs.py
Focused unit & integration tests for Flight Inspection Run aggregation endpoints:
- GET /api/v1/process/runs
- GET /api/v1/process/runs/{job_id}

Covers the 12 core requirements:
1. Single-hazard flight
2. Multi-hazard flight
3. Mixed 5-class flight
4. Zero-hazard flight via VideoVerification
5. Zero-hazard flight with human-reported anomaly
6. Unrelated legacy/manual incidents do not get attached
7. Historical reconstruction works without ProcessingJobManager state
8. Idempotent repeated reads
9. Missing optional evidence/video does not cause failure
10. Deterministic ordering
11. No database mutations
12. Zone filtering and pagination
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest
from starlette.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.db.models.enums import (
    IncidentType,
    PriorityLevel,
    IncidentStatus,
    VerificationStatus,
    UserRole,
)
from src.db.models.incident import Incident
from src.db.models.detection import Detection
from src.db.models.evidence import Evidence
from src.db.models.verification import VideoVerification
from src.db.models.zone import Zone
from src.db.models.user import User
from src.services.processing_job_manager import job_manager


def _create_test_zone(db_session: Session, code_suffix: str = "01") -> Zone:
    unique_suffix = uuid.uuid4().hex[:6]
    zone = Zone(
        id=uuid.uuid4(),
        code=f"EC-{code_suffix}-{unique_suffix}",
        name=f"Electronics City Phase {code_suffix}",
    )
    db_session.add(zone)
    db_session.commit()
    return zone


def _create_test_user(db_session: Session) -> User:
    unique_suffix = uuid.uuid4().hex[:6]
    user = User(
        id=uuid.uuid4(),
        email=f"op_{unique_suffix}@elcia.in",
        name="Flight Test Operator",
        role=UserRole.OPERATOR,
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_single_hazard_flight(client: TestClient, db_session: Session):
    """Test 1: Single-hazard flight aggregation and detail retrieval."""
    zone = _create_test_zone(db_session, "S1")
    job_uuid = str(uuid.uuid4())
    job_prefix = job_uuid.replace("-", "")[:8].upper()

    inc = Incident(
        id=uuid.uuid4(),
        incident_code=f"INC-{job_prefix}-1",
        incident_type=IncidentType.POTHOLE,
        priority=PriorityLevel.P1,
        severity_score=8.5,
        confidence=0.92,
        status=IncidentStatus.DETECTED,
        zone_id=zone.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(inc)
    db_session.flush()

    det = Detection(
        id=uuid.uuid4(),
        incident_id=inc.id,
        detection_type="POTHOLE",
        confidence=0.92,
        frame_number=100,
        detection_metadata={"job_id": job_uuid, "hazard_id": 1},
    )
    db_session.add(det)
    db_session.commit()

    # Test list endpoint
    res = client.get("/api/v1/process/runs")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1

    run = next((r for r in data["items"] if r["job_id"] == job_uuid or r["job_prefix"] == job_prefix), None)
    assert run is not None
    assert run["total_hazards"] == 1
    assert run["class_counts"] == {"POTHOLE": 1}
    assert run["priority_counts"] == {"P1": 1}
    assert run["zone_code"] == zone.code
    assert run["has_human_report"] is False

    # Test detail endpoint with full UUID and with prefix
    res_detail = client.get(f"/api/v1/process/runs/{job_uuid}")
    assert res_detail.status_code == 200
    detail_data = res_detail.json()
    assert detail_data["summary"]["total_hazards"] == 1
    assert len(detail_data["incidents"]) == 1
    assert detail_data["incidents"][0]["incident_code"] == f"INC-{job_prefix}-1"

    # Prefix lookup
    res_prefix = client.get(f"/api/v1/process/runs/{job_prefix}")
    assert res_prefix.status_code == 200
    assert res_prefix.json()["summary"]["job_prefix"] == job_prefix


def test_multi_hazard_flight(client: TestClient, db_session: Session):
    """
    Test 2: Multi-hazard flight aggregation.
    1 flight job -> 8 potholes, 1 open manhole, 2 waterlogging (= 11 individual incidents).
    Verifies 1 physical hazard = 1 Incident database record.
    """
    zone = _create_test_zone(db_session, "M1")
    job_uuid = str(uuid.uuid4())
    job_prefix = job_uuid.replace("-", "")[:8].upper()

    hazard_specs = (
        [(IncidentType.POTHOLE, PriorityLevel.P2, 6.0)] * 8
        + [(IncidentType.OPEN_MANHOLE, PriorityLevel.P1, 9.5)] * 1
        + [(IncidentType.WATERLOGGING, PriorityLevel.P3, 4.0)] * 2
    )

    created_incidents = []
    base_time = datetime.now(timezone.utc) - timedelta(minutes=15)

    for idx, (inc_type, prio, score) in enumerate(hazard_specs, start=1):
        inc = Incident(
            id=uuid.uuid4(),
            incident_code=f"INC-{job_prefix}-{idx}",
            incident_type=inc_type,
            priority=prio,
            severity_score=score,
            confidence=0.88,
            status=IncidentStatus.DETECTED,
            zone_id=zone.id,
            created_at=base_time + timedelta(seconds=idx * 10),
        )
        db_session.add(inc)
        db_session.flush()

        det = Detection(
            id=uuid.uuid4(),
            incident_id=inc.id,
            detection_type=inc_type.value,
            confidence=0.88,
            frame_number=idx * 30,
            detection_metadata={"job_id": job_uuid, "hazard_id": idx},
        )
        db_session.add(det)
        created_incidents.append(inc)

    db_session.commit()

    # List endpoint
    res = client.get(f"/api/v1/process/runs?zone_id={zone.id}")
    assert res.status_code == 200
    data = res.json()
    run = next((r for r in data["items"] if r["job_id"] == job_uuid or r["job_prefix"] == job_prefix), None)
    assert run is not None
    assert run["total_hazards"] == 11
    assert run["class_counts"] == {
        "POTHOLE": 8,
        "OPEN_MANHOLE": 1,
        "WATERLOGGING": 2,
    }
    assert run["priority_counts"] == {
        "P1": 1,
        "P2": 8,
        "P3": 2,
    }

    # Detail endpoint
    res_detail = client.get(f"/api/v1/process/runs/{job_uuid}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["summary"]["total_hazards"] == 11
    assert len(detail["incidents"]) == 11
    # Check that each incident has distinct ID
    incident_ids = [inc["id"] for inc in detail["incidents"]]
    assert len(set(incident_ids)) == 11
    # Check ordering is 1 to 11
    codes = [inc["incident_code"] for inc in detail["incidents"]]
    assert codes == [f"INC-{job_prefix}-{i}" for i in range(1, 12)]


def test_mixed_5_class_flight(client: TestClient, db_session: Session):
    """Test 3: Mixed 5-class flight aggregation."""
    zone = _create_test_zone(db_session, "5C")
    job_uuid = str(uuid.uuid4())
    job_prefix = job_uuid.replace("-", "")[:8].upper()

    all_types = [
        IncidentType.DAMAGED_FOOTPATH,
        IncidentType.DRAINAGE_OVERFLOW,
        IncidentType.OPEN_MANHOLE,
        IncidentType.POTHOLE,
        IncidentType.WATERLOGGING,
    ]

    for idx, inc_type in enumerate(all_types, start=1):
        inc = Incident(
            id=uuid.uuid4(),
            incident_code=f"INC-{job_prefix}-{idx}",
            incident_type=inc_type,
            priority=PriorityLevel.P2,
            severity_score=7.0,
            confidence=0.90,
            status=IncidentStatus.DETECTED,
            zone_id=zone.id,
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(inc)
        db_session.flush()

        det = Detection(
            id=uuid.uuid4(),
            incident_id=inc.id,
            detection_type=inc_type.value,
            confidence=0.90,
            frame_number=idx * 50,
            detection_metadata={"job_id": job_uuid, "hazard_id": idx},
        )
        db_session.add(det)

    db_session.commit()

    res = client.get(f"/api/v1/process/runs/{job_uuid}")
    assert res.status_code == 200
    data = res.json()
    summary = data["summary"]
    assert summary["total_hazards"] == 5
    assert len(summary["class_counts"]) == 5
    for t in all_types:
        assert summary["class_counts"][t.value] == 1


def test_zero_hazard_flight_via_verification(client: TestClient, db_session: Session):
    """Test 4: Zero-hazard flight via VideoVerification record."""
    zone = _create_test_zone(db_session, "ZH")
    job_uuid = str(uuid.uuid4())

    verif = VideoVerification(
        id=uuid.uuid4(),
        job_id=job_uuid,
        video_filename="clean_flight_01.mp4",
        video_path="outputs/jobs/clean/annotated.mp4",
        status=VerificationStatus.PENDING_REVIEW,
        zone_id=zone.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(verif)
    db_session.commit()

    # List endpoint
    res = client.get("/api/v1/process/runs")
    assert res.status_code == 200
    runs = res.json()["items"]
    matched = next((r for r in runs if r["job_id"] == job_uuid), None)
    assert matched is not None
    assert matched["total_hazards"] == 0
    assert matched["class_counts"] == {}
    assert matched["priority_counts"] == {}
    assert matched["status"] == "PENDING_REVIEW"

    # Detail endpoint
    res_detail = client.get(f"/api/v1/process/runs/{job_uuid}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["summary"]["total_hazards"] == 0
    assert len(detail["incidents"]) == 0
    assert detail["verification"] is not None
    assert detail["verification"]["job_id"] == job_uuid
    assert detail["verification"]["status"] == "PENDING_REVIEW"


def test_zero_hazard_flight_with_human_reported_anomaly(client: TestClient, db_session: Session):
    """
    Test 5: Zero-hazard flight where human operator subsequently reports an anomaly.
    Preserves human-reported semantics without fabricating AI confidence.
    """
    zone = _create_test_zone(db_session, "HA")
    user = _create_test_user(db_session)
    job_uuid = str(uuid.uuid4())
    job_prefix = job_uuid.replace("-", "")[:8].upper()

    # 1. Create initial VideoVerification
    verif = VideoVerification(
        id=uuid.uuid4(),
        job_id=job_uuid,
        video_filename="flight_anomaly.mp4",
        video_path="outputs/jobs/anomaly/annotated.mp4",
        status=VerificationStatus.PENDING_REVIEW,
        zone_id=zone.id,
        created_at=datetime.now(timezone.utc) - timedelta(minutes=10),
    )
    db_session.add(verif)
    db_session.commit()

    # 2. Operator reports anomaly -> Incident created with source=HUMAN_REPORTED
    inc = Incident(
        id=uuid.uuid4(),
        incident_code=f"INC-{job_prefix}-M1001",
        incident_type=IncidentType.POTHOLE,
        priority=PriorityLevel.P1,
        severity_score=8.5,
        confidence=1.0,
        status=IncidentStatus.VERIFIED,
        zone_id=zone.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(inc)
    db_session.flush()

    verif.status = VerificationStatus.ANOMALY_REPORTED
    verif.created_incident_id = inc.id
    verif.reviewer_id = user.id
    verif.reviewed_at = datetime.now(timezone.utc)
    db_session.commit()

    # Query flight run
    res = client.get(f"/api/v1/process/runs/{job_uuid}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["summary"]["total_hazards"] == 1
    assert detail["summary"]["has_human_report"] is True
    assert detail["summary"]["status"] == "ANOMALY_REPORTED"
    assert len(detail["incidents"]) == 1

    reported_inc = detail["incidents"][0]
    assert reported_inc["incident_code"] == f"INC-{job_prefix}-M1001"
    assert reported_inc["source"] == "HUMAN_REPORTED"
    assert reported_inc["confidence"] == 1.0
    assert detail["verification"] is not None
    assert detail["verification"]["status"] == "ANOMALY_REPORTED"


def test_unrelated_legacy_incidents_not_attached(client: TestClient, db_session: Session):
    """
    Test 6: Unrelated legacy/manual incidents (e.g. EC-0142) without job_id
    are NOT fabricated into a flight run.
    """
    zone = _create_test_zone(db_session, "LEG")
    legacy_inc = Incident(
        id=uuid.uuid4(),
        incident_code="EC-0142",
        incident_type=IncidentType.POTHOLE,
        priority=PriorityLevel.P2,
        severity_score=5.0,
        confidence=0.85,
        status=IncidentStatus.DETECTED,
        zone_id=zone.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(legacy_inc)
    db_session.commit()

    # Query all runs
    res = client.get("/api/v1/process/runs")
    assert res.status_code == 200
    runs = res.json()["items"]
    for r in runs:
        assert r["job_id"] != "EC-0142"
        assert r["job_prefix"] != "EC-0142"

    # Detail lookup for non-existent run returns 404
    res_detail = client.get("/api/v1/process/runs/EC-0142")
    assert res_detail.status_code == 404


def test_historical_reconstruction_without_job_manager_memory(client: TestClient, db_session: Session):
    """
    Test 7: Historical reconstruction works after server restart.
    ProcessingJobManager.jobs in-memory dictionary is cleared.
    """
    zone = _create_test_zone(db_session, "RESTART")
    job_uuid = str(uuid.uuid4())
    job_prefix = job_uuid.replace("-", "")[:8].upper()

    inc = Incident(
        id=uuid.uuid4(),
        incident_code=f"INC-{job_prefix}-1",
        incident_type=IncidentType.DRAINAGE_OVERFLOW,
        priority=PriorityLevel.P1,
        severity_score=9.0,
        confidence=0.95,
        status=IncidentStatus.DETECTED,
        zone_id=zone.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(inc)
    db_session.flush()

    det = Detection(
        id=uuid.uuid4(),
        incident_id=inc.id,
        detection_type="DRAINAGE_OVERFLOW",
        confidence=0.95,
        frame_number=120,
        detection_metadata={"job_id": job_uuid, "hazard_id": 1},
    )
    db_session.add(det)
    db_session.commit()

    # Simulate backend restart: wipe in-memory jobs completely
    job_manager.jobs.clear()
    assert len(job_manager.jobs) == 0

    # API must still reconstruct the flight run directly from DB
    res = client.get(f"/api/v1/process/runs/{job_uuid}")
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["job_id"] == job_uuid
    assert data["summary"]["total_hazards"] == 1
    assert data["summary"]["class_counts"] == {"DRAINAGE_OVERFLOW": 1}
    assert len(data["incidents"]) == 1


def test_idempotent_repeated_reads(client: TestClient, db_session: Session):
    """Test 8: Repeated reads return identical, consistent results with no side effects."""
    zone = _create_test_zone(db_session, "IDEM")
    job_uuid = str(uuid.uuid4())
    job_prefix = job_uuid.replace("-", "")[:8].upper()

    inc = Incident(
        id=uuid.uuid4(),
        incident_code=f"INC-{job_prefix}-1",
        incident_type=IncidentType.POTHOLE,
        priority=PriorityLevel.P3,
        severity_score=4.0,
        confidence=0.80,
        status=IncidentStatus.DETECTED,
        zone_id=zone.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(inc)
    db_session.flush()
    det = Detection(
        id=uuid.uuid4(),
        incident_id=inc.id,
        detection_type="POTHOLE",
        confidence=0.80,
        frame_number=50,
        detection_metadata={"job_id": job_uuid, "hazard_id": 1},
    )
    db_session.add(det)
    db_session.commit()

    res1 = client.get(f"/api/v1/process/runs/{job_uuid}").json()
    res2 = client.get(f"/api/v1/process/runs/{job_uuid}").json()
    res3 = client.get(f"/api/v1/process/runs/{job_uuid}").json()

    assert res1 == res2 == res3


def test_missing_optional_evidence_video(client: TestClient, db_session: Session):
    """Test 9: Missing optional video/evidence files does not crash API."""
    zone = _create_test_zone(db_session, "NOVID")
    job_uuid = str(uuid.uuid4())
    job_prefix = job_uuid.replace("-", "")[:8].upper()

    inc = Incident(
        id=uuid.uuid4(),
        incident_code=f"INC-{job_prefix}-1",
        incident_type=IncidentType.WATERLOGGING,
        priority=PriorityLevel.P2,
        severity_score=6.5,
        confidence=0.87,
        status=IncidentStatus.DETECTED,
        zone_id=zone.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(inc)
    db_session.flush()

    # Evidence points to non-existent file
    ev = Evidence(
        id=uuid.uuid4(),
        incident_id=inc.id,
        evidence_type="IMAGE",
        file_path="non/existent/path/evidence_9999.jpg",
    )
    db_session.add(ev)

    det = Detection(
        id=uuid.uuid4(),
        incident_id=inc.id,
        detection_type="WATERLOGGING",
        confidence=0.87,
        frame_number=90,
        detection_metadata={"job_id": job_uuid, "hazard_id": 1},
    )
    db_session.add(det)
    db_session.commit()

    res = client.get(f"/api/v1/process/runs/{job_uuid}")
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["annotated_video_url"] is None
    assert len(data["incidents"]) == 1


def test_deterministic_ordering(client: TestClient, db_session: Session):
    """
    Test 10: Deterministic ordering:
    - Runs list ordered descending by created_at (newest first).
    - Incidents in a run ordered by hazard_id / sequence.
    """
    zone = _create_test_zone(db_session, "ORD")

    # Create 3 runs at different timestamps
    job_ids = [str(uuid.uuid4()) for _ in range(3)]
    now = datetime.now(timezone.utc)

    for i, j_id in enumerate(job_ids):
        prefix = j_id.replace("-", "")[:8].upper()
        # Create incidents in reverse sequence order
        for h_id in [3, 1, 2]:
            inc = Incident(
                id=uuid.uuid4(),
                incident_code=f"INC-{prefix}-{h_id}",
                incident_type=IncidentType.POTHOLE,
                priority=PriorityLevel.P2,
                severity_score=5.0,
                confidence=0.90,
                status=IncidentStatus.DETECTED,
                zone_id=zone.id,
                created_at=now + timedelta(hours=i, minutes=h_id),
            )
            db_session.add(inc)
            db_session.flush()

            det = Detection(
                id=uuid.uuid4(),
                incident_id=inc.id,
                detection_type="POTHOLE",
                confidence=0.90,
                frame_number=h_id * 10,
                detection_metadata={"job_id": j_id, "hazard_id": h_id},
            )
            db_session.add(det)

    db_session.commit()

    # Check list ordering: newest (job_ids[2]) should come before older ones
    res = client.get(f"/api/v1/process/runs?zone_id={zone.id}")
    assert res.status_code == 200
    runs = res.json()["items"]
    assert len(runs) == 3
    assert runs[0]["job_id"] == job_ids[2]
    assert runs[1]["job_id"] == job_ids[1]
    assert runs[2]["job_id"] == job_ids[0]

    # Check incident ordering within run: 1, 2, 3
    res_det = client.get(f"/api/v1/process/runs/{job_ids[0]}")
    assert res_det.status_code == 200
    incs = res_det.json()["incidents"]
    codes = [inc["incident_code"] for inc in incs]
    prefix0 = job_ids[0].replace("-", "")[:8].upper()
    assert codes == [f"INC-{prefix0}-1", f"INC-{prefix0}-2", f"INC-{prefix0}-3"]


def test_no_database_mutations_on_read(client: TestClient, db_session: Session):
    """Test 11: GET endpoints perform read-only aggregation with zero DB row mutations."""
    zone = _create_test_zone(db_session, "MUT")
    job_uuid = str(uuid.uuid4())
    job_prefix = job_uuid.replace("-", "")[:8].upper()

    inc = Incident(
        id=uuid.uuid4(),
        incident_code=f"INC-{job_prefix}-1",
        incident_type=IncidentType.OPEN_MANHOLE,
        priority=PriorityLevel.P1,
        severity_score=9.0,
        confidence=0.95,
        status=IncidentStatus.DETECTED,
        zone_id=zone.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(inc)
    db_session.flush()

    det = Detection(
        id=uuid.uuid4(),
        incident_id=inc.id,
        detection_type="OPEN_MANHOLE",
        confidence=0.95,
        frame_number=10,
        detection_metadata={"job_id": job_uuid, "hazard_id": 1},
    )
    db_session.add(det)
    db_session.commit()

    count_inc_before = db_session.query(func.count(Incident.id)).scalar()
    count_det_before = db_session.query(func.count(Detection.id)).scalar()
    count_ver_before = db_session.query(func.count(VideoVerification.id)).scalar()
    count_zon_before = db_session.query(func.count(Zone.id)).scalar()

    # Perform API reads
    client.get("/api/v1/process/runs")
    client.get(f"/api/v1/process/runs/{job_uuid}")
    client.get(f"/api/v1/process/runs/{job_prefix}")

    count_inc_after = db_session.query(func.count(Incident.id)).scalar()
    count_det_after = db_session.query(func.count(Detection.id)).scalar()
    count_ver_after = db_session.query(func.count(VideoVerification.id)).scalar()
    count_zon_after = db_session.query(func.count(Zone.id)).scalar()

    assert count_inc_before == count_inc_after
    assert count_det_before == count_det_after
    assert count_ver_before == count_ver_after
    assert count_zon_before == count_zon_after


def test_zone_filtering_and_pagination(client: TestClient, db_session: Session):
    """Test 12: Zone filtering and pagination (skip, limit)."""
    zone_a = _create_test_zone(db_session, "PAG_A")
    zone_b = _create_test_zone(db_session, "PAG_B")

    # Create 5 runs in zone A, 3 runs in zone B
    for i in range(5):
        j_id = str(uuid.uuid4())
        pfx = j_id.replace("-", "")[:8].upper()
        inc = Incident(
            id=uuid.uuid4(),
            incident_code=f"INC-{pfx}-1",
            incident_type=IncidentType.POTHOLE,
            priority=PriorityLevel.P2,
            severity_score=5.0,
            confidence=0.85,
            status=IncidentStatus.DETECTED,
            zone_id=zone_a.id,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=i),
        )
        db_session.add(inc)
        db_session.flush()
        det = Detection(
            id=uuid.uuid4(),
            incident_id=inc.id,
            detection_type="POTHOLE",
            confidence=0.85,
            frame_number=10,
            detection_metadata={"job_id": j_id, "hazard_id": 1},
        )
        db_session.add(det)

    for i in range(3):
        j_id = str(uuid.uuid4())
        pfx = j_id.replace("-", "")[:8].upper()
        inc = Incident(
            id=uuid.uuid4(),
            incident_code=f"INC-{pfx}-1",
            incident_type=IncidentType.WATERLOGGING,
            priority=PriorityLevel.P3,
            severity_score=4.0,
            confidence=0.80,
            status=IncidentStatus.DETECTED,
            zone_id=zone_b.id,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=i),
        )
        db_session.add(inc)
        db_session.flush()
        det = Detection(
            id=uuid.uuid4(),
            incident_id=inc.id,
            detection_type="WATERLOGGING",
            confidence=0.80,
            frame_number=10,
            detection_metadata={"job_id": j_id, "hazard_id": 1},
        )
        db_session.add(det)

    db_session.commit()

    # Filter by zone A
    res_a = client.get(f"/api/v1/process/runs?zone_id={zone_a.id}&limit=2&skip=0")
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["total"] == 5
    assert len(data_a["items"]) == 2
    assert data_a["limit"] == 2
    assert data_a["skip"] == 0

    # Page 2 for zone A
    res_a_p2 = client.get(f"/api/v1/process/runs?zone_id={zone_a.code}&limit=2&skip=2")
    assert res_a_p2.status_code == 200
    data_a_p2 = res_a_p2.json()
    assert data_a_p2["total"] == 5
    assert len(data_a_p2["items"]) == 2

    # Filter by zone B
    res_b = client.get(f"/api/v1/process/runs?zone_id={zone_b.id}")
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["total"] == 3
    assert len(data_b["items"]) == 3
