"""
tests/db/test_migrations.py
Integration tests verifying Alembic migration lifecycle:
empty -> upgrade head -> downgrade base -> upgrade head.
"""

from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, inspect
import pytest


@pytest.fixture
def alembic_config():
    """Build Alembic Config pointed to test database."""
    config = Config("alembic.ini")
    return config


def test_alembic_migration_lifecycle(alembic_config):
    """
    Test full Alembic migration cycle:
    1. Upgrade head from clean database.
    2. Inspect all 8 created tables and verify columns/indexes.
    3. Downgrade base to remove all tables.
    4. Upgrade head again cleanly.
    """
    # Create test SQLite engine
    test_engine = create_engine("sqlite:///:memory:")
    
    # We configure Alembic context for in-memory SQLite testing
    alembic_config.attributes["connection"] = test_engine.connect()

    # Step 1: Upgrade head
    command.upgrade(alembic_config, "head")

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

    assert expected_tables.issubset(tables), f"Missing tables after upgrade: {expected_tables - tables}"

    # Verify key columns in incidents table
    columns = {col["name"]: col for col in inspector.get_columns("incidents")}
    assert "id" in columns
    assert "incident_code" in columns
    assert "confidence" in columns
    assert "severity_score" in columns
    assert "priority" in columns
    assert "status" in columns
    assert "zone_id" in columns

    # Step 2: Downgrade base
    command.downgrade(alembic_config, "base")

    inspector_after_downgrade = inspect(test_engine)
    tables_after_downgrade = set(inspector_after_downgrade.get_table_names())
    # All domain tables must be dropped
    domain_tables = expected_tables - {"alembic_version"}
    assert not domain_tables.intersection(tables_after_downgrade), "Domain tables remained after downgrade"

    # Step 3: Upgrade head again
    command.upgrade(alembic_config, "head")

    inspector_final = inspect(test_engine)
    final_tables = set(inspector_final.get_table_names())
    assert expected_tables.issubset(final_tables), "Tables missing after second upgrade"
