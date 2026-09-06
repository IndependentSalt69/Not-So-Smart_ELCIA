"""
tests/api/test_verifications.py
Integration tests for /api/v1/verifications REST endpoints.
"""

import uuid
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from src.db.models.enums import VerificationStatus, UserRole
from src.db.models.zone import Zone
from src.db.models.user import User
from src.repositories.verifications import create_verification


def test_list_and_get_verifications_api(client: TestClient, db_session: Session):
    """Test GET /api/v1/verifications and GET /api/v1/verifications/{id}."""
    zone = Zone(
        id=uuid.uuid4(),
        code=f"EC-VAPI-{uuid.uuid4().hex[:4]}",
        name="Verification API Zone",
    )
    db_session.add(zone)
    db_session.commit()

    job_id = f"job-{uuid.uuid4()}"
    verif = create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="surveillance_test.mp4",
        video_path="outputs/jobs/test/annotated.mp4",
        annotated_video_url="/static/jobs/test/annotated.mp4",
        zone_id=zone.id,
    )

    # 1. List endpoint
    res_list = client.get("/api/v1/verifications")
    assert res_list.status_code == 200
    data_list = res_list.json()
    assert data_list["total"] >= 1
    matching = [v for v in data_list["items"] if v["job_id"] == job_id]
    assert len(matching) == 1

    # 2. Get endpoint by job_id
    res_get = client.get(f"/api/v1/verifications/{job_id}")
    assert res_get.status_code == 200
    data_get = res_get.json()
    assert data_get["id"] == str(verif.id)
    assert data_get["status"] == "PENDING_REVIEW"


def test_confirm_clear_api(client: TestClient, db_session: Session):
    """Test POST /api/v1/verifications/{job_id}/confirm-clear."""
    user = User(
        id=uuid.uuid4(),
        email=f"operator_{uuid.uuid4().hex[:4]}@elcia.in",
        name="Test Operator",
        role=UserRole.OPERATOR,
    )
    db_session.add(user)
    db_session.commit()

    job_id = f"job-{uuid.uuid4()}"
    create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="clear_flight.mp4",
        video_path="path",
    )

    payload = {
        "reviewer_id": str(user.id),
        "notes": "Flight area inspected thoroughly; all lanes clear.",
    }

    res = client.post(f"/api/v1/verifications/{job_id}/confirm-clear", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CONFIRMED_CLEAR"
    assert data["reviewer_id"] == str(user.id)
    assert data["review_notes"] == payload["notes"]


def test_report_anomaly_api(client: TestClient, db_session: Session):
    """Test POST /api/v1/verifications/{job_id}/report-anomaly with explicit GPS."""
    zone = Zone(
        id=uuid.uuid4(),
        code=f"EC-ANOM-{uuid.uuid4().hex[:4]}",
        name="Anomaly Test Zone",
    )
    user = User(
        id=uuid.uuid4(),
        email=f"operator_anom_{uuid.uuid4().hex[:4]}@elcia.in",
        name="Anomaly Operator",
        role=UserRole.OPERATOR,
    )
    db_session.add(zone)
    db_session.add(user)
    db_session.commit()

    job_id = f"job-{uuid.uuid4()}"
    create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="flight_with_pothole.mp4",
        video_path="outputs/jobs/pothole/annotated.mp4",
        zone_id=zone.id,
    )

    payload = {
        "reviewer_id": str(user.id),
        "hazard_type": "POTHOLE",
        "priority": "P1",
        "severity_score": 8.0,
        "description": "Severe edge crater missed by detector",
        "timestamp_sec": 12.0,
        "location": {
            "type": "Point",
            "coordinates": [77.675, 12.840],
        },
        "zone_id": str(zone.id),
    }

    res = client.post(f"/api/v1/verifications/{job_id}/report-anomaly", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "incident" in data
    assert "verification" in data
    assert data["verification"]["status"] == "ANOMALY_REPORTED"
    assert data["incident"]["incident_type"] == "POTHOLE"
    assert data["incident"]["priority"] == "P1"
    assert data["incident"]["severity_score"] == 8.0
    assert data["incident"]["source"] == "HUMAN_REPORTED"


def test_report_anomaly_api_rejects_missing_gps(client: TestClient, db_session: Session):
    """Test POST /api/v1/verifications/{job_id}/report-anomaly fails without location (GPS safety)."""
    job_id = f"job-{uuid.uuid4()}"
    create_verification(
        db=db_session,
        job_id=job_id,
        video_filename="flight_no_gps.mp4",
        video_path="path",
    )

    payload = {
        "hazard_type": "WATERLOGGING",
        "priority": "P2",
        "severity_score": 5.0,
        # No location provided
    }

    res = client.post(f"/api/v1/verifications/{job_id}/report-anomaly", json=payload)
    assert res.status_code == 400
    assert "GPS location is unavailable" in res.json()["detail"]
