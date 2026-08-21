"""
tests/conftest.py
Pytest fixtures for CivicPulse API and Database tests.
"""

import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api.main import app
from src.db.base import Base
from src.db.session import get_db

# Create an in-memory SQLite database for fast unit testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


# Register dummy SpatiaLite SQL functions for SQLite unit testing
from sqlalchemy import event


@event.listens_for(test_engine, "connect")
def _register_sqlite_spatial_udfs(dbapi_connection, connection_record):
    def dummy_spatial_udf(*args):
        return None

    spatial_funcs = [
        "GeomFromEWKT",
        "GeomFromText",
        "GeomFromWKB",
        "AsEWKB",
        "AsText",
        "AsBinary",
        "ST_AsText",
        "ST_GeomFromText",
        "ST_GeomFromEWKT",
        "ST_WKBToSQL",
        "ST_AsBinary",
        "SetSRID",
    ]
    for func_name in spatial_funcs:
        try:
            dbapi_connection.create_function(func_name, -1, dummy_spatial_udf)
        except Exception:
            pass


# Disable SpatiaLite C extension function calls during SQLite unit testing
try:
    import geoalchemy2.admin.dialects.sqlite
    geoalchemy2.admin.dialects.sqlite.after_create = lambda *args, **kwargs: None
    geoalchemy2.admin.dialects.sqlite.before_drop = lambda *args, **kwargs: None
    geoalchemy2.admin.dialects.sqlite.after_drop = lambda *args, **kwargs: None
except Exception:
    pass



@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables in memory before testing and drop after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """Yield a database session for an individual test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """FastAPI TestClient with overridden database dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
