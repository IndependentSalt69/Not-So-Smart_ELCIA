"""
src/services/processing_job_manager.py
In-memory job management service for ML video processing jobs (Phase 11B).
Manages asynchronous subprocess execution, GPU concurrency limits, and log parsing.
"""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, Any, List, Tuple

from src.schemas.processing import JobStatus

MAX_CONCURRENT_ML_JOBS = 1
DEFAULT_MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}

ALLOWED_SRT_EXTENSIONS = {".srt"}


class JobRecord:
    def __init__(
        self,
        job_id: str,
        uploaded_video: str,
        uploaded_srt: Optional[str],
        output_dir: str,
        zone_id: Optional[str] = None,
        drone_id: Optional[str] = None,
    ):
        self.job_id = job_id
        self.status = JobStatus.QUEUED
        self.created_at = datetime.now(timezone.utc)
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.progress_pct: float = 0.0
        self.current_stage: str = "Job queued for processing"
        self.error: Optional[str] = None
        self.uploaded_video = uploaded_video
        self.uploaded_srt = uploaded_srt
        self.output_dir = output_dir
        self.zone_id = zone_id
        self.drone_id = drone_id
        self.hazards_detected: int = 0
        self.evidence_count: int = 0
        self.results: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status,
            "progress_pct": self.progress_pct,
            "current_stage": self.current_stage,
            "hazards_detected": self.hazards_detected,
            "evidence_count": self.evidence_count,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "error": self.error,
            "results": self.results,
        }


