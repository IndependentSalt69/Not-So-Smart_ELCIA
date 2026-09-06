# Architecture & UX Audit: Incident-Clubbing / Flight Inspection UI (TODO #4)

**Document Version**: 1.0  
**Date**: September 2026  
**Status**: Phase 1 Audit & Proposal (Awaiting User Review & Approval)

---

## Executive Summary & Core Semantic Rule

The goal of this task is to design a unified **Flight Inspection / Inspection Run** user experience for CivicPulse that allows operators to view all hazards detected in a single drone flight as a cohesive batch, while strictly preserving the underlying incident data model.

### The Non-Negotiable Core Semantic Rule:
> **1 physical hazard = 1 Incident database record.**
> Multiple physical hazards detected during a single drone flight must **NEVER** be merged, deduplicated, collapsed, or replaced with a single Incident record.
> 
> **Example**: If a 3-minute drone flight over Zone EC-01 detects **8 potholes, 1 open manhole, and 2 waterlogging**, the database must store **11 distinct `Incident` records**. The UI must simply provide a clean parent/grouping view ("Flight Inspection #66FABA48") that presents the inspection summary and enables drilling down into each individual incident.

---

## 1. Current Architecture Audit

### A. ML Processing & Subprocess Execution
- **`ProcessingJobManager` (`src/services/processing_job_manager.py`)**:
  - Manages asynchronous execution of `src.detection.runner` (YOLOv8 + MiDaS depth estimation) via subprocess.
  - Controls GPU concurrency with `asyncio.Semaphore(max_concurrent_jobs=1)`.
  - Maintains execution state in an in-memory dictionary: `self.jobs: Dict[str, JobRecord] = {}`.
  - Emits real-time progress, stage logs, and outputs to disk under `outputs/jobs/{job_id}/`.

### B. Database Ingestion Lifecycle (`src/services/ml_ingestion_service.py`)
- When inference completes (`returncode == 0`), `ingest_job_results(db, job_id, output_dir, zone_id)` runs:
  - Reads `outputs/jobs/{job_id}/hazard_telemetry.json`.
  - For each detected hazard in the telemetry array:
    1. Generates a deterministic tracking code: `format_incident_code(job_id, hazard_id)` -> `INC-{job_prefix}-{hazard_id}` (e.g. `INC-66FABA48-1`).
    2. Checks idempotency (skips if incident code already exists).
    3. Maps ML class to `IncidentType` (`waterlogging`, `pothole`, `drainage_overflow`, `damaged_footpath`, `open_manhole`).
    4. Creates `Incident` record in `DETECTED` status.
    5. Creates `Detection` record with JSON metadata containing `job_id`, `hazard_id`, bounding boxes, mask pixels, and duration.
    6. Creates primary `Evidence` record linked to `outputs/jobs/{job_id}/evidence/{evidence_file}`.
- **Zero-Incident Flights (Section 14)**:
  - If `incidents_created == 0`, creates a `VideoVerification` record with `status = PENDING_REVIEW`.

### C. Ground Inspection vs Flight Inspection Distinction
- The existing ORM model **`Inspection` (`src/db/models/inspection.py`)** represents a **field inspection on the ground** conducted by a human field officer (e.g., verifying a repaired pothole with `InspectionResult.RESOLVED`).
- It is **not** a drone flight run.
- To prevent architectural collision, all drone flight grouping must use terms such as **Flight Inspection**, **Drone Inspection Run**, or **Inspection Results**.

---

## 2. Current Available Job-to-Incident Relationships

All required relationships linking incidents to their parent drone flight **already exist** in the system without adding any new database tables:

| Source | Field / Location | Contents |
| :--- | :--- | :--- |
| **`Incident` tracking code** | `incidents.incident_code` | `INC-{job_prefix}-{hazard_id}` (e.g. `INC-66FABA48-1`) or `INC-{job_prefix}-M{ts}` for human reports |
| **`Detection` metadata** | `detections.detection_metadata` | `{"job_id": "66faba48-...", "hazard_id": 1, "timestamp_sec": 14.5, ...}` |
| **`Evidence` file paths** | `evidence.file_path` | `outputs/jobs/{job_id}/evidence/hazard_1_LOW.jpg` or `/static/jobs/{job_id}/annotated_output.mp4` |
| **`VideoVerification` table** | `video_verifications.job_id` | Stores flight `job_id`, `video_filename`, `annotated_video_url`, `zone_id`, `created_incident_id` |
| **Status History audit log** | `incident_status_history.comment` | Contains `job_id={job_id}` and `verification_id={id}` for manual anomalies |
| **File System Artifacts** | `outputs/jobs/{job_id}/` | Contains `hazard_telemetry.json`, `annotated_output.mp4`, and `evidence/*.jpg` |

