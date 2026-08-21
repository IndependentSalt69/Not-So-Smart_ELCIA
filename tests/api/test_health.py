"""
tests/api/test_health.py
Tests for the /health endpoint.
"""

from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from src.api.main import app
from src.db.session import get_db


def test_health_endpoint_success(client: TestClient):
    """Test /health endpoint when database is connected and healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"]["status"] == "connected"
    assert "timestamp" in data
    assert "app_name" in data


def test_api_prefixed_health_endpoint(client: TestClient):
    """Test /api/health endpoint alias."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"]["status"] == "connected"


def test_health_endpoint_when_database_unavailable():
    """Test that /health returns HTTP 200 degraded even if database is unavailable."""
    mock_db = MagicMock()
    mock_db.execute.side_effect = Exception("Database connection timeout")

    def override_get_db_failure():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db_failure
    try:
        with TestClient(app) as test_client:
            response = test_client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "degraded"
            assert data["database"]["status"] == "disconnected"
            assert "Database connection timeout" in data["database"]["error"]
    finally:
        app.dependency_overrides.clear()
