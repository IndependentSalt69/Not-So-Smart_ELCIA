"""
tests/repositories/test_repositories.py
Comprehensive unit tests for CivicPulse repository layer across all entities:
Zones, Users, Incidents, Evidence, Detections, Assignments, Inspections, and Status History.
"""

import uuid
import pytest
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from src.db.models.enums import (
    UserRole,
    IncidentType,
    PriorityLevel,
    IncidentStatus,
    EvidenceType,
    InspectionResult,
)
from src.repositories import (
    create_zone,
    get_zone,
    list_zones,
    update_zone,
    create_user,
    get_user,
    list_users,
    update_user,
    create_incident,
    get_incident,
    list_incidents,
    update_incident,
    update_incident_status,
    create_evidence,
    list_incident_evidence,
    create_detection,
    list_incident_detections,
    create_assignment,
    get_incident_assignments,
    create_inspection,
    list_incident_inspections,
    create_status_history,
    list_incident_status_history,
)


def test_zone_repository_crud(db_session: Session):
    """Test Zone create, get (by UUID and code), list, update, and missing record handling."""
    # 1. Create Zone
    zone = create_zone(
        db=db_session,
        code="EC-TEST-01",
        name="Electronic City Phase 1 West",
        description="Main Hosur road arterial corridor",
    )
    assert zone.id is not None
    assert zone.code == "EC-TEST-01"
    assert zone.name == "Electronic City Phase 1 West"

    # 2. Get Zone by UUID and by Code
    fetched_by_id = get_zone(db_session, zone.id)
    assert fetched_by_id is not None
    assert fetched_by_id.code == "EC-TEST-01"

    fetched_by_str_id = get_zone(db_session, str(zone.id))
    assert fetched_by_str_id is not None
    assert fetched_by_str_id.id == zone.id

    fetched_by_code = get_zone(db_session, "EC-TEST-01")
    assert fetched_by_code is not None
    assert fetched_by_code.id == zone.id

    # 3. Missing record handling
    non_existent_uuid = uuid.uuid4()
    assert get_zone(db_session, non_existent_uuid) is None
    assert get_zone(db_session, "NON_EXISTENT_CODE") is None

    # 4. List Zones
    zones = list_zones(db_session, skip=0, limit=100)
    assert len(zones) >= 1
    assert any(z.code == "EC-TEST-01" for z in zones)

    # 5. Update Zone
    updated = update_zone(db_session, zone.id, name="Phase 1 West Updated", description="Updated description")
    assert updated is not None
    assert updated.name == "Phase 1 West Updated"
    assert updated.description == "Updated description"

    assert update_zone(db_session, non_existent_uuid, name="Noop") is None

    # 6. Transaction rollback on error (duplicate code constraint)
    with pytest.raises(IntegrityError):
        create_zone(db_session, code="EC-TEST-01", name="Duplicate Zone")


def test_user_repository_crud(db_session: Session):
    """Test User create, get (by UUID and email), list with filters, update, and rollback on duplicate."""
    # 1. Create Users
    op_user = create_user(
        db=db_session,
        name="Operator Alpha",
        email="operator.alpha@elcia.in",
        role=UserRole.OPERATOR,
    )
    insp_user = create_user(
        db=db_session,
        name="Inspector Beta",
        email="inspector.beta@elcia.in",
        role=UserRole.INSPECTOR,
    )
    inactive_admin = create_user(
        db=db_session,
        name="Admin Gamma",
        email="admin.gamma@elcia.in",
        role=UserRole.ADMIN,
        is_active=False,
    )

    assert op_user.id is not None
    assert op_user.role == UserRole.OPERATOR

    # 2. Get User
    fetched = get_user(db_session, op_user.id)
    assert fetched is not None
    assert fetched.email == "operator.alpha@elcia.in"

    fetched_by_email = get_user(db_session, "inspector.beta@elcia.in")
    assert fetched_by_email is not None
    assert fetched_by_email.id == insp_user.id

    assert get_user(db_session, uuid.uuid4()) is None

    # 3. List Users with filtering
    operators = list_users(db_session, role=UserRole.OPERATOR)
    assert len(operators) >= 1
    assert all(u.role == UserRole.OPERATOR for u in operators)

    active_users = list_users(db_session, is_active=True)
    assert inactive_admin.id not in [u.id for u in active_users]

    # 4. Update User
    updated_user = update_user(db_session, op_user.id, name="Operator Alpha Prime", is_active=True)
    assert updated_user is not None
    assert updated_user.name == "Operator Alpha Prime"

    assert update_user(db_session, uuid.uuid4(), name="Unknown") is None

    # 5. Rollback on constraint error (duplicate email)
    with pytest.raises(IntegrityError):
        create_user(db_session, name="Imposter", email="operator.alpha@elcia.in")


