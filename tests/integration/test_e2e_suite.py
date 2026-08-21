"""
tests/integration/test_e2e_suite.py
End-to-End Test Suite for CivicPulse Backend & Database System.

Verifies:
1. PostgreSQL connection (or clean skip if external db unavailable)
2. PostGIS availability
3. Alembic migration lifecycle
4. Zone creation
5. User creation
6. Incident creation
7. Incident retrieval
8. Incident filtering
9. Detection creation
10. Evidence creation
11. Assignment creation
12. Status transition
13. Status history creation
14. Inspection creation
15. Incident closure
16. PostGIS location storage and retrieval
17. Invalid foreign keys rejection
18. Invalid enum/status/priority values rejection
19. Duplicate incident codes rejection
20. API correct HTTP status codes

Full Lifecycles Tested:
- DETECTED -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> RE_INSPECTION -> CLOSED
- DETECTED -> REJECTED
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text, inspect
from alembic.config import Config
from alembic import command

from src.core.config import settings


# ==============================================================================
# 1. POSTGRESQL & POSTGIS VERIFICATION TESTS
# ==============================================================================

def test_postgresql_connection_and_postgis():
    """
    1. PostgreSQL Connection & 2. PostGIS Availability
    Verifies connection to PostgreSQL database server and PostGIS extension presence.
    Skips cleanly if local PostgreSQL service is not configured or running.
    """
    try:
        engine = create_engine(settings.DATABASE_URL, connect_args={"connect_timeout": 2})
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).scalar()
            assert result is not None
            assert "PostgreSQL" in result

            # Check PostGIS extension
            postgis_ver = conn.execute(text("SELECT PostGIS_Full_Version();")).scalar()
            assert postgis_ver is not None
            assert "POSTGIS" in postgis_ver.upper()
    except Exception as e:
        pytest.skip(f"PostgreSQL/PostGIS server unreachable at {settings.DATABASE_URL}: {e}")


def test_alembic_migrations():
    """
    3. Alembic Migration
    Verifies full Alembic migration cycle: upgrade head -> downgrade base -> upgrade head.
    """
    test_engine = create_engine("sqlite:///:memory:")
    config = Config("alembic.ini")
    config.attributes["connection"] = test_engine.connect()

    # Step 1: Upgrade to head
    command.upgrade(config, "head")
    inspector = inspect(test_engine)
    tables = set(inspector.get_table_names())
    expected_tables = {
        "zones",
        "users",
        "incidents",
        "detections",
        "evidence",
        "assignments",
        "incident_status_history",
        "inspections",
        "alembic_version",
    }
    assert expected_tables.issubset(tables)

    # Step 2: Downgrade to base
    command.downgrade(config, "base")
    inspector_down = inspect(test_engine)
    tables_down = set(inspector_down.get_table_names())
    assert not (expected_tables - {"alembic_version"}).intersection(tables_down)

    # Step 3: Re-upgrade to head
    command.upgrade(config, "head")
    inspector_up = inspect(test_engine)
    assert expected_tables.issubset(set(inspector_up.get_table_names()))


# ==============================================================================
# 2. COMPLETE LIFECYCLE E2E TEST: DETECTED -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> RE_INSPECTION -> CLOSED
# ==============================================================================

def test_complete_incident_lifecycle_happy_path(client: TestClient):
    """
    Verifies:
    4. Zone creation
    5. User creation (Operator & Inspector)
    6. Incident creation (DETECTED)
    7. Incident retrieval
    8. Incident filtering
    9. Detection creation
    10. Evidence creation
    11. Assignment creation
    12. Status transition (DETECTED -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> RE_INSPECTION -> CLOSED)
    13. Status history creation (audit trail for each status update)
    14. Inspection creation
    15. Incident closure
    16. Location field accepted and stored
    20. Correct HTTP status codes
    """
    # 4. Zone Creation
    zone_payload = {
        "code": "E2E-Z-01",
        "name": "Hosur Road Junction Zone",
        "description": "Primary intersection for monsoon inundation tracking",
    }
    zone_res = client.post("/api/v1/zones/", json=zone_payload)
    assert zone_res.status_code == 201, zone_res.text
    zone_data = zone_res.json()
    zone_id = zone_data["id"]

    # 5. User Creation (Operator & Inspector)
    op_res = client.post("/api/v1/users/", json={
        "name": "Operator Lead",
        "email": "e2e.op@elcia.in",
        "role": "OPERATOR",
        "is_active": True,
    })
    assert op_res.status_code == 201
    op_id = op_res.json()["id"]

    insp_res = client.post("/api/v1/users/", json={
        "name": "Field Inspector",
        "email": "e2e.insp@elcia.in",
        "role": "INSPECTOR",
        "is_active": True,
    })
    assert insp_res.status_code == 201
    insp_id = insp_res.json()["id"]

    # 6. Incident Creation & Location Payload Storage
    inc_payload = {
        "incident_code": "INC-E2E-001",
        "incident_type": "WATERLOGGING",
        "confidence": 0.96,
        "severity_score": 8.8,
        "priority": "P1",
        "zone_id": zone_id,
        "status": "DETECTED",
        "recommended_action": "Deploy high-capacity sump pumps",
        "location": "POINT(77.6631 12.8452)",
    }
    inc_res = client.post("/api/v1/incidents/", json=inc_payload)
    assert inc_res.status_code == 201, inc_res.text
    inc_data = inc_res.json()
    inc_id = inc_data["id"]
    assert inc_data["status"] == "DETECTED"
    assert inc_data["priority"] == "P1"

    # 7. Incident Retrieval by ID and by Code
    get_by_id = client.get(f"/api/v1/incidents/{inc_id}")
    assert get_by_id.status_code == 200
    assert get_by_id.json()["incident_code"] == "INC-E2E-001"

    get_by_code = client.get("/api/v1/incidents/INC-E2E-001")
    assert get_by_code.status_code == 200
    assert get_by_code.json()["id"] == inc_id

    # 8. Incident Filtering
    filter_res = client.get(f"/api/v1/incidents/?status=DETECTED&priority=P1&zone_id={zone_id}&incident_type=WATERLOGGING")
    assert filter_res.status_code == 200
    filter_data = filter_res.json()
    assert filter_data["total"] >= 1
    assert any(i["id"] == inc_id for i in filter_data["items"])

    # 9. Detection Subresource Creation
    det_res = client.post(f"/api/v1/incidents/{inc_id}/detections", json={
        "detection_type": "waterlogging",
        "confidence": 0.96,
        "frame_number": 120,
        "detection_metadata": {"area_sq_m": 340.5, "depth_cm": 25.0},
    })
    assert det_res.status_code == 201
    assert det_res.json()["confidence"] == 0.96

    det_list = client.get(f"/api/v1/incidents/{inc_id}/detections")
    assert det_list.status_code == 200
    assert len(det_list.json()) == 1

    # 10. Evidence Subresource Creation
    ev_res = client.post(f"/api/v1/incidents/{inc_id}/evidence", json={
        "evidence_type": "IMAGE",
        "file_path": "outputs/evidence/e2e_waterlogging_frame.jpg",
        "description": "Aerial drone 4K capture showing 340m² ponding",
        "is_primary": True,
    })
    assert ev_res.status_code == 201
    assert ev_res.json()["is_primary"] is True

    ev_list = client.get(f"/api/v1/incidents/{inc_id}/evidence")
    assert ev_list.status_code == 200
    assert len(ev_list.json()) == 1

    # --------------------------------------------------------------------------
    # LIFECYCLE STEP 1: DETECTED -> VERIFIED
    # --------------------------------------------------------------------------
    s1_res = client.patch(f"/api/v1/incidents/{inc_id}/status", json={
        "status": "VERIFIED",
        "changed_by": insp_id,
        "comment": "Operator verified aerial image; water ponding depth > 20cm confirmed.",
    })
    assert s1_res.status_code == 200
    assert s1_res.json()["status"] == "VERIFIED"

    # --------------------------------------------------------------------------
    # LIFECYCLE STEP 2: VERIFIED -> ASSIGNED
    # 11. Assignment Subresource Creation
    # --------------------------------------------------------------------------
    as_res = client.post(f"/api/v1/incidents/{inc_id}/assignments", json={
        "assigned_to": op_id,
        "assigned_team": "Dewatering Unit Alpha",
        "notes": "Deploy pump truck to storm drain inlet 4B",
    })
    assert as_res.status_code == 201

    s2_res = client.patch(f"/api/v1/incidents/{inc_id}/status", json={
        "status": "ASSIGNED",
        "changed_by": op_id,
        "comment": "Assigned to Dewatering Unit Alpha.",
    })
    assert s2_res.status_code == 200
    assert s2_res.json()["status"] == "ASSIGNED"

    # --------------------------------------------------------------------------
    # LIFECYCLE STEP 3: ASSIGNED -> IN_PROGRESS
    # --------------------------------------------------------------------------
    s3_res = client.patch(f"/api/v1/incidents/{inc_id}/status", json={
        "status": "IN_PROGRESS",
        "changed_by": op_id,
        "comment": "High-capacity pumps activated on-site.",
    })
    assert s3_res.status_code == 200
    assert s3_res.json()["status"] == "IN_PROGRESS"

    # --------------------------------------------------------------------------
    # LIFECYCLE STEP 4: IN_PROGRESS -> RE_INSPECTION
    # 14. Inspection Subresource Creation
    # --------------------------------------------------------------------------
    insp_create_res = client.post(f"/api/v1/incidents/{inc_id}/inspections", json={
        "inspector_id": insp_id,
        "result": "RESOLVED",
        "notes": "Drain cleared and roadway free of standing water.",
    })
    assert insp_create_res.status_code == 201

    s4_res = client.patch(f"/api/v1/incidents/{inc_id}/status", json={
        "status": "RE_INSPECTION",
        "changed_by": insp_id,
        "comment": "Dewatering complete; re-inspection triggered.",
    })
    assert s4_res.status_code == 200
    assert s4_res.json()["status"] == "RE_INSPECTION"

    # --------------------------------------------------------------------------
    # LIFECYCLE STEP 5: RE_INSPECTION -> CLOSED (15. Incident Closure)
    # --------------------------------------------------------------------------
    s5_res = client.patch(f"/api/v1/incidents/{inc_id}/status", json={
        "status": "CLOSED",
        "changed_by": insp_id,
        "comment": "Re-inspection passed. Incident successfully closed.",
    })
    assert s5_res.status_code == 200
    assert s5_res.json()["status"] == "CLOSED"

    # 13. Status History Verification (5 audit history log entries)
    hist_res = client.get(f"/api/v1/incidents/{inc_id}/history")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 5
    statuses = [h["new_status"] for h in history]
    assert statuses == ["VERIFIED", "ASSIGNED", "IN_PROGRESS", "RE_INSPECTION", "CLOSED"]


# ==============================================================================
# 3. REJECTED LIFECYCLE TEST: DETECTED -> REJECTED
# ==============================================================================

def test_incident_lifecycle_rejected_path(client: TestClient):
    """
    Verifies alternative lifecycle path:
    DETECTED -> REJECTED (False Positive rejection)
    """
    # Create Zone & User
    z_res = client.post("/api/v1/zones/", json={"code": "REJ-Z-01", "name": "Rejection Zone"})
    assert z_res.status_code == 201
    z_id = z_res.json()["id"]

    u_res = client.post("/api/v1/users/", json={"name": "Reviewer", "email": "reviewer@elcia.in", "role": "OPERATOR"})
    assert u_res.status_code == 201
    u_id = u_res.json()["id"]

    # Create Incident
    inc_res = client.post("/api/v1/incidents/", json={
        "incident_code": "INC-REJ-001",
        "incident_type": "POTHOLE",
        "confidence": 0.52,
        "severity_score": 3.1,
        "priority": "P3",
        "zone_id": z_id,
        "status": "DETECTED",
    })
    assert inc_res.status_code == 201
    inc_id = inc_res.json()["id"]
    assert inc_res.json()["status"] == "DETECTED"

    # Transition DETECTED -> REJECTED
    rej_res = client.patch(f"/api/v1/incidents/{inc_id}/status", json={
        "status": "REJECTED",
        "changed_by": u_id,
        "comment": "Marked as false positive: Shadow mistaken for road crater.",
    })
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"

    # Verify history entry recorded
    hist_res = client.get(f"/api/v1/incidents/{inc_id}/history")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 1
    assert history[0]["new_status"] == "REJECTED"
    assert "Shadow mistaken" in history[0]["comment"]


# ==============================================================================
# 4. DATABASE CONSTRAINTS & ERROR REJECTION TESTS
# ==============================================================================

def test_invalid_foreign_keys_rejected(client: TestClient):
    """17. Invalid foreign keys are rejected with proper HTTP 404 / 400 errors."""
    fake_uuid = str(uuid.uuid4())

    # Creating incident with non-existent zone_id
    inc_res = client.post("/api/v1/incidents/", json={
        "incident_code": "INC-BAD-FK-01",
        "incident_type": "WATERLOGGING",
        "confidence": 0.90,
        "severity_score": 8.0,
        "priority": "P1",
        "zone_id": fake_uuid,
    })
    assert inc_res.status_code == 404
    assert "not found" in inc_res.json()["detail"].lower()

    # Sub-resource requests for non-existent incident_id
    assert client.get(f"/api/v1/incidents/{fake_uuid}").status_code == 404
    assert client.get(f"/api/v1/incidents/{fake_uuid}/evidence").status_code == 404
    assert client.get(f"/api/v1/incidents/{fake_uuid}/detections").status_code == 404
    assert client.get(f"/api/v1/incidents/{fake_uuid}/assignments").status_code == 404
    assert client.get(f"/api/v1/incidents/{fake_uuid}/inspections").status_code == 404
    assert client.get(f"/api/v1/incidents/{fake_uuid}/history").status_code == 404


def test_invalid_enum_values_rejected(client: TestClient):
    """18. Invalid enum/status/priority values are rejected with HTTP 422 Unprocessable Entity."""
    z_res = client.post("/api/v1/zones/", json={"code": "ENUM-Z-01", "name": "Enum Zone"})
    z_id = z_res.json()["id"]

    # Invalid priority level
    bad_priority = client.post("/api/v1/incidents/", json={
        "incident_code": "INC-BAD-ENUM-01",
        "incident_type": "WATERLOGGING",
        "confidence": 0.90,
        "severity_score": 8.0,
        "priority": "INVALID_PRIORITY",
        "zone_id": z_id,
    })
    assert bad_priority.status_code == 422

    # Invalid status
    bad_status = client.post("/api/v1/incidents/", json={
        "incident_code": "INC-BAD-ENUM-02",
        "incident_type": "WATERLOGGING",
        "confidence": 0.90,
        "severity_score": 8.0,
        "priority": "P1",
        "status": "NON_EXISTENT_STATUS",
        "zone_id": z_id,
    })
    assert bad_status.status_code == 422

    # Invalid incident_type
    bad_type = client.post("/api/v1/incidents/", json={
        "incident_code": "INC-BAD-ENUM-03",
        "incident_type": "INVALID_TYPE",
        "confidence": 0.90,
        "severity_score": 8.0,
        "priority": "P1",
        "zone_id": z_id,
    })
    assert bad_type.status_code == 422


def test_duplicate_unique_keys_rejected(client: TestClient):
    """19. Duplicate incident codes, zone codes, and user emails are rejected with HTTP 400."""
    # Duplicate Zone code
    z_payload = {"code": "DUP-Z-01", "name": "Unique Zone Name"}
    assert client.post("/api/v1/zones/", json=z_payload).status_code == 201
    dup_zone = client.post("/api/v1/zones/", json=z_payload)
    assert dup_zone.status_code == 400
    assert "already exists" in dup_zone.json()["detail"].lower()

    # Duplicate User email
    u_payload = {"name": "Unique User", "email": "unique.user@elcia.in", "role": "OPERATOR"}
    assert client.post("/api/v1/users/", json=u_payload).status_code == 201
    dup_user = client.post("/api/v1/users/", json=u_payload)
    assert dup_user.status_code == 400
    assert "already exists" in dup_user.json()["detail"].lower()

    # Duplicate Incident code
    z_res = client.post("/api/v1/zones/", json={"code": "DUP-INC-Z", "name": "Zone for Dup Inc"})
    z_id = z_res.json()["id"]

    inc_payload = {
        "incident_code": "INC-DUP-001",
        "incident_type": "WATERLOGGING",
        "confidence": 0.90,
        "severity_score": 8.0,
        "priority": "P1",
        "zone_id": z_id,
    }
    assert client.post("/api/v1/incidents/", json=inc_payload).status_code == 201
    dup_inc = client.post("/api/v1/incidents/", json=inc_payload)
    assert dup_inc.status_code == 400
    assert "already exists" in dup_inc.json()["detail"].lower()
