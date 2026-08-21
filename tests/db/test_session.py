"""
tests/db/test_session.py
Unit tests for database session, metadata initialization, and ORM model schemas.
"""

import uuid
from datetime import datetime, timezone
from src.db.base import Base
from src.db.session import engine, SessionLocal, get_db
from src.db.models import (
    Zone,
    User,
    Incident,
    Detection,
    Evidence,
    Assignment,
    IncidentStatusHistory,
    Inspection,
    UserRole,
    IncidentType,
    PriorityLevel,
    IncidentStatus,
    EvidenceType,
    InspectionResult,
)


def test_base_metadata_contains_all_models():
    """Verify Declarative Base metadata contains all 8 database entities."""
    table_names = set(Base.metadata.tables.keys())
    expected_tables = {
        "zones",
        "users",
        "incidents",
        "detections",
        "evidence",
        "assignments",
        "incident_status_history",
        "inspections",
    }
    assert expected_tables.issubset(table_names), f"Missing tables: {expected_tables - table_names}"


def test_session_generator():
    """Verify get_db generator yields a session and closes it."""
    generator = get_db()
    session = next(generator)
    assert session is not None
    try:
        assert session.is_active
    finally:
        try:
            next(generator)
        except StopIteration:
            pass


def test_model_instantiation_and_defaults():
    """Verify ORM models instantiate cleanly with proper default values."""
    zone_id = uuid.uuid4()
    user_id = uuid.uuid4()
    incident_id = uuid.uuid4()

    zone = Zone(id=zone_id, code="EC-01", name="Phase 1 West")
    user = User(id=user_id, name="Operator One", email="op1@elcia.in", role=UserRole.OPERATOR)
    incident = Incident(
        id=incident_id,
        incident_code="EC-001",
        incident_type=IncidentType.WATERLOGGING,
        confidence=0.95,
        severity_score=8.5,
        priority=PriorityLevel.P1,
        status=IncidentStatus.DETECTED,
        zone_id=zone_id,
    )
    detection = Detection(
        incident_id=incident_id,
        detection_type="waterlogging",
        confidence=0.95,
        frame_number=42,
    )
    evidence = Evidence(
        incident_id=incident_id,
        evidence_type=EvidenceType.IMAGE,
        file_path="outputs/evidence/EC-001.jpg",
        is_primary=True,
    )
    assignment = Assignment(
        incident_id=incident_id,
        assigned_to=user_id,
        assigned_team="Drainage Team Alpha",
    )
    history = IncidentStatusHistory(
        incident_id=incident_id,
        old_status=None,
        new_status=IncidentStatus.DETECTED,
        changed_by=user_id,
        comment="Initial detection logged",
    )
    inspection = Inspection(
        incident_id=incident_id,
        inspector_id=user_id,
        result=InspectionResult.RESOLVED,
        notes="Dewatering pump deployed and verified clear.",
    )

    assert zone.code == "EC-01"
    assert user.role == UserRole.OPERATOR
    assert incident.priority == PriorityLevel.P1
    assert detection.confidence == 0.95
    assert evidence.is_primary is True
    assert assignment.assigned_team == "Drainage Team Alpha"
    assert history.new_status == IncidentStatus.DETECTED
    assert inspection.result == InspectionResult.RESOLVED
