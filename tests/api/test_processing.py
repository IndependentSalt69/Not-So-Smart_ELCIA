"""
tests/api/test_processing.py
Unit and integration tests for FastAPI ML video processing job endpoints (Phase 11B).
"""

import io
import pytest
from fastapi.testclient import TestClient
from src.services.processing_job_manager import job_manager, JobStatus


def test_process_job_missing_video(client: TestClient):
    """Test that POST /api/v1/process without a video file returns HTTP 422 Unprocessable Entity."""
    response = client.post("/api/v1/process", data={"zone_id": "EC-01"})
    assert response.status_code == 422


def test_process_job_invalid_video_extension(client: TestClient):
    """Test that uploading a file with an invalid video extension (e.g. .txt) returns HTTP 400."""
    fake_file = io.BytesIO(b"fake text content")
    response = client.post(
        "/api/v1/process",
        files={"video": ("sample_script.txt", fake_file, "text/plain")},
    )
    assert response.status_code == 400
    assert "Invalid video file extension" in response.json()["detail"]


def test_process_job_invalid_srt_extension(client: TestClient):
    """Test that uploading an SRT file with an invalid extension returns HTTP 400."""
    fake_video = io.BytesIO(b"ftypmp42fakevideocontent")
    fake_srt = io.BytesIO(b"invalid srt format")
    response = client.post(
        "/api/v1/process",
        files={
            "video": ("clip.mp4", fake_video, "video/mp4"),
            "srt": ("subtitle.json", fake_srt, "application/json"),
        },
    )
    assert response.status_code == 400
    assert "Invalid SRT file extension" in response.json()["detail"]


def test_process_job_empty_video(client: TestClient):
    """Test that uploading an empty 0-byte video returns HTTP 400."""
    fake_video = io.BytesIO(b"")
    response = client.post(
        "/api/v1/process",
        files={"video": ("empty.mp4", fake_video, "video/mp4")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_process_job_nonexistent_job_status(client: TestClient):
    """Test that polling a non-existent job UUID returns HTTP 404 Not Found."""
    response = client.get("/api/v1/process/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert "job not found" in response.json()["detail"].lower()



def test_process_job_valid_submission(client: TestClient):
    """Test happy path submission returning HTTP 202 Accepted with job UUID and status QUEUED."""
    fake_video = io.BytesIO(b"ftypisom\x00\x00\x02\x00isomiso2avc1mp41fakevideodata")
    fake_srt = io.BytesIO(b"1\n00:00:01,000 --> 00:00:02,000\n[latitude: 12.8452][longitude: 77.6631]\n\n")

    response = client.post(
        "/api/v1/process",
        files={
            "video": ("drone_test.mp4", fake_video, "video/mp4"),
            "srt": ("drone_test.srt", fake_srt, "text/plain"),
        },
        data={"zone_id": "EC-01", "drone_id": "DRONE-ALPHA-1"},
    )

    assert response.status_code == 202
    payload = response.json()
    assert "job_id" in payload
    assert payload["status"] == "QUEUED"
    assert "created_at" in payload

    # Poll status immediately
    job_id = payload["job_id"]
    poll_res = client.get(f"/api/v1/process/{job_id}")
    assert poll_res.status_code == 200
    poll_payload = poll_res.json()
    assert poll_payload["job_id"] == job_id
    assert poll_payload["status"] in ("QUEUED", "PROCESSING", "FAILED", "COMPLETED")


def test_job_manager_concurrency_queue():
    """Verify that ProcessingJobManager limits concurrent processing jobs to MAX_CONCURRENT_ML_JOBS=1."""
    assert job_manager.max_concurrent_jobs == 1