def test_incident_repository_crud(db_session: Session):
    """Test Incident create, get, list with filtering, update, and status transition with history audit."""
    zone = create_zone(db_session, code="EC-INC-Z1", name="Incident Test Zone")
    user = create_user(db_session, name="Auditor User", email="auditor@elcia.in", role=UserRole.OPERATOR)

    # 1. Create Incident
    incident = create_incident(
        db=db_session,
        incident_code="INC-2026-001",
        incident_type=IncidentType.WATERLOGGING,
        confidence=0.92,
        severity_score=7.8,
        priority=PriorityLevel.P1,
        zone_id=zone.id,
        recommended_action="Deploy dewatering pump immediately",
    )
    assert incident.id is not None
    assert incident.incident_code == "INC-2026-001"
    assert incident.status == IncidentStatus.DETECTED

    # 2. Get Incident
    fetched = get_incident(db_session, incident.id)
    assert fetched is not None
    assert fetched.incident_code == "INC-2026-001"

    fetched_by_code = get_incident(db_session, "INC-2026-001")
    assert fetched_by_code is not None
    assert fetched_by_code.id == incident.id

    assert get_incident(db_session, uuid.uuid4()) is None
    assert get_incident(db_session, "INVALID_CODE") is None

    # 3. List Incidents with filtering
    p1_incidents = list_incidents(
        db_session,
        zone_id=zone.id,
        status=IncidentStatus.DETECTED,
        priority=PriorityLevel.P1,
        incident_type=IncidentType.WATERLOGGING,
    )
    assert len(p1_incidents) == 1
    assert p1_incidents[0].id == incident.id

    # 4. Update Incident
    updated_inc = update_incident(
        db_session,
        incident.id,
        severity_score=8.5,
        recommended_action="Updated action",
    )
    assert updated_inc is not None
    assert updated_inc.severity_score == 8.5
    assert updated_inc.recommended_action == "Updated action"

    assert update_incident(db_session, uuid.uuid4(), severity_score=5.0) is None

    # 5. Update Incident Status (should append to history)
    status_updated = update_incident_status(
        db=db_session,
        incident_id=incident.id,
        status=IncidentStatus.VERIFIED,
        changed_by=user.id,
        comment="Field inspection confirmed waterlogging depth > 15cm",
    )
    assert status_updated is not None
    assert status_updated.status == IncidentStatus.VERIFIED

    # Check status history
    history = list_incident_status_history(db_session, incident.id)
    assert len(history) == 1
    assert history[0].old_status == IncidentStatus.DETECTED
    assert history[0].new_status == IncidentStatus.VERIFIED
    assert history[0].changed_by == user.id
    assert history[0].comment == "Field inspection confirmed waterlogging depth > 15cm"


def test_evidence_repository(db_session: Session):
    """Test Evidence create and list_incident_evidence."""
    zone = create_zone(db_session, code="EC-EV-Z1", name="Evidence Zone")
    incident = create_incident(
        db_session,
        incident_code="INC-EV-001",
        incident_type=IncidentType.POTHOLE,
        confidence=0.88,
        severity_score=6.2,
        priority=PriorityLevel.P2,
        zone_id=zone.id,
    )

    ev1 = create_evidence(
        db=db_session,
        incident_id=incident.id,
        evidence_type=EvidenceType.IMAGE,
        file_path="outputs/evidence/frame_01.jpg",
        is_primary=True,
        description="Snapshot of pothole at junction",
    )
    ev2 = create_evidence(
        db=db_session,
        incident_id=incident.id,
        evidence_type=EvidenceType.VIDEO,
        file_path="outputs/evidence/clip_01.mp4",
        is_primary=False,
    )

    assert ev1.id is not None
    assert ev2.id is not None

    evidence_list = list_incident_evidence(db_session, incident.id)
    assert len(evidence_list) == 2
    paths = [e.file_path for e in evidence_list]
    assert "outputs/evidence/frame_01.jpg" in paths
    assert "outputs/evidence/clip_01.mp4" in paths


def test_detection_repository(db_session: Session):
    """Test Detection create and list_incident_detections with JSONB metadata."""
    zone = create_zone(db_session, code="EC-DET-Z1", name="Detection Zone")
    incident = create_incident(
        db_session,
        incident_code="INC-DET-001",
        incident_type=IncidentType.DRAINAGE_OVERFLOW,
        confidence=0.91,
        severity_score=9.0,
        priority=PriorityLevel.P1,
        zone_id=zone.id,
    )

    det1 = create_detection(
        db=db_session,
        incident_id=incident.id,
        detection_type="drainage_overflow",
        confidence=0.91,
        frame_number=105,
        detection_metadata={"bbox": [100, 200, 300, 400], "area_sq_m": 4.5},
    )
    det2 = create_detection(
        db=db_session,
        incident_id=incident.id,
        detection_type="drainage_overflow",
        confidence=0.94,
        frame_number=135,
        detection_metadata={"bbox": [105, 205, 305, 405], "area_sq_m": 5.1},
    )

    assert det1.id is not None
    assert det2.id is not None

    detections = list_incident_detections(db_session, incident.id)
    assert len(detections) == 2
    assert detections[0].frame_number == 105
    assert detections[0].detection_metadata["area_sq_m"] == 4.5
    assert detections[1].frame_number == 135


