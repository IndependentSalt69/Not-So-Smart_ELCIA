"""
tests/scripts/test_reset_demo_db.py
Unit and integration tests for scripts/reset_demo_db.py demo database reset utility.
All tests run against isolated in-memory SQLite test database or temporary directories.
"""

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.db.models.incident import Incident
from src.db.models.detection import Detection
from src.db.models.evidence import Evidence
from src.db.models.assignment import Assignment
from src.db.models.inspection import Inspection
from src.db.models.history import IncidentStatusHistory
from src.db.models.zone import Zone
from src.db.models.user import User
from src.db.models.enums import (
    IncidentType,
    PriorityLevel,
    IncidentStatus,
    EvidenceType,
    InspectionResult,
    UserRole,
)

from scripts.reset_demo_db import (
    APPLICATION_TABLES_IN_ORDER,
    REQUIRED_CONFIRMATION_PHRASE,
    ALLOW_RESET_ENV_VAR,
    inspect_table_row_counts,
    is_reset_authorized_by_env,
    execute_database_reset,
    verify_post_reset_state,
    execute_demo_file_cleanup,
    get_connection_metadata,
    main,
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
    db_session.query(User).delete()
    db_session.query(Zone).delete()
    db_session.commit()
    yield
    db_session.query(Inspection).delete()
    db_session.query(Assignment).delete()
    db_session.query(IncidentStatusHistory).delete()
    db_session.query(Detection).delete()
    db_session.query(Evidence).delete()
    db_session.query(Incident).delete()
    db_session.query(User).delete()
    db_session.query(Zone).delete()
    db_session.commit()


@pytest.fixture
def populated_test_db(db_session: Session):
    """Populate full relational schema in the in-memory test database."""
    unique_suffix = uuid.uuid4().hex[:8]

    # 1. Zone
    zone = Zone(
        id=uuid.uuid4(),
        code=f"EC-RESET-{unique_suffix}",
        name=f"Reset Test Zone {unique_suffix}",
        description="Test zone for database reset testing",
    )
    db_session.add(zone)

    # 2. User
    user = User(
        id=uuid.uuid4(),
        email=f"reset_inspector_{unique_suffix}@elcia.in",
        name="Reset Test Inspector",
        role=UserRole.INSPECTOR,
    )
    db_session.add(user)
    db_session.flush()

    # 3. Incident
    incident = Incident(
        id=uuid.uuid4(),
        incident_code=f"INC-RESET-{unique_suffix}",
        incident_type=IncidentType.WATERLOGGING,
        confidence=0.92,
        severity_score=8.0,
        priority=PriorityLevel.P1,
        zone_id=zone.id,
        status=IncidentStatus.DETECTED,
        started_at=datetime.now(timezone.utc),
        duration_seconds=30.0,
        recommended_action="Deploy emergency pumps",
    )
    db_session.add(incident)
    db_session.flush()

    # 4. Detection
    detection = Detection(
        id=uuid.uuid4(),
        incident_id=incident.id,
        detection_type="waterlogging",
        confidence=0.92,
        frame_number=10,
        detected_at=datetime.now(timezone.utc),
    )
    db_session.add(detection)

    # 5. Evidence
    evidence = Evidence(
        id=uuid.uuid4(),
        incident_id=incident.id,
        evidence_type=EvidenceType.IMAGE,
        file_path="outputs/evidence/test_frame.jpg",
        is_primary=True,
    )
    db_session.add(evidence)
    db_session.flush()

    # 6. Assignment
    assignment = Assignment(
        id=uuid.uuid4(),
        incident_id=incident.id,
        assigned_to=user.id,
        assigned_team="Rapid Response Alpha",
        assigned_at=datetime.now(timezone.utc),
    )
    db_session.add(assignment)

    # 7. Status History
    history = IncidentStatusHistory(
        id=uuid.uuid4(),
        incident_id=incident.id,
        old_status=IncidentStatus.DETECTED,
        new_status=IncidentStatus.VERIFIED,
        changed_by=user.id,
        comment="Verified during test",
        changed_at=datetime.now(timezone.utc),
    )
    db_session.add(history)

    # 8. Inspection
    inspection = Inspection(
        id=uuid.uuid4(),
        incident_id=incident.id,
        inspector_id=user.id,
        inspection_time=datetime.now(timezone.utc),
        result=InspectionResult.RESOLVED,
        notes="Site clear",
        evidence_id=evidence.id,
    )
    db_session.add(inspection)

    # 9. Create alembic_version table to simulate migration presence
    db_session.execute(text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) PRIMARY KEY)"))
    db_session.execute(text("DELETE FROM alembic_version"))
    db_session.execute(text("INSERT INTO alembic_version (version_num) VALUES ('20260904_003')"))

    db_session.commit()
    return db_session


# ------------------------------------------------------------------------------
# 1. Environment Authorization Tests
# ------------------------------------------------------------------------------