---

## 3. Current Frontend Structure & UX Problems

### A. Current Frontend Structure
- **Navbar Views**:
  - `Overview`: Global KPIs, high-level metrics, and recent alerts feed.
  - `Incident Queue`: Operational list/grid of all incidents with tabs (`Active`, `Completed`, `Rejected`) and filters.
  - `Issue Map`: Interactive PostGIS map of incidents.
  - `Upload & Analyze` (`DroneIngestionStudio`): Upload video + SRT, auto-detect zone, poll backend ML execution.
  - `Analytics`: Severity and hazard class breakdowns.
- **Incident Detail Drawer (`IncidentDetailDrawer`)**:
  - Unified modal drawer handling verification, dispatch/assignment, evidence viewer (video/image toggle), severity explainability, technical details, and audit trail.

### B. Identified UX Problems
1. **Jarring Immediate Jump to First Incident**:
   - In `DroneIngestionStudio.tsx` (line 271), when a flight with 11 hazards completes, it immediately invokes `onIncidentPublished(statusRes.results.incident_ids[0])`, popping up the drawer for Incident #1.
   - The operator never gets an overview of the other 10 hazards detected on that flight.
2. **Dispersed Incidents in Queue**:
   - The 11 incidents from the flight are mixed into the general Incident Queue alongside older historical incidents. An operator cannot easily view or filter "just the hazards from flight #66FABA48".
3. **No Historical Flight Runs Archive**:
   - Once the operator navigates away from `DroneIngestionStudio`, there is no view in the dashboard to see past flight runs, which zone they scanned, or how many hazards each flight detected.

---

## 4. Static / Hardcoded Data Audit

| File | Item | Status / Assessment |
| :--- | :--- | :--- |
| `dashboard/client/src/data/mockIncidents.ts` | `INITIAL_MOCK_INCIDENTS` (EC-0142, etc.) | Static demo data used when `VITE_USE_MOCK_DATA=true`. In real API mode, real backend incidents are fetched. |
| `dashboard/client/src/services/inferenceService.ts` | `SAMPLE_PRESETS` (preset-water-1, etc.) | Fallback demo presets for frontend-only testing without GPU backend. |
| `dashboard/client/src/services/processingService.ts` | `parseSrtFallback()` hardcoded bounding boxes | Client-side fallback if backend `/api/v1/zones/detect` is unreachable. Real backend uses PostGIS `ST_Contains`. |
| `dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx` | Simulated progress bar for presets | Used only when running simulated demo inference; real ML uses backend 1-second polling. |

**Audit Conclusion**: Real ML ingestion flows correctly use real backend data. The proposed inspection grouping will operate directly on live backend API data.

---

## 5. Answers to Design Questions

### Question 1: Where should inspection grouping live in the dashboard?
**Recommendation: Hybrid Approach (Upload & Analyze + Incident Queue Integration)**
1. **Immediate Post-Upload View in `Upload & Analyze`**:
   - Immediately upon flight processing completion, replace the automatic drawer popup with an **Inspection Run Summary & Results Card** (showing total hazards, hazard class chips, priority breakdown, and a filterable incident list).
2. **Dedicated Flight Run Filter & Grouping in `Incident Queue`**:
   - In `IncidentQueueView`, add an **"Inspection Run" filter dropdown / pill** (e.g., `Flight #66FABA48 (11 hazards)`). Selecting an inspection isolates its 11 incidents in the queue.
3. **Optional "Flight Runs" Sub-Tab / View**:
   - A sub-view or toggle to browse recent flight runs across all zones.

### Question 2: Scope of Inspection History (Recent vs All)
**Recommendation**:
- **Default**: Show the **Active / Most Recent Flight Run** prominently with full detail.
- **Historical Archive**: Provide a chronological list of recent flight runs (persisted from backend detections and video verifications) with quick-filter capability.

### Question 3: Zero-AI-Incident Flight Interaction
- A flight that detects 0 AI hazards is managed by the **Section 14 VideoVerification workflow**.
- In the Inspection Run view, it should appear cleanly as:
  ```
  FLIGHT INSPECTION #8F2B1C04
  Completed 3 min ago • Zone: EC-01
  0 Hazards Detected (AI Scan Clear)
  Status: Verification Required (PENDING_REVIEW)
  [ Confirm Clear (True Negative) ]   [ Report Undetected Hazard ]
  ```
