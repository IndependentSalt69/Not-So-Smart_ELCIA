"""
tests/scripts/test_restore_operational_zones.py
Unit and integration tests for scripts/restore_operational_zones.py operational zone restore utility.
All tests run against an isolated in-memory SQLite database.
"""

import uuid
from unittest.mock import patch
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.db.models.zone import Zone
from src.db.models.user import User
from src.db.models.incident import Incident
from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus, UserRole

from scripts.restore_operational_zones import (
    AUTHORITATIVE_ZONES,
    inspect_zones_status,
    restore_missing_zones,
    verify_operational_zones,
    main,
)


@pytest.fixture(autouse=True)
def clean_db_tables(db_session: Session):
    """Ensure clean tables before and after each test."""
    db_session.query(Incident).delete()
    db_session.query(User).delete()
    db_session.query(Zone).delete()
    db_session.commit()
    yield
    db_session.query(Incident).delete()
    db_session.query(User).delete()
    db_session.query(Zone).delete()
    db_session.commit()


# ------------------------------------------------------------------------------
# 1. Inspection and Status Tests
# ------------------------------------------------------------------------------

def test_inspect_zones_status_all_missing(db_session: Session):
    """When database is empty, all 4 authoritative zones should be reported missing."""
    present, missing = inspect_zones_status(db_session)
    assert len(present) == 0
    assert len(missing) == 4
    missing_codes = {m["definition"]["code"] for m in missing}
    assert missing_codes == {"EC-01", "EC-02", "EC-03", "EC-04"}


def test_inspect_zones_status_partial(db_session: Session):
    """When some zones exist, inspect_zones_status correctly partitions present and missing."""
    existing_zone = Zone(
        id=uuid.uuid4(),
        code="EC-01",
        name="Custom EC-01 Name",
        description="Custom description",
    )
    db_session.add(existing_zone)
    db_session.commit()

    present, missing = inspect_zones_status(db_session)
    assert len(present) == 1
    assert present[0]["definition"]["code"] == "EC-01"
    assert present[0]["record"].name == "Custom EC-01 Name"
    assert len(missing) == 3
    missing_codes = {m["definition"]["code"] for m in missing}
    assert missing_codes == {"EC-02", "EC-03", "EC-04"}


# ------------------------------------------------------------------------------
# 2. Restoration & Idempotency Tests
# ------------------------------------------------------------------------------

def test_restore_missing_zones_creates_all(db_session: Session):
    """Restoring all missing zones creates 4 valid zones with geometry."""
    present, missing = inspect_zones_status(db_session)
    created = restore_missing_zones(db_session, missing)

    assert len(created) == 4
    created_codes = [z.code for z in created]
    assert created_codes == ["EC-01", "EC-02", "EC-03", "EC-04"]

    # Verify query in database
    db_zones = db_session.query(Zone).order_by(Zone.code).all()
    assert len(db_zones) == 4
    assert [z.code for z in db_zones] == ["EC-01", "EC-02", "EC-03", "EC-04"]
    for z in db_zones:
        assert z.geometry is not None
        assert z.name is not None
        assert z.description is not None


def test_restore_preserves_existing_zones(db_session: Session):
    """Existing zones are preserved and not overwritten or duplicated."""
    existing_id = uuid.uuid4()
    custom_zone = Zone(
        id=existing_id,
        code="EC-01",
        name="Pre-existing Custom Name",
        description="Pre-existing Custom Description",
    )
    db_session.add(custom_zone)
    db_session.commit()

    # Run inspection and restore missing
    present, missing = inspect_zones_status(db_session)
    created = restore_missing_zones(db_session, missing)

    assert len(created) == 3  # Only EC-02, EC-03, EC-04
    assert all(z.code != "EC-01" for z in created)

    # Verify EC-01 was NOT overwritten
    ec01 = db_session.query(Zone).filter(Zone.code == "EC-01").first()
    assert ec01 is not None
    assert ec01.id == existing_id
    assert ec01.name == "Pre-existing Custom Name"
    assert ec01.description == "Pre-existing Custom Description"

    # Total zones is 4
    assert db_session.query(Zone).count() == 4


def test_restore_is_strictly_idempotent(db_session: Session):
    """Running restoration multiple times produces no new rows or errors."""
    # First execution
    _, missing1 = inspect_zones_status(db_session)
    created1 = restore_missing_zones(db_session, missing1)
    assert len(created1) == 4
    assert db_session.query(Zone).count() == 4

    # Second execution
    present2, missing2 = inspect_zones_status(db_session)
    assert len(present2) == 4
    assert len(missing2) == 0
    created2 = restore_missing_zones(db_session, missing2)
    assert len(created2) == 0
    assert db_session.query(Zone).count() == 4


# ------------------------------------------------------------------------------
# 3. No Other Tables Modified
# ------------------------------------------------------------------------------

def test_no_other_tables_modified(db_session: Session):
    """Restoration must never create, modify, or delete users or incidents."""
    user = User(
        id=uuid.uuid4(),
        email="operator@elcia.in",
        name="ELCIA Operator",
        role=UserRole.OPERATOR,
    )
    db_session.add(user)
    db_session.commit()

    user_count_before = db_session.query(User).count()
    incident_count_before = db_session.query(Incident).count()

    # Run restoration
    _, missing = inspect_zones_status(db_session)
    restore_missing_zones(db_session, missing)

    assert db_session.query(User).count() == user_count_before
    assert db_session.query(Incident).count() == incident_count_before
    preserved_user = db_session.query(User).filter(User.email == "operator@elcia.in").first()
    assert preserved_user is not None
    assert preserved_user.name == "ELCIA Operator"


# ------------------------------------------------------------------------------
# 4. Verification Logic Tests
# ------------------------------------------------------------------------------

def test_verify_operational_zones_success(db_session: Session):
    """verify_operational_zones returns True when all 4 zones exist with geometry."""
    _, missing = inspect_zones_status(db_session)
    restore_missing_zones(db_session, missing)

    is_valid, errors = verify_operational_zones(db_session)
    assert is_valid is True
    assert len(errors) == 0


def test_verify_operational_zones_missing(db_session: Session):
    """verify_operational_zones flags missing zones."""
    is_valid, errors = verify_operational_zones(db_session)
    assert is_valid is False
    assert len(errors) == 4
    assert any("EC-01 is missing" in err for err in errors)


# ------------------------------------------------------------------------------
# 5. CLI Dry-Run and Apply Tests
# ------------------------------------------------------------------------------

def test_cli_dry_run_by_default(db_session: Session):
    """Running CLI without --apply performs dry run and inserts 0 rows."""
    engine = db_session.get_bind()

    with patch("sys.argv", ["restore_operational_zones.py"]):
        exit_code = main(engine_override=engine)
        assert exit_code == 0

    assert db_session.query(Zone).count() == 0


def test_cli_apply_inserts_zones(db_session: Session):
    """Running CLI with --apply inserts missing zones and returns 0."""
    engine = db_session.get_bind()

    with patch("sys.argv", ["restore_operational_zones.py", "--apply"]):
        exit_code = main(engine_override=engine)
        assert exit_code == 0

    # Ensure all 4 zones exist in the database
    db_session.expire_all()
    assert db_session.query(Zone).count() == 4
    codes = [z.code for z in db_session.query(Zone).order_by(Zone.code).all()]
    assert codes == ["EC-01", "EC-02", "EC-03", "EC-04"]
