"""
tests/integration/test_startup.py
Integration tests for FastAPI application startup, OpenAPI schema, and route availability.
"""

from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Verify application root endpoint returns metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data
    assert data["docs_url"] == "/docs"


def test_openapi_schema(client: TestClient):
    """Verify OpenAPI schema generates without errors."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "CivicPulse API"
    assert "/health" in schema["paths"]
    assert "/api/health" in schema["paths"]
    assert "/api/incidents/" in schema["paths"]
    assert "/api/zones/" in schema["paths"]
    assert "/api/users/" in schema["paths"]


def test_zones_skeleton_endpoint(client: TestClient):
    """Verify zones endpoint returns registered zones."""
    response = client.get("/api/zones/")
    assert response.status_code == 200
    zones = response.json()
    assert len(zones) >= 4
    zone_ids = [z["zone_id"] for z in zones]
    assert "EC-01" in zone_ids
    assert "EC-04" in zone_ids


def test_incidents_skeleton_endpoint(client: TestClient):
    """Verify incidents list endpoint responds."""
    response = client.get("/api/incidents/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
