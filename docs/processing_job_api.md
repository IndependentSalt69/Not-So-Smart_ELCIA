# Phase 11B — FastAPI Real ML Processing Jobs

**Document Version**: 1.0.0  
**Implementation Date**: August 26, 2026  
**Scope**: FastAPI Job Backend API & Asynchronous Process Manager (`src/api/routes/processing.py`, `src/services/processing_job_manager.py`)  

---

## 1. Overview

Phase 11B introduces a backend job API that allows FastAPI to receive video and telemetry uploads, spawn the real ML runner process (`src/detection/runner.py`) asynchronously outside the FastAPI event loop, enforce GPU concurrency safety, and expose job status via polling.

---

## 2. API Specifications

### 2.1 `POST /api/v1/process`
Enqueues a raw drone video clip and optional flight telemetry file for ML inference.

#### Request Format: `multipart/form-data`

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `video` | Binary File | **Yes** | Video clip file (`.mp4`, `.mov`, `.avi`) |
| `srt` | Binary File | No | DJI SRT flight telemetry subtitle file (`.srt`) |
| `zone_id` | String Form | No | Optional surveillance zone code (e.g. `EC-01`) |
| `drone_id` | String Form | No | Optional drone swarm identifier (e.g. `DRONE-SWARM-ALPHA-1`) |

#### Response (`HTTP 202 Accepted`):
```json
{
  "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "QUEUED",
  "message": "Drone footage uploaded and processing job queued successfully.",
  "created_at": "2026-08-26T13:45:00.000Z"
}
```

---

### 2.2 `GET /api/v1/process/{job_id}`
Polls status, progress, hazard counts, evidence count, and artifact paths for a specific job.

#### Response (`HTTP 200 OK` - Processing):
```json
{
  "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "PROCESSING",
  "progress_pct": 0.0,
  "current_stage": "Processing drone video frames",
  "hazards_detected": 0,
  "evidence_count": 0,
  "created_at": "2026-08-26T13:45:00.000Z",
  "started_at": "2026-08-26T13:45:01.200Z",
  "completed_at": null,
  "error": null,
  "results": null
}
```

#### Response (`HTTP 200 OK` - Completed):
```json
{
  "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "COMPLETED",
  "progress_pct": 100.0,
  "current_stage": "Pipeline completed successfully",
  "hazards_detected": 551,
  "evidence_count": 551,
  "created_at": "2026-08-26T13:45:00.000Z",
  "started_at": "2026-08-26T13:45:01.200Z",
  "completed_at": "2026-08-26T13:46:15.800Z",
  "error": null,
  "results": {
    "summary": {
      "total_hazards": 551,
      "class_counts": {
        "waterlogging": 310,
        "pothole": 180,
        "drainage_overflow": 35,
        "damaged_footpath": 26
      }
    },
    "output_video_path": "outputs/jobs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/annotated_output.mp4",
    "output_video_url": "/static/jobs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/annotated_output.mp4",
    "telemetry_file": "outputs/jobs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/hazard_telemetry.json",
    "evidence_dir": "outputs/jobs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/evidence",
    "evidence_count": 551
  }
}
```

---

## 3. Job States

Jobs transition through four deterministic states:
1. `QUEUED`: File uploaded, job registered, waiting for GPU concurrency slot.
2. `PROCESSING`: Subprocess executing `python -m src.detection.runner`.
3. `COMPLETED`: ML pipeline finished successfully; artifacts verified.
4. `FAILED`: Subprocess exited with non-zero exit code or error encountered.

---

## 4. Directory Structure & File Isolation

To prevent file collision across concurrent or sequential jobs:

```
uploads/<job_id>/
├── input.mp4                     # Uploaded video file (sanitized name)
└── telemetry.srt                 # Uploaded DJI SRT subtitle file (optional)

outputs/jobs/<job_id>/
├── annotated_output.mp4          # Rendered video output
├── hazard_telemetry.json            # Extracted hazard telemetry JSON array
└── evidence/                        # Frame snapshot JPEGs
    ├── hazard_18_CRITICAL.jpg
    └── ...
```

---

## 5. Process Isolation & GPU Concurrency Safety

1. **Subprocess Execution**:
   - Spawns subprocess using `asyncio.create_subprocess_exec(sys.executable, "-m", "src.detection.runner", ...)` to prevent GIL contention and blocking event loops.
2. **GPU Concurrency Limit**:
   - `MAX_CONCURRENT_ML_JOBS = 1` enforced via `asyncio.Semaphore(1)`.
   - When a job arrives while GPU inference is active, the job is accepted, marked `QUEUED`, and automatically started when the active process finishes.

---

## 6. Upload Safety & Error Handling

- **Filename Sanitization**: User-supplied filenames are ignored for storage; inputs are saved as `input<ext>` and `telemetry.srt`.
- **Allowed Extensions**:
  - Video: `.mp4`, `.mov`, `.avi`
  - SRT: `.srt`
- **File Size Limit**: Configurable `DEFAULT_MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024` ($500\text{ MB}$).
- **HTTP Status Codes**:
  - `400 Bad Request`: Invalid file extension or empty file.
  - `404 Not Found`: Non-existent job ID requested.
  - `422 Unprocessable Entity`: Missing required `video` parameter.

---

## 7. Verification

- All 54 backend unit/integration tests passed (`python -m pytest -v`).
- Real pipeline test verified using `data_raw/full_demo_video.mp4` and `data_raw/full_demo_video.srt` over FastAPI endpoint.