def test_assignment_repository(db_session: Session):
    """Test Assignment create and get_incident_assignments."""
    zone = create_zone(db_session, code="EC-AS-Z1", name="Assignment Zone")
    user = create_user(db_session, name="Team Lead", email="lead@elcia.in", role=UserRole.OPERATOR)
    incident = create_incident(
        db_session,
        incident_code="INC-AS-001",
        incident_type=IncidentType.WATERLOGGING,
        confidence=0.85,
        severity_score=5.5,
        priority=PriorityLevel.P2,
        zone_id=zone.id,
    )

    assignment = create_assignment(
        db=db_session,
        incident_id=incident.id,
        assigned_to=user.id,
        assigned_team="Rapid Response Team 1",
        notes="Dispatch crew with portable pumps",
    )
    assert assignment.id is not None
    assert assignment.assigned_team == "Rapid Response Team 1"

    assignments = get_incident_assignments(db_session, incident.id)
    assert len(assignments) == 1
    assert assignments[0].assigned_to == user.id
    assert assignments[0].notes == "Dispatch crew with portable pumps"


def test_inspection_repository(db_session: Session):
    """Test Inspection create and list_incident_inspections."""
    zone = create_zone(db_session, code="EC-INSP-Z1", name="Inspection Zone")
    inspector = create_user(db_session, name="Field Inspector", email="inspector1@elcia.in", role=UserRole.INSPECTOR)
    incident = create_incident(
        db_session,
        incident_code="INC-INSP-001",
        incident_type=IncidentType.POTHOLE,
        confidence=0.96,
        severity_score=8.0,
        priority=PriorityLevel.P1,
        zone_id=zone.id,
    )

    inspection = create_inspection(
        db=db_session,
        incident_id=incident.id,
        inspector_id=inspector.id,
        result=InspectionResult.RESOLVED,
        notes="Asphalt patch applied and verified smooth.",
    )
    assert inspection.id is not None
    assert inspection.result == InspectionResult.RESOLVED

    inspections = list_incident_inspections(db_session, incident.id)
    assert len(inspections) == 1
    assert inspections[0].inspector_id == inspector.id
    assert inspections[0].notes == "Asphalt patch applied and verified smooth."


def test_status_history_repository(db_session: Session):
    """Test explicit create_status_history and list_incident_status_history."""
    zone = create_zone(db_session, code="EC-HIST-Z1", name="History Zone")
    user = create_user(db_session, name="Control Room Op", email="opcontrol@elcia.in", role=UserRole.OPERATOR)
    incident = create_incident(
        db_session,
        incident_code="INC-HIST-001",
        incident_type=IncidentType.WATERLOGGING,
        confidence=0.90,
        severity_score=7.0,
        priority=PriorityLevel.P2,
        zone_id=zone.id,
    )

    hist1 = create_status_history(
        db=db_session,
        incident_id=incident.id,
        old_status=None,
        new_status=IncidentStatus.DETECTED,
        changed_by=user.id,
        comment="System auto-detected incident",
    )
    hist2 = create_status_history(
        db=db_session,
        incident_id=incident.id,
        old_status=IncidentStatus.DETECTED,
        new_status=IncidentStatus.ASSIGNED,
        changed_by=user.id,
        comment="Assigned to Maintenance Crew B",
    )

    assert hist1.id is not None
    assert hist2.id is not None

    history_list = list_incident_status_history(db_session, incident.id)
    assert len(history_list) == 2
    assert history_list[0].new_status == IncidentStatus.DETECTED
    assert history_list[1].new_status == IncidentStatus.ASSIGNED


def test_all_five_incident_types_repository_crud(db_session: Session):
    """Test repository create, get, and list filtering for all 5 canonical incident types."""
    zone = create_zone(db_session, code="EC-5TYPE-Z", name="5-Type Zone")

    type_map = {
        IncidentType.WATERLOGGING: "INC-WTR-01",
        IncidentType.POTHOLE: "INC-POT-01",
        IncidentType.DRAINAGE_OVERFLOW: "INC-DRN-01",
        IncidentType.DAMAGED_FOOTPATH: "INC-FTP-01",
        IncidentType.OPEN_MANHOLE: "INC-MNH-01",
    }

    created = {}
    for inc_type, code in type_map.items():
        inc = create_incident(
            db=db_session,
            incident_code=code,
            incident_type=inc_type,
            confidence=0.95,
            severity_score=8.0,
            priority=PriorityLevel.P1,
            zone_id=zone.id,
            recommended_action=f"Clear {inc_type.value}",
        )
        assert inc.id is not None
        assert inc.incident_type == inc_type
        created[inc_type] = inc

    for inc_type in type_map.keys():
        filtered = list_incidents(db_session, zone_id=zone.id, incident_type=inc_type)
        assert len(filtered) == 1
        assert filtered[0].id == created[inc_type].id
        assert filtered[0].incident_type == inc_type

