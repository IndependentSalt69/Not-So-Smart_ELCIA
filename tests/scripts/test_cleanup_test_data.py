"""
tests/scripts/test_cleanup_test_data.py
Unit and integration tests for scripts/cleanup_test_data.py safe database cleanup utility.
All tests run against isolated in-memory SQLite database (TestingSessionLocal).
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path
import pytest
from sqlalchemy.orm import Session

from src.db.models.incident import Incident
from src.db.models.detection import Detection
from src.db.models.evidence import Evidence
from src.db.models.assignment import Assignment
from src.db.models.inspection import Inspection
from src.db.models.history import IncidentStatusHistory
from src.db.models.zone import Zone
from src.db.models.user import User
from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus, EvidenceType, InspectionResult, UserRole

from scripts.cleanup_test_data import (
    classify_incident_record,
    inspect_database_incidents,
    is_safe_to_delete_evidence_file,
    execute_cleanup,
)


@pytest.fixture(autouse=True)
def clean_db_tables(db_session: Session):
    """Ensure clean tables before and after each test."""
    db_session.query(Inspection).delete()
    db_session.query(Assignment).delete()
    db_session.query(IncidentStatusHistory).delete()
    db_session.query(Detection).delete()
    db_session.query(Evidence).delete()
    db_session.query(Incident).delete()
    db_session.commit()
    yield
    db_session.query(Inspection).delete()
    db_session.query(Assignment).delete()
    db_session.query(IncidentStatusHistory).delete()
    db_session.query(Detection).delete()
    db_session.query(Evidence).delete()
    db_session.query(Incident).delete()
    db_session.commit()


@pytest.fixture
def sample_zone_and_user(db_session: Session):
    """Create isolated test zone and user in test SQLite database."""
    unique_suffix = uuid.uuid4().hex[:8]
    zone = Zone(
        id=uuid.uuid4(),
        code=f"EC-TST-{unique_suffix}",
        name=f"Test Zone {unique_suffix}",
        description="Zone for cleanup tests",
    )
    db_session.add(zone)

    user = User(
        id=uuid.uuid4(),
        email=f"tester_{unique_suffix}@elcia.in",
        name="Cleanup Test Inspector",
        role=UserRole.INSPECTOR,
    )
    db_session.add(user)
    db_session.commit()
    return zone, user


def create_fixture_incident(
    db: Session,
    zone: Zone,
    incident_code: str,
    job_id: str,
    rec_action: str = "Inspect site",
    is_demo: bool = False,
    evidence_path: str = "outputs/jobs/test/evidence/test.jpg",
    user: User = None,
) -> Incident:
    """Helper to populate an incident with full relational child records."""
    inc_id = uuid.uuid4()
    incident = Incident(
        id=inc_id,
        incident_code=incident_code,
        incident_type=IncidentType.WATERLOGGING,
        confidence=0.88,
        severity_score=7.5,
        priority=PriorityLevel.P1,
        zone_id=zone.id,
        status=IncidentStatus.DETECTED,
        started_at=datetime.now(timezone.utc),
        duration_seconds=14.5,
        recommended_action=rec_action,
    )
    db.add(incident)

    det = Detection(
        id=uuid.uuid4(),
        incident_id=inc_id,
        detection_type="waterlogging",
        confidence=0.88,
        frame_number=10,
        detected_at=datetime.now(timezone.utc),
        detection_metadata={"job_id": job_id, "is_demo": is_demo},
    )
    db.add(det)

    ev = Evidence(
        id=uuid.uuid4(),
        incident_id=inc_id,
        evidence_type=EvidenceType.IMAGE,
        file_path=evidence_path,
        is_primary=True,
    )
    db.add(ev)

    if user:
        assign = Assignment(
            id=uuid.uuid4(),
            incident_id=inc_id,
            assigned_to=user.id,
            assigned_team="Test Crew",
        )
        db.add(assign)

        insp = Inspection(
            id=uuid.uuid4(),
            incident_id=inc_id,
            inspector_id=user.id,
            result=InspectionResult.RESOLVED,
            evidence_id=ev.id,
        )
        db.add(insp)

    hist = IncidentStatusHistory(
        id=uuid.uuid4(),
        incident_id=inc_id,
        new_status=IncidentStatus.DETECTED,
        comment="Auto created",
    )
    db.add(hist)

    db.commit()
    return incident


# ==============================================================================
# TEST CASES
# ==============================================================================

def test_dry_run_does_not_modify_db(db_session: Session, sample_zone_and_user):
    """Case A: Verify inspect_database_incidents does not modify or delete DB records."""
    zone, user = sample_zone_and_user
    create_fixture_incident(
        db=db_session,
        zone=zone,
        incident_code="INC-DEMO-001",
        job_id="test-demo-job",
        rec_action="DEMO: Puddle dewatering",
        is_demo=True,
        user=user,
    )

    count_before = db_session.query(Incident).count()
    candidates = inspect_database_incidents(db=db_session)
    count_after = db_session.query(Incident).count()

    assert count_before == count_after == 1
    assert len(candidates) == 1
    assert candidates[0].classification == "TEST_DEMO"


def test_clearly_marked_test_records_are_selected(db_session: Session, sample_zone_and_user):
    """Case C: Verify all known test/demo markers are properly categorized as TEST_DEMO."""
    zone, user = sample_zone_and_user

    # 1. Explicit INC-DEMO prefix
    inc1 = create_fixture_incident(db_session, zone, "INC-DEMO-001", "job-1", is_demo=True)
    # 2. Explicit fiveclass job marker
    inc2 = create_fixture_incident(db_session, zone, "INC-TEST-02", "uuid-fiveclass")
    # 3. Explicit e2econf job marker
    inc3 = create_fixture_incident(db_session, zone, "INC-E2ECONF-03", "uuid-e2econf")
    # 4. Explicit DEMO: recommended action
    inc4 = create_fixture_incident(db_session, zone, "INC-CUSTOM-04", "job-4", rec_action="DEMO: Action item")

    candidates = inspect_database_incidents(db_session)
    test_cands = [c for c in candidates if c.classification == "TEST_DEMO"]

    assert len(test_cands) == 4
    test_codes = {c.incident_code for c in test_cands}
    assert test_codes == {"INC-DEMO-001", "INC-TEST-02", "INC-E2ECONF-03", "INC-CUSTOM-04"}


def test_clearly_live_records_are_not_selected(db_session: Session, sample_zone_and_user, monkeypatch):
    """Case D: Verify records matching active local jobs are protected and NEVER marked as TEST_DEMO."""
    zone, user = sample_zone_and_user

    # Mock real local job folders to include 'live-job-alpha'
    monkeypatch.setattr("scripts.cleanup_test_data.get_real_local_job_folders", lambda: {"live-job-alpha"})

    create_fixture_incident(
        db=db_session,
        zone=zone,
        incident_code="INC-LIVE-001",
        job_id="live-job-alpha",
        rec_action="Fix highway surface",
        evidence_path="outputs/jobs/live-job-alpha/evidence/hazard_1_CRITICAL.jpg",
    )

    candidates = inspect_database_incidents(db_session)
    assert len(candidates) == 1
    assert candidates[0].classification == "PROTECTED_LIVE"
    assert "Matched active local job" in candidates[0].reason


def test_ambiguous_records_are_skipped(db_session: Session, sample_zone_and_user, monkeypatch):
    """Case E: Verify records without positive test markers and without active local job folders are AMBIGUOUS."""
    zone, user = sample_zone_and_user

    # No local job matching 'legacy-unknown-job'
    monkeypatch.setattr("scripts.cleanup_test_data.get_real_local_job_folders", lambda: set())

    create_fixture_incident(
        db=db_session,
        zone=zone,
        incident_code="INC-UNKNOWN-999",
        job_id="legacy-unknown-job",
        rec_action="Routine roadway inspection",
    )

    candidates = inspect_database_incidents(db_session)
    assert len(candidates) == 1
    assert candidates[0].classification == "AMBIGUOUS"


def test_relational_cascade_cleanup_succeeds(db_session: Session, sample_zone_and_user):
    """Case F: Verify foreign-key child records (detections, evidence, assignments, inspections, history) are cleaned."""
    zone, user = sample_zone_and_user

    inc = create_fixture_incident(
        db=db_session,
        zone=zone,
        incident_code="INC-DEMO-001",
        job_id="demo-job",
        rec_action="DEMO: Puddle repair",
        is_demo=True,
        user=user,
    )

    candidates = inspect_database_incidents(db_session)
    test_cands = [c for c in candidates if c.classification == "TEST_DEMO"]

    assert len(test_cands) == 1

    # Counts before cleanup
    assert db_session.query(Incident).count() == 1
    assert db_session.query(Detection).count() == 1
    assert db_session.query(Evidence).count() == 1
    assert db_session.query(Assignment).count() == 1
    assert db_session.query(Inspection).count() == 1
    assert db_session.query(IncidentStatusHistory).count() == 1

    # Execute cleanup
    counts = execute_cleanup(
        db=db_session,
        candidates_to_delete=test_cands,
        all_candidates=candidates,
        clean_files=False,
    )

    assert counts["incidents"] == 1
    assert counts["detections"] == 1
    assert counts["evidence"] == 1
    assert counts["assignments"] == 1
    assert counts["inspections"] == 1
    assert counts["history"] == 1

    # Verify DB tables are now empty of test rows
    assert db_session.query(Incident).count() == 0
    assert db_session.query(Detection).count() == 0
    assert db_session.query(Evidence).count() == 0
    assert db_session.query(Assignment).count() == 0
    assert db_session.query(Inspection).count() == 0
    assert db_session.query(IncidentStatusHistory).count() == 0


def test_transaction_rolls_back_on_failure(db_session: Session, sample_zone_and_user, monkeypatch):
    """Case G: Verify that if an exception occurs during deletion, the entire transaction rolls back."""
    zone, user = sample_zone_and_user

    create_fixture_incident(
        db=db_session,
        zone=zone,
        incident_code="INC-DEMO-001",
        job_id="demo-job",
        rec_action="DEMO: Puddle repair",
        is_demo=True,
        user=user,
    )

    candidates = inspect_database_incidents(db_session)
    test_cands = [c for c in candidates if c.classification == "TEST_DEMO"]

    # Force an error during Inspection deletion
    def fake_delete(*args, **kwargs):
        raise ValueError("Simulated DB connection failure during delete")

    monkeypatch.setattr("sqlalchemy.orm.Query.delete", fake_delete)

    with pytest.raises(RuntimeError, match="Database cleanup transaction failed and was rolled back"):
        execute_cleanup(
            db=db_session,
            candidates_to_delete=test_cands,
            all_candidates=candidates,
            clean_files=False,
        )

    # Verify incident and relations are intact because of rollback
    assert db_session.query(Incident).count() == 1
    assert db_session.query(Detection).count() == 1


def test_unrelated_real_evidence_files_are_preserved(tmp_path, monkeypatch):
    """Case H: Verify is_safe_to_delete_evidence_file strictly preserves protected files."""
    monkeypatch.setattr("scripts.cleanup_test_data.PROJECT_ROOT", tmp_path)

    outputs_dir = tmp_path / "outputs"
    jobs_dir = outputs_dir / "jobs"
    evidence_dir = outputs_dir / "evidence"
    jobs_dir.mkdir(parents=True)
    evidence_dir.mkdir(parents=True)

    # 1. Real evidence file
    real_file = jobs_dir / "real-live-job" / "evidence" / "hazard_1_HIGH.jpg"
    real_file.parent.mkdir(parents=True)
    real_file.write_text("live bytes")

    # 2. Test evidence file
    test_file = jobs_dir / "test-fiveclass-job" / "evidence" / "hazard_1_HIGH.jpg"
    test_file.parent.mkdir(parents=True)
    test_file.write_text("test bytes")

    # 3. Model weight file (should never be deleted)
    model_file = outputs_dir / "models" / "best.pt"
    model_file.parent.mkdir(parents=True)
    model_file.write_text("model bytes")

    protected_paths = {str(real_file.relative_to(tmp_path)).replace("\\", "/")}

    # Real file must NOT be deleted
    assert not is_safe_to_delete_evidence_file(
        str(real_file.relative_to(tmp_path)),
        candidate_job_id="real-live-job",
        protected_evidence_paths=protected_paths,
    )

    # Model file must NOT be deleted
    assert not is_safe_to_delete_evidence_file(
        str(model_file.relative_to(tmp_path)),
        candidate_job_id="test-fiveclass-job",
        protected_evidence_paths=protected_paths,
    )

    # Test file IS safe to delete
    assert is_safe_to_delete_evidence_file(
        str(test_file.relative_to(tmp_path)),
        candidate_job_id="test-fiveclass-job",
        protected_evidence_paths=protected_paths,
    )


def test_idempotent_cleanup_rerun(db_session: Session, sample_zone_and_user):
    """Case I: Re-running cleanup after successful deletion is safe, idempotent, and does nothing."""
    zone, user = sample_zone_and_user

    create_fixture_incident(
        db=db_session,
        zone=zone,
        incident_code="INC-DEMO-001",
        job_id="demo-job",
        rec_action="DEMO: Puddle repair",
        is_demo=True,
    )

    candidates = inspect_database_incidents(db_session)
    test_cands = [c for c in candidates if c.classification == "TEST_DEMO"]
    assert len(test_cands) == 1

    # First run
    counts1 = execute_cleanup(db_session, test_cands, candidates, clean_files=False)
    assert counts1["incidents"] == 1

    # Second run
    candidates2 = inspect_database_incidents(db_session)
    test_cands2 = [c for c in candidates2 if c.classification == "TEST_DEMO"]
    assert len(test_cands2) == 0

    counts2 = execute_cleanup(db_session, test_cands2, candidates2, clean_files=False)
    assert counts2["incidents"] == 0
    assert counts2["detections"] == 0


def test_empty_candidate_set_performs_no_deletion(db_session: Session):
    """Case J: Empty candidate list produces 0 deletions and causes no errors."""
    counts = execute_cleanup(db_session, [], [], clean_files=False)
    assert counts == {
        "incidents": 0,
        "detections": 0,
        "evidence": 0,
        "assignments": 0,
        "inspections": 0,
        "history": 0,
        "files": 0,
    }


def test_targeted_filters(db_session: Session, sample_zone_and_user):
    """Case K: Test targeted filters for --incident-code, --job-id, and --marker."""
    zone, user = sample_zone_and_user

    create_fixture_incident(db_session, zone, "INC-DEMO-001", "job-demo-alpha", is_demo=True)
    create_fixture_incident(db_session, zone, "INC-FIVECLASS-01", "job-fiveclass-beta")
    create_fixture_incident(db_session, zone, "INC-E2ECONF-02", "job-e2econf-gamma")

    # Filter by code
    res_code = inspect_database_incidents(db_session, filter_code="INC-DEMO-001")
    assert len(res_code) == 1
    assert res_code[0].incident_code == "INC-DEMO-001"

    # Filter by job-id
    res_job = inspect_database_incidents(db_session, filter_job="fiveclass")
    assert len(res_job) == 1
    assert res_job[0].job_id == "job-fiveclass-beta"

    # Filter by marker
    res_marker = inspect_database_incidents(db_session, filter_marker="e2econf")
    assert len(res_marker) == 1
    assert res_marker[0].incident_code == "INC-E2ECONF-02"
