"""
tests/api/test_api.py
Comprehensive API test suite using FastAPI TestClient for CivicPulse endpoints:
Health, Zones, Users, Incidents, Evidence, Detections, Assignments, Inspections, and Status History.
"""

import uuid
from fastapi.testclient import TestClient


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
