"""
tests/api/test_evidence_static.py
Unit and security tests for static evidence media serving under /static/evidence.
"""

import os
from fastapi.testclient import TestClient
from src.core.config import settings


def test_valid_evidence_static_serving(client: TestClient):
    """Test that an existing evidence file is served with HTTP 200 and image/jpeg Content-Type."""
    test_filename = "test_serving_sample.jpg"
    test_filepath = os.path.join(settings.EVIDENCE_DIR, test_filename)
    
    # Create a small dummy JPEG header/bytes file
    os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
    with open(test_filepath, "wb") as f:
        f.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb")

    try:
        response = client.get(f"/static/evidence/{test_filename}")
        assert response.status_code == 200
        assert "image/jpeg" in response.headers.get("content-type", "").lower()
        assert len(response.content) > 0
    finally:
        if os.path.exists(test_filepath):
            os.remove(test_filepath)


def test_nonexistent_evidence_returns_404(client: TestClient):
    """Test that requesting a non-existent evidence file returns HTTP 404."""
    response = client.get("/static/evidence/non_existent_file_99999.jpg")
    assert response.status_code == 404


def test_path_traversal_prevention(client: TestClient):
    """Test that path traversal attempts (../) outside outputs/evidence are rejected."""
    # Attempt directory traversal to read parent files
    response = client.get("/static/evidence/../config.py")
    assert response.status_code in (404, 400)

    response2 = client.get("/static/evidence/..%2fconfig.py")
    assert response2.status_code in (404, 400)


def test_unexposed_directories_are_not_served(client: TestClient):
    """Test that non-mounted application directories (e.g. /static/models, /static/src) return 404."""
    response = client.get("/static/models/civicpulse_best.pt")
    assert response.status_code == 404

    response2 = client.get("/static/data_raw/demo_video.mov")
    assert response2.status_code == 404
