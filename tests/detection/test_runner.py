"""
tests/detection/test_runner.py
Unit tests for safe parameterized ML runner (src.detection.runner).
"""

import sys
import subprocess
from pathlib import Path
import pytest


def test_runner_missing_required_args():
    """Verify that runner fails cleanly when required arguments are missing."""
    res = subprocess.run(
        [sys.executable, "-m", "src.detection.runner"],
        capture_output=True,
        text=True,
    )
    assert res.returncode != 0


def test_runner_nonexistent_video(tmp_path):
    """Verify clean exit code 1 and structured error logging when video file is missing."""
    job_id = "test-missing-video"
    output_dir = tmp_path / "output"

    res = subprocess.run(
        [
            sys.executable,
            "-m",
            "src.detection.runner",
            "--video",
            "data_raw/non_existent_video.mp4",
            "--output-dir",
            str(output_dir),
            "--job-id",
            job_id,
        ],
        capture_output=True,
        text=True,
    )

    assert res.returncode == 1
    assert f"[JOB:{job_id}] ERROR=" in res.stdout
    assert f"[JOB:{job_id}] EXIT=1" in res.stdout


def test_runner_nonexistent_srt(tmp_path):
    """Verify clean exit code 1 when video exists but SRT does not exist."""
    job_id = "test-missing-srt"
    output_dir = tmp_path / "output"

    # Create dummy video file
    video_file = tmp_path / "dummy.mp4"
    video_file.write_text("fake_video_content")

    res = subprocess.run(
        [
            sys.executable,
            "-m",
            "src.detection.runner",
            "--video",
            str(video_file),
            "--srt",
            "data_raw/non_existent_telemetry.srt",
            "--output-dir",
            str(output_dir),
            "--job-id",
            job_id,
        ],
        capture_output=True,
        text=True,
    )

    assert res.returncode == 1
    assert f"[JOB:{job_id}] ERROR=" in res.stdout
    assert f"[JOB:{job_id}] EXIT=1" in res.stdout