def test_environment_authorization_check():
    """Verify is_reset_authorized_by_env recognizes authorized values."""
    with patch.dict(os.environ, {ALLOW_RESET_ENV_VAR: "true"}):
        assert is_reset_authorized_by_env() is True

    with patch.dict(os.environ, {ALLOW_RESET_ENV_VAR: "1"}):
        assert is_reset_authorized_by_env() is True

    with patch.dict(os.environ, {ALLOW_RESET_ENV_VAR: "yes"}):
        assert is_reset_authorized_by_env() is True

    with patch.dict(os.environ, {ALLOW_RESET_ENV_VAR: "false"}):
        assert is_reset_authorized_by_env() is False

    with patch.dict(os.environ, {}, clear=True):
        assert is_reset_authorized_by_env() is False


# ------------------------------------------------------------------------------
# 2. Row Count Inspection & Metadata Tests
# ------------------------------------------------------------------------------

def test_inspect_table_row_counts(populated_test_db: Session):
    """Verify table inspection correctly reports counts across all operational tables."""
    engine = populated_test_db.get_bind()
    counts = inspect_table_row_counts(engine, APPLICATION_TABLES_IN_ORDER)

    assert counts["incidents"] >= 1
    assert counts["detections"] >= 1
    assert counts["evidence"] >= 1
    assert counts["assignments"] >= 1
    assert counts["incident_status_history"] >= 1
    assert counts["inspections"] >= 1


def test_connection_metadata_extraction():
    """Verify get_connection_metadata handles various database URL strings."""
    meta_sqlite = get_connection_metadata("sqlite:///:memory:")
    assert meta_sqlite["dialect"] == "sqlite"

    meta_pg = get_connection_metadata("postgresql+psycopg://user:pass@dbhost:5432/testdb")
    assert meta_pg["dialect"] == "postgresql"
    assert meta_pg["host"] == "dbhost"
    assert meta_pg["port"] == "5432"
    assert meta_pg["db"] == "testdb"
    assert meta_pg["user"] == "user"


# ------------------------------------------------------------------------------
# 3. Transactional Deletion & Foreign Key Order Tests
# ------------------------------------------------------------------------------

def test_authorized_reset_empties_operational_tables_and_preserves_users_zones(populated_test_db: Session):
    """Verify execute_database_reset deletes operational activity while preserving users, zones, and alembic_version."""
    engine = populated_test_db.get_bind()

    # Pre-reset check
    counts_before = inspect_table_row_counts(engine, APPLICATION_TABLES_IN_ORDER)
    assert sum(counts_before.values()) > 0

    user_count_before = inspect_table_row_counts(engine, ["users"])["users"]
    zone_count_before = inspect_table_row_counts(engine, ["zones"])["zones"]
    assert user_count_before >= 1
    assert zone_count_before >= 1

    # Execute reset
    deleted_counts, total_deleted = execute_database_reset(engine)
    assert total_deleted > 0

    # Post-reset verification
    is_valid, errors = verify_post_reset_state(engine)
    assert is_valid is True, f"Post-reset verification failed: {errors}"

    counts_after = inspect_table_row_counts(engine, APPLICATION_TABLES_IN_ORDER)
    for tbl, count in counts_after.items():
        assert count == 0, f"Operational table '{tbl}' was not emptied (count: {count})"

    # Verify users and zones were PRESERVED
    user_count_after = inspect_table_row_counts(engine, ["users"])["users"]
    zone_count_after = inspect_table_row_counts(engine, ["zones"])["zones"]
    assert user_count_after == user_count_before
    assert zone_count_after == zone_count_before

    # Verify alembic_version was preserved
    with engine.connect() as conn:
        ver = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        assert ver == "20260904_003"


def test_transaction_rollback_on_error(populated_test_db: Session):
    """Verify that a failure during deletion triggers a full rollback."""
    engine = populated_test_db.get_bind()

    counts_before = inspect_table_row_counts(engine, APPLICATION_TABLES_IN_ORDER)
    total_before = sum(counts_before.values())

    # Simulate an error on the second table deletion
    call_count = 0

    from sqlalchemy.engine import Connection
    orig_exec = Connection.execute

    def failing_execute(self, statement, *multiparams, **params):
        nonlocal call_count
        call_count += 1
        # Fail after executing the first deletion
        if call_count > 1 and "DELETE FROM" in str(statement):
            raise RuntimeError("Simulated DB Failure During Reset")
        return orig_exec(self, statement, *multiparams, **params)

    with patch.object(Connection, "execute", side_effect=failing_execute, autospec=True):
        with pytest.raises(RuntimeError, match="Simulated DB Failure"):
            execute_database_reset(engine)

    # Verify data was rolled back and still exists
    counts_after = inspect_table_row_counts(engine, APPLICATION_TABLES_IN_ORDER)
    total_after = sum(counts_after.values())
    assert total_after == total_before


