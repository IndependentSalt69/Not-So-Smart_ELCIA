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
    assert "/api/v1/incidents/" in schema["paths"]
    assert "/api/v1/zones/" in schema["paths"]
    assert "/api/v1/users/" in schema["paths"]


def test_zones_endpoint(client: TestClient):
    """Verify zones list endpoint responds."""
    response = client.get("/api/v1/zones/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_incidents_endpoint(client: TestClient):
    """Verify incidents list endpoint responds with paginated structure."""
    response = client.get("/api/v1/incidents/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "skip" in data
    assert "limit" in data
