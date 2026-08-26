# Phase 11D — Dashboard → Real ML Processing Integration

**Document Version**: 1.0.0  
**Implementation Date**: August 26, 2026  
**Scope**: Frontend Ingestion Studio Real ML Job Integration (`dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx`, `dashboard/client/src/services/processingService.ts`, `dashboard/client/src/types/ingestion.ts`)

---

## 1. Overview & Architecture

Phase 11D completes the end-to-end integration of raw drone video and telemetry processing into the CivicPulse Dashboard. Users can select raw aerial video (`.mp4`, `.mov`, `.avi`) and optional DJI SRT telemetry (`.srt`) in the **Drone Ingestion Studio**, submit the footage to FastAPI via `POST /api/v1/process`, poll execution progress, and automatically view newly detected incidents populated in PostgreSQL/PostGIS in real time.

```
[ DroneIngestionStudio ]
        │
        ├─ Video File (.mp4/.mov/.avi)
        └─ Optional Telemetry (.srt)
                │
                ▼ (FormData upload)
        POST /api/v1/process
                │
                ▼ (HTTP 202 Accepted)
          { job_id, status: "QUEUED" }
                │
                ▼ (Poll every 1000ms)
        GET /api/v1/process/{job_id}
                │
                ├─ status: "PROCESSING" (progress_pct, current_stage)
                │
                └─ status: "COMPLETED"
                        │
                        ▼ (Summary results read)
        incidentService.notifySubscribers()
                        │
                        ▼ (Live GET /api/v1/incidents/)
      [ Incident Queue & Dynamic Map Updated ]
```

---

## 2. Component & Service Specifications

### 2.1 Processing Service (`dashboard/client/src/services/processingService.ts`)
Exposes type-safe API methods for FastAPI processing job management:
- `submitProcessingJob(videoFile, srtFile?, zoneId?, droneId?)`: Constructs `FormData` and posts to `POST /api/v1/process`.
- `getJobStatus(jobId)`: Performs `GET /api/v1/process/{jobId}` to monitor progress, stage strings, hazards detected, and result summaries.

### 2.2 TypeScript Interface Definitions (`dashboard/client/src/types/ingestion.ts`)
Defines strict type models without `any`:
- `ProcessJobStatus`: `'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'`
- `ProcessJobResponse`: `{ job_id, status, message, created_at }`
- `ProcessJobSummary`: `{ total_hazards, incidents_created, detections_created, evidence_created, skipped, failed, missing_gps, class_counts }`
- `ProcessJobResults`: `{ summary, incident_ids, output_video_path, output_video_url, telemetry_file, evidence_dir, evidence_count }`
- `ProcessJobStatusResponse`: `{ job_id, status, progress_pct, current_stage, hazards_detected, evidence_count, created_at, started_at, completed_at, error, results }`

### 2.3 Studio UI & Polling Architecture (`DroneIngestionStudio.tsx`)
- **Video & Telemetry Upload Cards**:
  - File picker restricted to `.mp4`, `.mov`, `.avi` for video and `.srt` for DJI telemetry.
  - Clearly displays selected file names or indicates unavailable SRT telemetry.
- **Action Buttons**:
  - `START REAL ML PROCESSING (FastAPI Backend)`: Submits real files to backend. Disabled when no video file is loaded or when processing is active.
  - `Run Demo Preset Simulation`: Retains mock preset simulation for offline development/demonstrations.
- **Job Polling & Cleanup**:
  - Starts 1000ms timer via `setInterval` on job creation.
  - Automatically stops timer on `COMPLETED`, `FAILED`, or component unmount.
- **Completion & Live Refresh**:
  - On `COMPLETED`, reads `statusRes.results.summary` (total hazards, incidents created, detections created, evidence created, class counts).
  - Invokes `incidentService.notifySubscribers()`, triggering all active dashboard hooks (`useIncidents`) to silently fetch fresh PostgreSQL/PostGIS incidents.
  - Does **NOT** invoke `publishAsIncident()` or generate duplicate incidents in frontend memory.

---

## 3. Error Handling & Safety

- **Upload Format Guard**: Rejects non-video files (e.g. static `.jpg` images) for real ML processing with explicit user feedback.
- **Backend Error Propagation**: Displays detailed backend failure tracebacks (`realJobStatus.error`) upon job failure and immediately terminates polling loops.
- **Timer Safety**: `stopPolling()` eliminates timer leaks across re-renders and unmounts.
- **Concurrency Control**: Disables submission buttons while a processing job is active to prevent accidental duplicate `POST /process` requests.

---

## 4. Verification Baseline

- **TypeScript Compilation**: `npm run check` passed with `0` errors.
- **Pytest Suite**: `64/64` backend tests passing (100%).
