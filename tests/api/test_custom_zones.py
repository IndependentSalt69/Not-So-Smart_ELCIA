"""
tests/api/test_custom_zones.py
Targeted test suite for the 'Other / Custom Zone' feature:
- Predefined zone incident creation & queries
- Custom zone incident creation with valid custom_zone_name
- Rejection of null/empty custom_zone_name when zone_id is omitted
- Filtering by OTHER zone across incidents
- Custom zone handling in analytics summary & zone aggregation
- Anomaly reporting with custom_zone_name
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.db.models.user import User
from src.db.models.enums import UserRole
from src.repositories.verifications import create_verification


def test_create_incident_with_predefined_zone(client: TestClient):
    """Verify standard predefined zone creation works as before."""
    # 1. Get or create a predefined zone
    zone_resp = client.post(
        "/api/v1/zones/",
        json={"code": f"EC-TEST-{uuid.uuid4().hex[:4].upper()}", "name": "Predefined Test Zone", "description": "Standard zone"},
    )
    assert zone_resp.status_code == 201
    zone_id = zone_resp.json()["id"]

    # 2. Create incident in predefined zone
    code = f"INC-PRE-{uuid.uuid4().hex[:6]}"
    payload = {
        "incident_code": code,
        "incident_type": "WATERLOGGING",
        "confidence": 0.95,
        "severity_score": 8.0,
        "priority": "P1",
        "zone_id": zone_id,
        "location": {"type": "Point", "coordinates": [77.6650, 12.8450]},
        "description": "Predefined zone waterlogging",
    }
    resp = client.post("/api/v1/incidents/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["zone_id"] == zone_id
    assert data["custom_zone_name"] is None


def test_create_incident_with_custom_zone_success(client: TestClient):
    """Verify incident with zone_id=None and valid custom_zone_name is accepted."""
    code = f"INC-CUST-{uuid.uuid4().hex[:6]}"
    payload = {
        "incident_code": code,
        "zone_id": None,
        "custom_zone_name": "  Electronic City Elevated Tollway  ",
        "incident_type": "POTHOLE",
        "confidence": 0.88,
        "severity_score": 6.5,
        "priority": "P2",
        "location": {"type": "Point", "coordinates": [77.6710, 12.8520]},
        "description": "Pothole on custom tollway corridor",
    }
    resp = client.post("/api/v1/incidents/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["zone_id"] is None
    assert data["custom_zone_name"] == "Electronic City Elevated Tollway"
    assert data["zone_code"] == "OTHER"
    assert data["zone_name"] == "Electronic City Elevated Tollway"


def test_create_incident_custom_zone_validation_rejection(client: TestClient):
    """Verify omitting custom_zone_name when zone_id is None returns HTTP 400."""
    code = f"INC-FAIL-{uuid.uuid4().hex[:6]}"
    payload = {
        "incident_code": code,
        "zone_id": None,
        "custom_zone_name": None,
        "incident_type": "DRAINAGE_OVERFLOW",
        "confidence": 0.90,
        "severity_score": 7.0,
        "priority": "P2",
        "location": {"type": "Point", "coordinates": [77.6600, 12.8400]},
        "description": "Drainage overflow without custom zone name",
    }
    resp = client.post("/api/v1/incidents/", json=payload)
    assert resp.status_code == 400
    assert "custom zone name is required" in resp.json()["detail"].lower()

    # Also test whitespace-only custom_zone_name
    code_ws = f"INC-FAILWS-{uuid.uuid4().hex[:6]}"
    payload_whitespace = {
        "incident_code": code_ws,
        "zone_id": None,
        "custom_zone_name": "   ",
        "incident_type": "DRAINAGE_OVERFLOW",
        "confidence": 0.90,
        "severity_score": 7.0,
        "priority": "P2",
        "location": {"type": "Point", "coordinates": [77.6600, 12.8400]},
    }
    resp_ws = client.post("/api/v1/incidents/", json=payload_whitespace)
    assert resp_ws.status_code == 400


def test_filter_incidents_by_other_zone(client: TestClient):
    """Verify filtering incidents by zone_id='OTHER' returns custom-zone incidents."""
    custom_name = f"Unique Custom Zone {uuid.uuid4().hex[:6]}"
    code = f"INC-OTHER-{uuid.uuid4().hex[:6]}"
    create_resp = client.post(
        "/api/v1/incidents/",
        json={
            "incident_code": code,
            "zone_id": None,
            "custom_zone_name": custom_name,
            "incident_type": "OPEN_MANHOLE",
            "confidence": 0.92,
            "severity_score": 8.5,
            "priority": "P1",
            "location": {"type": "Point", "coordinates": [77.6580, 12.8390]},
            "description": "Uncovered drain outside zones",
        },
    )
    assert create_resp.status_code == 201

    # Filter with zone_id=OTHER
    resp = client.get("/api/v1/incidents/?zone_id=OTHER")
    assert resp.status_code == 200
    data = resp.json()
    items = data.get("items", [])
    assert len(items) > 0
    assert any(i.get("custom_zone_name") == custom_name for i in items)
    assert all(i.get("zone_id") is None for i in items)


def test_analytics_includes_custom_zones(client: TestClient):
    """Verify analytics endpoints include custom zone incidents."""
    # Create custom zone incident first
    code = f"INC-ANALYTICS-{uuid.uuid4().hex[:6]}"
    client.post(
        "/api/v1/incidents/",
        json={
            "incident_code": code,
            "zone_id": None,
            "custom_zone_name": "Analytics Custom Zone",
            "incident_type": "WATERLOGGING",
            "confidence": 0.89,
            "severity_score": 7.5,
            "priority": "P1",
            "location": {"type": "Point", "coordinates": [77.6550, 12.8350]},
        },
    )

    # 1. Summary endpoint reflects active incidents
    sum_resp = client.get("/api/v1/analytics/summary")
    assert sum_resp.status_code == 200
    summary_data = sum_resp.json()
    assert "kpis" in summary_data
    assert summary_data["kpis"]["total_active_incidents"] >= 1

    # 2. Zones analytics endpoint groups custom zones into 'Other / Custom Zones'
    zones_resp = client.get("/api/v1/analytics/zones")
    assert zones_resp.status_code == 200
    zones_list = zones_resp.json()
    other_entry = next((z for z in zones_list if z["zone_code"] == "OTHER"), None)
    assert other_entry is not None
    assert other_entry["zone_name"] == "Other / Custom Zones"
    assert other_entry["zone_id"] is None
    assert other_entry["active_incidents"] >= 1


def test_report_anomaly_with_custom_zone(client: TestClient, db_session: Session):
    """Verify report_verification_anomaly correctly sets custom_zone_name."""
    user = User(
        id=uuid.uuid4(),
        email=f"operator_cust_{uuid.uuid4().hex[:4]}@elcia.in",
        name="Custom Zone Operator",
        role=UserRole.OPERATOR,
    )
    db_session.add(user)
    db_session.commit()

    test_job_id = f"job-custom-{uuid.uuid4().hex[:8]}"
    create_verification(
        db=db_session,
        job_id=test_job_id,
        video_filename="custom_flight.mp4",
        video_path="uploads/custom_flight.mp4",
        zone_id=None,
        custom_zone_name="Ananth Nagar Outer Road",
    )

    anomaly_payload = {
        "reviewer_id": str(user.id),
        "hazard_type": "WATERLOGGING",
        "priority": "P1",
        "severity_score": 8.0,
        "location": {"type": "Point", "coordinates": [77.6520, 12.8310]},
        "zone_id": "OTHER",
        "custom_zone_name": "Ananth Nagar Outer Road",
        "description": "Water pooled across 4 lanes outside predefined zones",
    }
    resp = client.post(f"/api/v1/verifications/{test_job_id}/report-anomaly", json=anomaly_payload)
    assert resp.status_code == 201
    result = resp.json()
    assert result["verification"]["status"] == "ANOMALY_REPORTED"
    assert result["verification"]["custom_zone_name"] == "Ananth Nagar Outer Road"
    assert result["incident"]["custom_zone_name"] == "Ananth Nagar Outer Road"
    assert result["incident"]["zone_id"] is None
    assert result["incident"]["zone_code"] == "OTHER"