- If the operator confirms clear, the badge updates to `CONFIRMED_CLEAR (True Negative)`.
- No duplicate workflow is created; it directly uses `verificationService`.

### Question 4: Human-Reported Manual Anomaly Representation (Section 14)
- When an operator reports an undetected hazard (e.g. 1 missed waterlogging):
  ```
  FLIGHT INSPECTION #8F2B1C04
  Completed 5 min ago • Zone: EC-01
  1 Hazard (1 Human-Reported, 0 AI-Detected)
  ------------------------------------------------
  INC-8F2B1C04-M14
  Waterlogging • Priority P2 • AI Confidence: N/A • Source: HUMAN REPORTED
  [ Inspect ]
  ```
- AI Detection Confidence remains `N/A`, Detection Source remains `HUMAN_REPORTED`, and the incident links to the source flight video.

### Question 5: Multi-Hazard & Mixed-Hazard Edge Cases
1. **Only Potholes (e.g. 8 potholes)**: Summary shows `8 Potholes Detected`, priority badges, and quick list.
2. **Mixed 5-Class Hazards (e.g. 4 potholes, 2 waterlogging, 1 manhole, 1 footpath, 1 drainage)**: Summary shows total (9) and breakdown chips for all 5 classes.
3. **Zero Hazards**: Shows clean scan with Section 14 verification controls.
4. **Processing Failure**: Shows `FAILED` card with error message and retry option without creating phantom incidents.
5. **Missing GPS on Some Frames**: Incidents with valid GPS are mapped; incidents with unrecorded GPS display `GPS: Coordinates Unrecorded` and allow manual map pinpointing.

### Question 6: Filtering Capabilities within an Inspection
- **By Hazard Class**: `[All (11)]` `[Potholes (8)]` `[Open Manhole (1)]` `[Waterlogging (2)]`
- **By Priority**: `[All Priorities]` `[P1 Critical (3)]` `[P2 High (5)]` `[P3 Moderate (3)]`
- **By Status**: `[All Statuses]` `[Detected]` `[Verified]` `[Assigned]`

### Question 7: Information Architecture per Level

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. FLIGHT INSPECTION SUMMARY CARD                                           │
│  - Inspection Tracking ID: #66FABA48                                        │
│  - Zone: EC-01 (Phase 1 West / Hosur Arterial)                              │
│  - Completed: 2 min ago • Duration: 3m 42s • Drone: DRONE-ALPHA-1           │
│  - Total Hazards: 11 Detected                                               │
│  - Breakdown: 8 Potholes • 1 Open Manhole • 2 Waterlogging                  │
│  - Priority: 3 P1 | 5 P2 | 3 P3                                             │
│  - Actions: [ View Grouped Incidents ] [ Play Annotated Flight Video ]      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. INSPECTION RESULTS LIST & SUB-FILTER BAR                                 │
│  - Quick Class Filters: [All (11)] [Potholes (8)] [Manhole (1)] [Water (2)] │
│  - Quick Priority Filter: [All] [P1 (3)] [P2 (5)] [P3 (3)]                  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ INCIDENT ROW: INC-66FABA48-1                                          │  │
│  │ Open Manhole • P1 • 96% AI Conf • Lat: 12.8452, Lng: 77.6631 • [Open] │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ INCIDENT ROW: INC-66FABA48-2                                          │  │
│  │ Deep Crater Pothole • P1 • 94% AI Conf • Lat: 12.8456, Lng: 77.6635   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ... (9 more incident rows)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │ (Clicking row opens existing drawer)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. INCIDENT DETAIL DRAWER (CANONICAL EXISTING DRAWER)                       │
│  - Preserves 100% of existing verification, assignment, evidence viewer,    │
│    stepper, severity explainer, and audit history capabilities.             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Backend Persistence & Restart Resilience Audit

### The In-Memory Job Manager Limitation:
- `ProcessingJobManager` in `src/services/processing_job_manager.py` holds jobs in `self.jobs = {}`.
- If the backend server restarts, `ProcessingJobManager.jobs` is cleared.

### The Zero-Migration Solution:
- All historical flight runs can be dynamically reconstructed from **existing database records**:
  1. `SELECT DISTINCT detection_metadata->>'job_id' FROM detections` (or grouping by `incident_code` prefix `INC-{job_prefix}`).
  2. Joining with `incidents` to compute `total_hazards`, `class_counts`, and `priority_counts`.
  3. Joining with `video_verifications` for zero-detection flights.
- **Result**: Historical flight grouping survives server restarts cleanly **without adding any new database tables or running any migrations**.

---

## 7. Proposed API Design