def test_post_reset_verification_detects_preserved_table_count_change(populated_test_db: Session):
    """Verify verify_post_reset_state flags an error if users or zones count changed."""
    engine = populated_test_db.get_bind()

    # Suppose before reset we had 5 users, but now only 1
    is_valid, errors = verify_post_reset_state(
        target_engine=engine,
        expected_preserved_counts={"users": 99, "zones": 1},
    )
    assert is_valid is False
    assert any("users" in err and "count changed" in err for err in errors)


def test_post_reset_verification_detects_alembic_version_change(populated_test_db: Session):
    """Verify verify_post_reset_state flags an error if Alembic version changed."""
    engine = populated_test_db.get_bind()

    is_valid, errors = verify_post_reset_state(
        target_engine=engine,
        expected_alembic_version="different_version_hash",
    )
    assert is_valid is False
    assert any("Alembic version changed" in err for err in errors)


# ------------------------------------------------------------------------------
# 4. Optional File Cleanup Tests
# ------------------------------------------------------------------------------

def test_demo_file_cleanup_protects_code_and_weights(tmp_path: Path):
    """Verify execute_demo_file_cleanup removes generated files while protecting code, models, and .gitkeep."""
    # Setup mock output directory structure
    jobs_dir = tmp_path / "outputs" / "jobs" / "job-123"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    evidence_dir = tmp_path / "outputs" / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    uploads_dir = tmp_path / "uploads" / "upload-abc"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Artifacts that SHOULD be deleted
    (jobs_dir / "output.mp4").write_text("dummy video")
    (jobs_dir / "processing.log").write_text("dummy log")
    (evidence_dir / "frame_001.jpg").write_bytes(b"\xff\xd8\xff")
    (uploads_dir / "raw_drone.mp4").write_text("dummy raw video")

    # Protected files that MUST NOT be deleted
    (evidence_dir / ".gitkeep").write_text("")
    (tmp_path / "outputs" / "model_weights.pt").write_text("model weights")
    (tmp_path / "outputs" / "script.py").write_text("print('hello')")

    files_removed, dirs_removed = execute_demo_file_cleanup(base_path=tmp_path)

    assert files_removed == 4
    assert not (jobs_dir / "output.mp4").exists()
    assert not (evidence_dir / "frame_001.jpg").exists()
    assert not (uploads_dir / "raw_drone.mp4").exists()

    # Verify protected files remain
    assert (evidence_dir / ".gitkeep").exists()
    assert (tmp_path / "outputs" / "model_weights.pt").exists()
    assert (tmp_path / "outputs" / "script.py").exists()


# ------------------------------------------------------------------------------
# 5. CLI Invocation Safety Tests
# ------------------------------------------------------------------------------

def test_cli_dry_run_by_default(populated_test_db: Session):
    """Verify running CLI without --confirm performs dry run only."""
    engine = populated_test_db.get_bind()

    with patch("sys.argv", ["reset_demo_db.py"]):
        exit_code = main(engine_override=engine)
        assert exit_code == 0

    # Ensure no rows deleted
    counts = inspect_table_row_counts(engine, APPLICATION_TABLES_IN_ORDER)
    assert sum(counts.values()) > 0


def test_cli_refuses_without_env_authorization(populated_test_db: Session):
    """Verify CLI with --confirm fails if environment variable is missing."""
    engine = populated_test_db.get_bind()

    with patch.dict(os.environ, {}, clear=True):
        with patch("sys.argv", ["reset_demo_db.py", "--confirm"]):
            exit_code = main(engine_override=engine)
            assert exit_code == 1

    counts = inspect_table_row_counts(engine, APPLICATION_TABLES_IN_ORDER)
    assert sum(counts.values()) > 0


def test_cli_refuses_on_wrong_confirmation_phrase(populated_test_db: Session):
    """Verify CLI fails when interactive confirmation phrase is incorrect."""
    engine = populated_test_db.get_bind()

    with patch.dict(os.environ, {ALLOW_RESET_ENV_VAR: "true"}):
        with patch("builtins.input", return_value="wrong phrase"):
            with patch("sys.argv", ["reset_demo_db.py", "--confirm"]):
                exit_code = main(engine_override=engine)
                assert exit_code == 1

    counts = inspect_table_row_counts(engine, APPLICATION_TABLES_IN_ORDER)
    assert sum(counts.values()) > 0


def test_cli_successful_authorized_execution(populated_test_db: Session):
    """Verify CLI succeeds when both env authorization and matching phrase are provided."""
    engine = populated_test_db.get_bind()

    with patch.dict(os.environ, {ALLOW_RESET_ENV_VAR: "true"}):
        with patch("builtins.input", return_value=REQUIRED_CONFIRMATION_PHRASE):
            with patch("sys.argv", ["reset_demo_db.py", "--confirm"]):
                exit_code = main(engine_override=engine)
                assert exit_code == 0

    counts = inspect_table_row_counts(engine, APPLICATION_TABLES_IN_ORDER)
    assert sum(counts.values()) == 0