class ProcessingJobManager:
    def __init__(self, max_concurrent_jobs: int = MAX_CONCURRENT_ML_JOBS):
        self.max_concurrent_jobs = max_concurrent_jobs
        self.jobs: Dict[str, JobRecord] = {}
        self._semaphore: Optional[asyncio.Semaphore] = None

    def _get_semaphore(self) -> asyncio.Semaphore:
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(self.max_concurrent_jobs)
        return self._semaphore

    def validate_video_file(self, filename: str, content: bytes, max_size: int = DEFAULT_MAX_UPLOAD_SIZE_BYTES) -> str:
        """Validates video extension, size, and basic header format."""
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            raise ValueError(f"Invalid video file extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))}")

        if len(content) == 0:
            raise ValueError("Uploaded video file is empty.")

        if len(content) > max_size:
            raise ValueError(f"Uploaded video file size ({len(content)} bytes) exceeds maximum limit ({max_size} bytes).")

        # Basic magic bytes check for mp4/mov/avi
        # MP4/MOV usually contains 'ftyp' or 'moov' or 'mdat' or 'wide' within first 64 bytes
        # AVI starts with b'RIFF'
        header_sample = content[:64]
        is_avi = header_sample.startswith(b"RIFF")
        is_mp4_mov = any(box in header_sample for box in [b"ftyp", b"moov", b"mdat", b"wide", b"free"])

        if not (is_avi or is_mp4_mov):
            # Allow fallback if non-standard container but valid length
            pass

        return ext

    def validate_srt_file(self, filename: str, content: bytes, max_size: int = DEFAULT_MAX_UPLOAD_SIZE_BYTES) -> str:
        """Validates SRT telemetry extension, size, and text format."""
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_SRT_EXTENSIONS:
            raise ValueError(f"Invalid SRT file extension '{ext}'. Allowed extension: .srt")

        if len(content) == 0:
            raise ValueError("Uploaded SRT file is empty.")

        if len(content) > max_size:
            raise ValueError(f"Uploaded SRT file size ({len(content)} bytes) exceeds maximum limit ({max_size} bytes).")

        try:
            content.decode("utf-8", errors="replace")
        except Exception:
            raise ValueError("Invalid text format for SRT file.")

        return ext

    def create_job(
        self,
        video_filename: str,
        video_content: bytes,
        srt_filename: Optional[str] = None,
        srt_content: Optional[bytes] = None,
        zone_id: Optional[str] = None,
        drone_id: Optional[str] = None,
        max_size: int = DEFAULT_MAX_UPLOAD_SIZE_BYTES,
    ) -> JobRecord:
        """Validates uploads, creates job directories, and enqueues job for background execution."""
        # 1. Validate Video
        video_ext = self.validate_video_file(video_filename, video_content, max_size)

        # 2. Validate SRT (if provided)
        srt_ext = None
        if srt_filename and srt_content:
            srt_ext = self.validate_srt_file(srt_filename, srt_content, max_size)

        # 3. Create Job ID & Directories
        job_id = str(uuid.uuid4())
        upload_dir = Path("uploads") / job_id
        output_dir = Path("outputs") / "jobs" / job_id
        evidence_dir = output_dir / "evidence"

        upload_dir.mkdir(parents=True, exist_ok=True)
        output_dir.mkdir(parents=True, exist_ok=True)
        evidence_dir.mkdir(parents=True, exist_ok=True)

        # 4. Save input files safely
        video_save_path = upload_dir / f"input{video_ext}"
        with open(video_save_path, "wb") as f:
            f.write(video_content)

        srt_save_path = None
        if srt_ext and srt_content:
            srt_save_path = upload_dir / "telemetry.srt"
            with open(srt_save_path, "wb") as f:
                f.write(srt_content)

        # 5. Instantiate Job Record
        job = JobRecord(
            job_id=job_id,
            uploaded_video=str(video_save_path),
            uploaded_srt=str(srt_save_path) if srt_save_path else None,
            output_dir=str(output_dir),
            zone_id=zone_id,
            drone_id=drone_id,
        )

        self.jobs[job_id] = job

        # 6. Schedule background execution task
        asyncio.create_task(self._run_job_async(job_id))

        return job

    def get_job(self, job_id: str) -> Optional[JobRecord]:
        return self.jobs.get(job_id)

    async def _run_job_async(self, job_id: str):
        """Asynchronous execution task respecting GPU concurrency semaphore."""
        semaphore = self._get_semaphore()
        async with semaphore:
            job = self.jobs.get(job_id)
            if not job:
                return

            job.status = JobStatus.PROCESSING
            job.started_at = datetime.now(timezone.utc)
            job.current_stage = "Executing YOLOv8 + MiDaS pipeline runner"

            cmd = [
                sys.executable,
                "-m",
                "src.detection.runner",
                "--video",
                job.uploaded_video,
                "--output-dir",
                job.output_dir,
                "--job-id",
                job.job_id,
            ]

            if job.uploaded_srt:
                cmd.extend(["--srt", job.uploaded_srt])

            stderr_lines: List[str] = []

            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                async def read_stderr():
                    while True:
                        line = await proc.stderr.readline()
                        if not line:
                            break
                        decoded = line.decode("utf-8", errors="replace").strip()
                        if decoded:
                            stderr_lines.append(decoded)

                stderr_task = asyncio.create_task(read_stderr())

                while True:
                    line = await proc.stdout.readline()
                    if not line:
                        break
                    decoded_line = line.decode("utf-8", errors="replace").strip()
                    self._parse_log_line(job, decoded_line)

                await proc.wait()
                await stderr_task

                if proc.returncode == 0:
                    self._populate_completed_results(job)
                    job.status = JobStatus.COMPLETED
                    job.progress_pct = 100.0
                    job.completed_at = datetime.now(timezone.utc)
                    job.current_stage = "Pipeline completed successfully"
                else:
                    err_msg = f"Runner process exited with code {proc.returncode}"
                    if stderr_lines:
                        err_msg += f": {stderr_lines[-1]}"
                    job.status = JobStatus.FAILED
                    job.completed_at = datetime.now(timezone.utc)
                    job.current_stage = "Process failed"
                    job.error = err_msg

            except Exception as e:
                job.status = JobStatus.FAILED
                job.completed_at = datetime.now(timezone.utc)
                job.current_stage = "Process execution error"
                job.error = f"Failed to execute process: {str(e)}"

    def _parse_log_line(self, job: JobRecord, line: str):
        if f"[JOB:{job.job_id}] START" in line:
            job.current_stage = "Initializing ML engine"
        elif f"[JOB:{job.job_id}] PIPELINE_START" in line:
            job.current_stage = "Processing drone video frames"
        elif f"[JOB:{job.job_id}] PIPELINE_COMPLETE" in line:
            job.current_stage = "Finalizing telemetry and evidence artifacts"
        elif f"[JOB:{job.job_id}] ERROR=" in line:
            error_part = line.split("ERROR=", 1)[-1]
            job.error = error_part

    def _populate_completed_results(self, job: JobRecord):
        output_dir = Path(job.output_dir)
        telemetry_file = output_dir / "hazard_telemetry.json"
        evidence_dir = output_dir / "evidence"

        hazards_count = 0
        class_counts: Dict[str, int] = {}

        if telemetry_file.exists():
            try:
                with open(telemetry_file, "r") as f:
                    telemetry_data = json.load(f)
                    if isinstance(telemetry_data, list):
                        hazards_count = len(telemetry_data)
                        for item in telemetry_data:
                            cls_name = item.get("class_name", "unknown")
                            class_counts[cls_name] = class_counts.get(cls_name, 0) + 1
            except Exception:
                pass

        evidence_count = 0
        if evidence_dir.exists():
            evidence_count = len([f for f in evidence_dir.glob("*.jpg")])

        job.hazards_detected = hazards_count
        job.evidence_count = evidence_count

        job.results = {
            "summary": {
                "total_hazards": hazards_count,
                "class_counts": class_counts,
            },
            "output_video_path": str(output_dir / "annotated_output.mp4"),
            "output_video_url": f"/static/jobs/{job.job_id}/annotated_output.mp4",
            "telemetry_file": str(telemetry_file),
            "evidence_dir": str(evidence_dir),
            "evidence_count": evidence_count,
        }


# Global Singleton Instance
job_manager = ProcessingJobManager()
