"""
tests/db/test_session.py
Unit tests for database session and metadata initialization.
"""

from src.db.base import Base
from src.db.session import engine, SessionLocal, get_db


def test_base_metadata_exists():
    """Verify Declarative Base and metadata are properly defined."""
    assert Base.metadata is not None


def test_session_generator():
    """Verify get_db generator yields a session and closes it."""
    generator = get_db()
    session = next(generator)
    assert session is not None
    try:
        # Session should be open
        assert session.is_active
    finally:
        try:
            next(generator)
        except StopIteration:
            pass
