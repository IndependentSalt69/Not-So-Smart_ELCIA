# Section 14 Bug Fix: Retaining Source Flight Video for Manual Anomaly Incidents

## 1. Issue Summary & Root Cause

### The Problem
When a human operator reviewed a zero-detection `VideoVerification` and submitted a manual anomaly report ("Report Undetected Hazard"), the resulting `Incident` record opened in `IncidentDetailDrawer` / `EvidenceViewer` displaying:
> *"Processed Flight Video Unavailable — No job-scoped flight video is associated with this incident record."*

### The Root Cause
1. **Evidence Linking & Resolution**: `report_verification_anomaly` created an incident without verifying if the video path actually existed on disk or formatting it to a path resolvable by the frontend.
2. **URL Derivation Gaps**: `getIncidentVideoUrlFromEvidencePath` in `incidentService.ts` strictly looked for `/outputs/jobs/<job_id>/` patterns or `annotated_output.mp4`, failing to resolve relative upload paths (e.g. `uploads/<job_id>/flight.mp4`) or `/static/` prefixed URLs.
3. **Static File Mounts**: FastAPI in `src/api/main.py` mounted `/static/jobs` and `/static/evidence`, but did not mount `settings.UPLOADS_DIR` (`/static/uploads` and `/uploads`), preventing raw uploaded flight video streams from being served statically when annotated video is absent.
4. **Viewer Presentation**: `EvidenceViewer.tsx` defaulted to image mode and lacked visual demarcation identifying the video as source flight material rather than an AI detection clip.

---

## 2. Architecture & Implementation Fix

### A. Source Video Resolution Priority (`src/repositories/verifications.py`)
When `report_verification_anomaly` creates the manual incident:
1. **Priority 1 (Annotated Output Video)**: Checks if `outputs/jobs/{job_id}/annotated_output.mp4` exists on disk. If so, attaches `/static/jobs/{job_id}/annotated_output.mp4`.
2. **Priority 2 (Original Upload Video)**: If annotated video does not exist, checks `verification.video_path` on disk or under `uploads/{job_id}/`. If found, attaches `/static/uploads/{job_id}/{filename}`.
3. **Safety Guarantee (No Invented Paths)**: If no video file exists on disk, no fake evidence record is created, truthfully exposing the unavailable state.
4. **No Fake AI Detection**: No synthetic `Detection` prediction is created. The incident is clearly marked with `source: MANUAL_REVIEW`, `manual_override: true`, and audit status history.

### B. Static Mounts (`src/api/main.py`, `src/core/config.py`)
- Added `UPLOADS_DIR = str(PROJECT_ROOT / "uploads")` to `Settings`.
- Mounted `/static/uploads` and `/uploads` in FastAPI to serve raw uploaded flight recordings.

### C. Frontend URL Derivation (`dashboard/client/src/services/incidentService.ts`)
- `getEvidenceMediaUrl` now handles `/static/` prefixed URLs, `outputs/jobs/`, `uploads/`, and `outputs/evidence/`.
- `getIncidentVideoUrlFromEvidencePath` now resolves direct static paths, job annotated videos, upload video recordings, and video file extensions.

### D. Incident Detail Drawer & Evidence Viewer (`dashboard/client/src/components/detail/EvidenceViewer.tsx`)
- Detects manual anomaly incidents (`isManualIncident`).
- Automatically defaults to `video` view mode when the incident has video evidence and no image snapshots.
- Displays the distinct label over the video player:
  `SOURCE FLIGHT VIDEO — HUMAN-REPORTED ANOMALY`
- Displays the audit metadata pill:
  `Source: Human Operator Review (Manual Override)`
- Preserves standard AI-detected video behavior (`ANNOTATED TRACK VIDEO`) and truthful unavailable states when video is genuinely missing.

---

## 3. Database Schema & Migration Status

- **Schema Migration Required**: **NO**.
- Existing `evidence.file_path` (`String(512)`), `evidence.evidence_type` (`VIDEO`), `evidence.is_primary` (`Boolean`), and `video_verifications.created_incident_id` fully support this workflow without altering table structures or creating migrations.

---

## 4. Secondary Audit: Explainability & Severity Vectors

The CivicPulse `SeverityExplainer` component visualizes 4 contributing vectors plus operational reasoning and detection confidence. Below is the complete audit of how each value is produced:

| Explainer Metric | Current Data Source | Classification | Description & Flow |
| :--- | :--- | :--- | :--- |
| **AI Detection Confidence** | `incident.confidence` | **1. Direct model/telemetry value** (AI) / **2. DB-derived value** (Manual) | For AI-detected hazards, directly propagated from YOLO confidence score in `hazard_telemetry.json` into `incidents.confidence`. For manual review anomalies, stored as `1.0` (human confirmed). |
| **Water Extent & Road Surface Area** | `severityFactors.waterExtent` | **3. Frontend-derived calculation** | Computed in `mapBackendIncidentToFrontend()` in `incidentService.ts` as `Math.min(10, severity * 0.9)` for waterlogging / drainage overflow, and labeled with `${Math.round(severity * 9)}% arterial lane coverage`. |
| **Temporal Persistence & Duration** | `incident.durationSeconds` | **1. Direct model/telemetry value** (persisted in DB) | Computed during video tracking as `last_seen_sec - first_seen_sec` (or `duration_seconds` in `hazard_telemetry.json`) and persisted into `incidents.duration_seconds`. Formatted via `formatPersistenceDuration()`. |
| **Road Obstruction & Lane Blockage** | `severityFactors.roadObstruction` | **3. Frontend-derived calculation** | Derived directly from `incident.severity_score` in `mapBackendIncidentToFrontend()`, with qualitative label (`High dual-lane blockage` for severity $>8$, else `Moderate lane obstruction`). |
| **Corridor & Junction Criticality** | `severityFactors.roadCriticality` | **3. Frontend-derived calculation** & **4. Hardcoded/template text** | Computed in `mapBackendIncidentToFrontend()` as `Math.min(10, severity * 1.05)`, paired with template label `'Primary arterial corridor connecting Phase 1 & Hosur Highway'`. |
| **Operational Reasoning Summary** | `severityFactors.explanation` | **4. Hardcoded/template text** | Array of 3 template strings in `mapBackendIncidentToFrontend()` parameterized by hazard type name, formatted duration string, and corridor impact. |

---

## 5. Verification & Test Results

### Backend (`pytest -q`)
- `tests/repositories/test_verifications.py`: All 7 tests passed:
  1. `test_zero_detection_verification_contains_source_video`
  2. `test_report_anomaly_carries_source_job_and_video`
  3. `test_manual_incident_receives_video_evidence`
  4. `test_evidence_points_to_existing_source_file`
  5. `test_manual_incident_marked_manual_override_and_no_fake_detection`
  6. `test_missing_source_video_handled_safely`
  7. `test_report_anomaly_fails_without_location_safety`
- Total backend test suite: **125 passed**, 0 failures.

### Frontend (`npm test`)
- `dashboard/client/src/__tests__/incidentService.test.ts`: Video URL derivation tests passed for job outputs, upload recordings, and static mounts.
- `dashboard/client/src/__tests__/verificationService.test.ts`: Verification API calls and anomaly reporting tests passed.
- Total frontend test suite: **60 passed** (8 test files), 0 failures.

### Typecheck & Build
- `npm run check`: **0 errors**.
- `npm run build`: **Built successfully**.
- `git diff --check`: **0 whitespace errors**.