### Proposed Endpoints:

#### 1. `GET /api/v1/process/runs` (or `/api/v1/inspections/runs`)
- **Query Params**: `zone_id` (optional), `limit` (default: 20), `skip` (default: 0).
- **Response**: List of flight inspection summaries:
  ```json
  {
    "items": [
      {
        "job_id": "66faba48-3b1a-4d22-9e12-8921df348911",
        "job_prefix": "66FABA48",
        "zone_id": "820d5447-...",
        "zone_code": "EC-01",
        "total_hazards": 11,
        "class_counts": {
          "pothole": 8,
          "open_manhole": 1,
          "waterlogging": 2
        },
        "priority_counts": {
          "P1": 3,
          "P2": 5,
          "P3": 3
        },
        "status": "COMPLETED",
        "created_at": "2026-09-07T00:15:00Z",
        "completed_at": "2026-09-07T00:18:42Z",
        "annotated_video_url": "/static/jobs/66faba48-.../annotated_output.mp4"
      }
    ],
    "total": 1
  }
  ```

#### 2. `GET /api/v1/process/runs/{job_id}` (or `/api/v1/inspections/runs/{job_id}`)
- **Response**: Detailed inspection summary plus full array of associated `IncidentResponse` objects for that flight run.

---

## 8. Proposed Frontend Component Architecture

```
dashboard/client/src/
├── components/
│   ├── inspections/
│   │   ├── FlightInspectionCard.tsx          # Summary header card (hazard chips, priority bar, video link)
│   │   ├── FlightInspectionResultsList.tsx   # Filterable list of grouped incidents
│   │   ├── FlightInspectionRow.tsx           # Compact individual hazard card with quick action
│   │   └── FlightRunHistoryDrawer.tsx        # Slide-over panel to switch between historical runs
│   ├── ingestion/
│   │   └── DroneIngestionStudio.tsx          # Embeds FlightInspectionCard after processing completion
│   ├── incidents/
│   │   └── IncidentQueueView.tsx             # Adds "Inspection Run" filter selector
│   └── detail/
│       └── IncidentDetailDrawer.tsx          # Reused as-is when clicking any incident in the group
```

---

## 9. Risk Analysis & Mitigation

| Potential Risk | Mitigation |
| :--- | :--- |
| **Risk of accidental incident deduplication/merging** | Strict architectural contract: Backend creates 1 `Incident` per hazard; grouping is purely a visual parent view. |
| **Server restart clearing in-memory jobs** | Backend API aggregates from existing `detections.detection_metadata` and `video_verifications` so flight history is persistent. |
| **Legacy incidents without `job_id`** | Grouped under `"Manual / Seed Incidents"` or presented ungrouped in standard queue view. |
| **Duplicating incident detail drawer** | Re-use existing `IncidentDetailDrawer` component directly via `onSelectIncident(incident)`. |
| **Zero-incident collision** | Directly reuse Section 14 `VideoVerification` component without duplicate flows. |

---

## 10. Recommended Implementation Phases

1. **Phase 1 (Current)**: Architecture & UX Audit document creation (`docs/INCIDENT_CLUBBING_UI_AUDIT.md`) and user approval.
2. **Phase 2**: Backend aggregation endpoints (`GET /api/v1/process/runs` and `GET /api/v1/process/runs/{job_id}`) without database migrations.
3. **Phase 3**: Frontend reusable `FlightInspectionCard` and `FlightInspectionResultsList` components.
4. **Phase 4**: Post-upload integration in `DroneIngestionStudio` (replacing single-incident popup with inspection results).
5. **Phase 5**: Incident Queue flight filter integration and full test suite verification.

---

## 11. Testing Strategy

- **Backend Pytest**:
  - Test flight run aggregation grouping for single-hazard, mixed 5-class hazards, and zero-hazard flights.
  - Test persistence across simulated server restarts.
  - Verify idempotency and ensure no changes to YOLO, ByteTrack, or severity scores.
- **Frontend Vitest**:
  - Test `FlightInspectionCard` rendering correct hazard and priority counts.
  - Test class filter clicking (`[All]`, `[Potholes]`, `[Waterlogging]`).
  - Test clicking an incident row triggers `onSelectIncident` and opens `IncidentDetailDrawer`.
  - Test clean flight rendering with Section 14 verification controls.

---

## 12. Implementation Status (Phase 2 Backend Complete)

