"""
tests/api/test_api.py
Comprehensive API test suite using FastAPI TestClient for CivicPulse endpoints:
Health, Zones, Users, Incidents, Evidence, Detections, Assignments, Inspections, and Status History.
"""

import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.db.models.enums import IncidentStatus


def test_health_endpoint(client: TestClient):
    """Test GET /health returns expected status and database details."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "app_name" in data
    assert "environment" in data
    assert "version" in data
    assert "timestamp" in data
    assert "database" in data
    assert "status" in data["database"]


def test_zones_api_flow(client: TestClient):
    """Test Zone creation, listing, retrieval by ID/code, and missing zone handling."""
    # 1. Create Zone
    payload = {
        "code": "API-Z-01",
        "name": "Hosur Road Phase 1",
        "description": "Primary tech corridor zone",
    }
    create_resp = client.post("/api/v1/zones/", json=payload)
    assert create_resp.status_code == 201
    zone_data = create_resp.json()
    assert zone_data["code"] == "API-Z-01"
    assert "id" in zone_data

    zone_id = zone_data["id"]

    # 2. Get Zone by ID
    get_resp = client.get(f"/api/v1/zones/{zone_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == zone_id

    # 3. Get Zone by code
    get_code_resp = client.get("/api/v1/zones/API-Z-01")
    assert get_code_resp.status_code == 200
    assert get_code_resp.json()["id"] == zone_id

    # 4. List Zones
    list_resp = client.get("/api/v1/zones/")
    assert list_resp.status_code == 200
    zones = list_resp.json()
    assert any(z["id"] == zone_id for z in zones)

    # 5. Non-existent zone 404
    missing_resp = client.get(f"/api/v1/zones/{uuid.uuid4()}")
    assert missing_resp.status_code == 404

    # 6. Duplicate zone code 400
    dup_resp = client.post("/api/v1/zones/", json=payload)
    assert dup_resp.status_code == 400


def test_users_api_flow(client: TestClient):
    """Test User creation, filtering, retrieval, missing user 404, and duplicate email 400."""
    payload = {
        "name": "Dispatcher One",
        "email": "dispatcher.one@elcia.in",
        "role": "OPERATOR",
        "is_active": True,
    }
    create_resp = client.post("/api/v1/users/", json=payload)
    assert create_resp.status_code == 201
    user_data = create_resp.json()
    assert user_data["email"] == "dispatcher.one@elcia.in"
    user_id = user_data["id"]

    # Get User
    get_resp = client.get(f"/api/v1/users/{user_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Dispatcher One"

    # List Users with role filter
    list_resp = client.get("/api/v1/users/?role=OPERATOR")
    assert list_resp.status_code == 200
    users = list_resp.json()
    assert len(users) >= 1

    # Missing User 404
    assert client.get(f"/api/v1/users/{uuid.uuid4()}").status_code == 404

    # Duplicate User 400
    assert client.post("/api/v1/users/", json=payload).status_code == 400


def test_incidents_and_subresources_api_flow(client: TestClient):
    """Test Incident creation, listing, filtering, patching, status patching, evidence, detections, assignments, inspections, and status history."""
    # Create Zone and User first
    z_resp = client.post("/api/v1/zones/", json={"code": "INC-Z-01", "name": "Incident Zone"})
    assert z_resp.status_code == 201
    zone_id = z_resp.json()["id"]

    u_resp = client.post("/api/v1/users/", json={"name": "Field Op", "email": "fieldop@elcia.in", "role": "INSPECTOR"})
    assert u_resp.status_code == 201
    user_id = u_resp.json()["id"]

    # 1. Create Incident
    inc_payload = {
        "incident_code": "INC-API-101",
        "incident_type": "WATERLOGGING",
        "confidence": 0.94,
        "severity_score": 8.2,
        "priority": "P1",
        "zone_id": zone_id,
        "status": "DETECTED",
        "recommended_action": "Clear storm drain blockage",
    }
    create_inc_resp = client.post("/api/v1/incidents/", json=inc_payload)
    assert create_inc_resp.status_code == 201
    inc_data = create_inc_resp.json()
    inc_id = inc_data["id"]
    assert inc_data["incident_code"] == "INC-API-101"

    # 2. Get Incident by ID & code
    assert client.get(f"/api/v1/incidents/{inc_id}").status_code == 200
    assert client.get("/api/v1/incidents/INC-API-101").status_code == 200
    assert client.get(f"/api/v1/incidents/{uuid.uuid4()}").status_code == 404

    # 3. List Incidents with filtering, pagination & sorting
    list_inc_resp = client.get(f"/api/v1/incidents/?status=DETECTED&priority=P1&zone_id={zone_id}&sort_by=created_at&order=desc")
    assert list_inc_resp.status_code == 200
    list_data = list_inc_resp.json()
    assert list_data["total"] >= 1
    assert any(item["id"] == inc_id for item in list_data["items"])

    # 4. Patch Incident
    patch_resp = client.patch(f"/api/v1/incidents/{inc_id}", json={"severity_score": 9.0})
    assert patch_resp.status_code == 200
    assert patch_resp.json()["severity_score"] == 9.0

    # 5. Patch Incident Status (records status history audit entry)
    status_resp = client.patch(
        f"/api/v1/incidents/{inc_id}/status",
        json={"status": "VERIFIED", "changed_by": user_id, "comment": "Inspector confirmed 20cm water depth"},
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "VERIFIED"

    # 6. Status History Sub-resource
    hist_resp = client.get(f"/api/v1/incidents/{inc_id}/history")
    assert hist_resp.status_code == 200
    histories = hist_resp.json()
    assert len(histories) == 1
    assert histories[0]["new_status"] == "VERIFIED"
    assert histories[0]["comment"] == "Inspector confirmed 20cm water depth"

    # 7. Evidence Sub-resource
    ev_payload = {
        "evidence_type": "IMAGE",
        "file_path": "outputs/evidence/frame_101.jpg",
        "description": "High resolution snapshot",
        "is_primary": True,
    }
    ev_create = client.post(f"/api/v1/incidents/{inc_id}/evidence", json=ev_payload)
    assert ev_create.status_code == 201
    assert ev_create.json()["file_path"] == "outputs/evidence/frame_101.jpg"

    ev_list = client.get(f"/api/v1/incidents/{inc_id}/evidence")
    assert ev_list.status_code == 200
    assert len(ev_list.json()) == 1

    # 8. Detections Sub-resource
    det_payload = {
        "detection_type": "waterlogging",
        "confidence": 0.94,
        "frame_number": 42,
        "detection_metadata": {"area_sq_m": 12.5},
    }
    det_create = client.post(f"/api/v1/incidents/{inc_id}/detections", json=det_payload)
    assert det_create.status_code == 201
    assert det_create.json()["confidence"] == 0.94

    det_list = client.get(f"/api/v1/incidents/{inc_id}/detections")
    assert det_list.status_code == 200
    assert len(det_list.json()) == 1

    # 9. Assignments Sub-resource
    as_payload = {
        "assigned_to": user_id,
        "assigned_team": "Drainage Alpha",
        "notes": "Deploy pump truck",
    }
    as_create = client.post(f"/api/v1/incidents/{inc_id}/assignments", json=as_payload)
    assert as_create.status_code == 201
    assert as_create.json()["assigned_team"] == "Drainage Alpha"

    as_list = client.get(f"/api/v1/incidents/{inc_id}/assignments")
    assert as_list.status_code == 200
    assert len(as_list.json()) == 1

    # 10. Inspections Sub-resource
    # Test non-existent evidence_id returns 404
    bad_ev_id = str(uuid.uuid4())
    bad_insp_payload = {
        "inspector_id": user_id,
        "result": "RESOLVED",
        "notes": "Invalid evidence link",
        "evidence_id": bad_ev_id,
    }
    bad_insp_resp = client.post(f"/api/v1/incidents/{inc_id}/inspections", json=bad_insp_payload)
    assert bad_insp_resp.status_code == 404
    assert "Evidence" in bad_insp_resp.json()["detail"]

    insp_payload = {
        "inspector_id": user_id,
        "result": "RESOLVED",
        "notes": "Drain cleared and verified clear flow.",
    }
    insp_create = client.post(f"/api/v1/incidents/{inc_id}/inspections", json=insp_payload)
    assert insp_create.status_code == 201
    assert insp_create.json()["result"] == "RESOLVED"

    insp_list = client.get(f"/api/v1/incidents/{inc_id}/inspections")
    assert insp_list.status_code == 200
    assert len(insp_list.json()) == 1

    # 11. 404 Checks on Sub-resources for Missing Incidents
    fake_id = str(uuid.uuid4())
    assert client.get(f"/api/v1/incidents/{fake_id}/evidence").status_code == 404
    assert client.get(f"/api/v1/incidents/{fake_id}/detections").status_code == 404
    assert client.get(f"/api/v1/incidents/{fake_id}/assignments").status_code == 404
    assert client.get(f"/api/v1/incidents/{fake_id}/inspections").status_code == 404
    assert client.get(f"/api/v1/incidents/{fake_id}/history").status_code == 404


def test_all_five_incident_types_api_flow(client: TestClient):
    """Test full API support for all 5 canonical hazard classes: WATERLOGGING, POTHOLE, DRAINAGE_OVERFLOW, DAMAGED_FOOTPATH, OPEN_MANHOLE."""
    # 1. Setup Zone
    z_resp = client.post("/api/v1/zones/", json={"code": "TYPE-Z-01", "name": "Multi-Type Test Zone"})
    assert z_resp.status_code == 201
    zone_id = z_resp.json()["id"]

    types = ["WATERLOGGING", "POTHOLE", "DRAINAGE_OVERFLOW", "DAMAGED_FOOTPATH", "OPEN_MANHOLE"]
    created_ids = {}

    # 2. Create an incident for each canonical type
    for idx, inc_type in enumerate(types, start=1):
        payload = {
            "incident_code": f"INC-TYPE-{idx:03d}",
            "incident_type": inc_type,
            "confidence": 0.88 + (idx * 0.02),
            "severity_score": min(10.0, 6.5 + (idx * 0.5)),
            "priority": "P2" if idx % 2 == 0 else "P1",
            "zone_id": zone_id,
            "status": "DETECTED",
            "recommended_action": f"Action for {inc_type}",
        }
        res = client.post("/api/v1/incidents/", json=payload)
        assert res.status_code == 201, f"Failed to create incident of type {inc_type}: {res.text}"
        data = res.json()
        assert data["incident_type"] == inc_type
        created_ids[inc_type] = data["id"]

    # 3. Query with incident_type filter for each type
    for inc_type in types:
        res = client.get(f"/api/v1/incidents/?incident_type={inc_type}&zone_id={zone_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["id"] == created_ids[inc_type]
        assert data["items"][0]["incident_type"] == inc_type

    # 4. Invalid incident type returns 422
    bad_type_resp = client.post(
        "/api/v1/incidents/",
        json={
            "incident_code": "INC-BAD-01",
            "incident_type": "FLOODING_UNKNOWN",
            "confidence": 0.9,
            "severity_score": 5.0,
            "priority": "P1",
            "zone_id": zone_id,
        },
    )
    assert bad_type_resp.status_code == 422

    bad_filter_resp = client.get("/api/v1/incidents/?incident_type=INVALID_HAZARD")
    assert bad_filter_resp.status_code == 422

    # 5. Empty filter results
    empty_resp = client.get(f"/api/v1/incidents/?incident_type=DRAINAGE_OVERFLOW&status=CLOSED&zone_id={zone_id}")
    assert empty_resp.status_code == 200
    assert empty_resp.json()["total"] == 0
    assert empty_resp.json()["items"] == []


def test_incident_status_multi_query_filtering(client: TestClient, db_session: Session):
    """Test multi-status query parameter (e.g. status=DETECTED,VERIFIED,ASSIGNED,IN_PROGRESS,RE_INSPECTION) and individual status views."""
    # Create zone
    zone_resp = client.post(
        "/api/v1/zones/",
        json={"code": "ZONE-STATUS-TEST", "name": "Status Test Zone"},
    )
    zone_id = zone_resp.json()["id"]

    # Create incidents in different statuses
    statuses_to_create = [
        ("INC-STAT-01", IncidentStatus.DETECTED),
        ("INC-STAT-02", IncidentStatus.VERIFIED),
        ("INC-STAT-03", IncidentStatus.ASSIGNED),
        ("INC-STAT-04", IncidentStatus.IN_PROGRESS),
        ("INC-STAT-05", IncidentStatus.RE_INSPECTION),
        ("INC-STAT-06", IncidentStatus.CLOSED),
        ("INC-STAT-07", IncidentStatus.REJECTED),
    ]

    for code, st in statuses_to_create:
        create_resp = client.post(
            "/api/v1/incidents/",
            json={
                "incident_code": code,
                "incident_type": "WATERLOGGING",
                "confidence": 0.9,
                "severity_score": 7.5,
                "priority": "P1",
                "zone_id": zone_id,
                "status": st.value,
            },
        )
        assert create_resp.status_code == 201

    # 1. Active view query: DETECTED,VERIFIED,ASSIGNED,IN_PROGRESS,RE_INSPECTION
    active_statuses = "DETECTED,VERIFIED,ASSIGNED,IN_PROGRESS,RE_INSPECTION"
    active_resp = client.get(f"/api/v1/incidents/?zone_id={zone_id}&status={active_statuses}")
    assert active_resp.status_code == 200
    active_data = active_resp.json()
    assert active_data["total"] == 5
    active_codes = {item["incident_code"] for item in active_data["items"]}
    assert active_codes == {"INC-STAT-01", "INC-STAT-02", "INC-STAT-03", "INC-STAT-04", "INC-STAT-05"}

    # 2. Completed view query: CLOSED
    completed_resp = client.get(f"/api/v1/incidents/?zone_id={zone_id}&status=CLOSED")
    assert completed_resp.status_code == 200
    completed_data = completed_resp.json()
    assert completed_data["total"] == 1
    assert completed_data["items"][0]["incident_code"] == "INC-STAT-06"

    # 3. Rejected view query: REJECTED
    rejected_resp = client.get(f"/api/v1/incidents/?zone_id={zone_id}&status=REJECTED")
    assert rejected_resp.status_code == 200
    rejected_data = rejected_resp.json()
    assert rejected_data["total"] == 1
    assert rejected_data["items"][0]["incident_code"] == "INC-STAT-07"

    # 4. Invalid status query returns 422
    invalid_resp = client.get(f"/api/v1/incidents/?status=INVALID_FOO,BAR")
    assert invalid_resp.status_code == 422