- **Phase 1 (Audit)**: Approved.
- **Phase 2 (Backend Aggregation APIs)**: Complete & Verified.
  - **Endpoints Added**:
    - `GET /api/v1/process/runs` (query params: `zone_id`, `skip`, `limit`)
    - `GET /api/v1/process/runs/{job_id}` (retrieves run detail by full UUID or 8-char prefix)
  - **Schemas**: `FlightInspectionRunSummary`, `FlightInspectionRunListResponse`, `FlightInspectionRunDetail` in `src/schemas/processing.py`.
  - **Repository**: `src/repositories/processing_runs.py` providing `list_flight_runs` and `get_flight_run` with deterministic sorting and server restart resilience.
  - **Zero-Migration Guarantee**: No database migrations or schema alterations created.
  - **Core Semantic Guarantee**: 1 physical hazard = 1 Incident database record preserved.
  - **Test Suite**: 12 dedicated integration tests added in `tests/api/test_processing_runs.py` covering single-hazard, multi-hazard (11 hazards), mixed 5-class, zero-hazard, human-reported anomalies, server restarts, deterministic ordering, and zone pagination. Full test suite (139 tests) passing.

---

## 13. Implementation Status (Phase 3 Reusable UI Components Complete)

- **Phase 3 (Reusable Frontend UI)**: Complete & Verified.
  - **Components Created**:
    - `FlightInspectionCard.tsx`: Displays inspection run header, zone, status badge, total hazards count, hazard-class breakdown chips, priority breakdown, timestamps, conditional video action, and Section 14 zero-hazard verification controls (`Confirm Clear` / `Report Undetected Hazard`).
    - `FlightInspectionResultsList.tsx`: Receives individual incident objects, preserves 1-to-1 incident mapping, and provides dynamic class, priority, and status filter bars with dynamically calculated count chips and search.
    - `FlightInspectionRow.tsx`: Compact hazard row displaying incident code, type icon/label, priority badge, severity, confidence (`AI Conf: 94%` or `AI Confidence: N/A • HUMAN REPORTED`), location, status, and inspect trigger opening the canonical `IncidentDetailDrawer`.
    - `FlightRunHistoryDrawer.tsx`: Slide-over drawer fetching historical flight inspection runs via live backend `GET /api/v1/process/runs`.
  - **Service & Types Added**:
    - `dashboard/client/src/types/inspection.ts`: Matching Phase 2 backend schemas.
    - `dashboard/client/src/services/inspectionService.ts`: Providing `listFlightRuns` and `getFlightRunDetail`.
  - **Verification**:
    - 16 frontend tests passing in `dashboard/client/src/__tests__/flightInspection.test.tsx`.
    - Full Vitest suite (79 tests) passing.
    - Full TypeScript type check (`tsc --noEmit`) passing with 0 errors.
    - Full frontend production build (`vite build && esbuild`) passing.
    - Full backend test suite (139 tests) passing.

---

## 14. Implementation Status (Phase 4 Upload & Analyze Integration Complete)

- **Phase 4 (DroneIngestionStudio Integration)**: Complete & Verified.
  - **Replaced Behavior**: Removed automatic invocation of `onIncidentPublished(statusRes.results.incident_ids[0])` that prematurely forced open the first incident drawer upon flight completion.
  - **New Post-Processing Flow**:
    1. Drone video completes processing.
    2. Calls `inspectionService.getFlightRunDetail(job_id)` to load live backend inspection summary and incidents.
    3. Renders `FlightInspectionCard` with total hazards, 5-class breakdown chips, and priority urgency counters.
    4. Renders `FlightInspectionResultsList` displaying each individual hazard row.
    5. Clicking any incident row opens the canonical `IncidentDetailDrawer` on-demand.
  - **Zero-Hazard Flights**:
    - Renders `FlightInspectionCard` zero-hazard state with verification controls (`Confirm Clear (True Negative)` / `Report Undetected Hazard`).
    - Does not auto-open `IncidentDetailDrawer`.
    - Verification actions refresh the flight inspection data live.
  - **Historical Runs Access**:
    - Integrated `FlightRunHistoryDrawer` accessible from both the studio header and the `FlightInspectionCard`.
    - Selecting a historical run fetches and renders its inspection results.
  - **Loading & Error Handling**:
    - Truthful loading state ("Aggregating Flight Inspection Results...") during inspection retrieval.
    - Error banner with "Retry" button on failure while preserving job completion status.
  - **Verification**:
    - 12 dedicated tests added in `dashboard/client/src/__tests__/droneIngestionStudio.test.tsx`.
    - All 91 frontend tests passing across 10 test files.
    - TypeScript type check (`npm run check`) clean with 0 errors.
    - Production build (`npm run build`) successful.
    - All 139 backend tests passing.



