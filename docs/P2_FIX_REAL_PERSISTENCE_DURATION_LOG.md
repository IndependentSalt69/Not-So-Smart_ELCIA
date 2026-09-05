# CivicPulse — P2/P1 Fix: Real Tracked Hazard Persistence & Duration Log

## 1. Executive Summary
- **Fix Title**: Real Tracked Hazard Persistence & Duration Implementation
- **Classification**: P2/P1 Data-Pipeline & Propagation Fix
- **Status**: Completed & Fully Verified
- **Scope**: Data-pipeline, telemetry calculation, backend ingestion, database persistence, REST API serialization, and frontend UI duration formatting.
- **Constraints Maintained**: Zero changes to YOLO model architecture, weights, training code, `yolo_segmentation.py` inference logic, `SeverityAnalyzer` formulas/weights, DPT depth estimation, priority rules, evidence serving, or SRT zone detection. No database reset, delete, or reseed occurred.

---

## 2. Root Cause Analysis
Prior to this fix, live incidents displayed a hardcoded `180s` persistence across the dashboard:
1. **Video Tracking Telemetry**: In [`src/detection/video_tracker.py`](file:///d:/Not-So-Smart_ELCIA/src/detection/video_tracker.py), hazard detections were tracked frame-by-frame, but the tracker did not persist `first_seen_sec`, `last_seen_sec`, or `duration_seconds` across frames for each active track ID when emitting `outputs/jobs/<job_id>/hazard_telemetry.json`.
2. **ML Ingestion Service**: In [`src/services/ml_ingestion_service.py`](file:///d:/Not-So-Smart_ELCIA/src/services/ml_ingestion_service.py), the ingestion pipeline did not extract duration or derive it from telemetry timestamps when instantiating `Incident` records, leaving `Incident.duration_seconds` as `None`.
3. **Silent Frontend Fallback**: In [`dashboard/client/src/services/incidentService.ts`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/incidentService.ts#L198), the mapping function executed `const durationSeconds = item.duration_seconds ?? 180;`, which silently substituted 180 seconds for all live backend incidents lacking a duration.
4. **UI Hardcoding**: In [`IncidentCard.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx), the card template rendered `Persistence: {incident.durationSeconds}s` directly without graceful handling for unavailable states (`N/A`).

---

## 3. Real Persistence Data-Flow Architecture

```
[Video Drone Frame Sequence & ByteTrack]
                   ↓
   track_first_seen[track_id] & track_last_seen[track_id]
                   ↓
   duration_seconds = round(max(0.0, last_ts - first_ts), 2)
                   ↓
[hazard_telemetry.json] (fields: first_seen_sec, last_seen_sec, duration_seconds)
                   ↓
[src/services/ml_ingestion_service.py] (extracts & validates duration_seconds)
                   ↓
[PostgreSQL / PostGIS DB Incident.duration_seconds] (Column already exists in schema)
                   ↓
[FastAPI REST API /api/v1/incidents/] (IncidentResponse.duration_seconds)
                   ↓
[dashboard/client/src/services/incidentService.ts] (maps duration_seconds to durationSeconds | null)
                   ↓
[formatPersistenceDuration(seconds)]
                   ↓
[IncidentCard.tsx / SeverityExplainer.tsx] (Renders "Persistence: 14.5s", "1m 24s", or "Persistence: N/A")
```

---

## 4. Definition of Persistence Semantics
For any physical hazard tracked across video frames:

$$\text{persistence\_seconds} = \text{last confirmed observation timestamp} - \text{first confirmed observation timestamp}$$

- **Example A (Real duration)**: `first = 10.0s`, `last = 24.5s` $\rightarrow$ `persistence = 14.5s`.
- **Example B (Short duration)**: `first = 10.0s`, `last = 11.0s` $\rightarrow$ `persistence = 1.0s`.
- **Example C (Unavailable/Unrecorded)**: `duration_seconds = null` $\rightarrow$ Frontend displays `Persistence: N/A` (never `180s`).

---

## 5. Files Changed & Modifications

### A. Video Tracker Telemetry
- **File**: [`src/detection/video_tracker.py`](file:///d:/Not-So-Smart_ELCIA/src/detection/video_tracker.py)
- **Modifications**:
  - Initialized `self.track_first_seen: Dict[int, float]` and `self.track_last_seen: Dict[int, float]` in `__init__` and reset them per video processing run.
  - In the tracking loop, continuously recorded confirmed observation timestamps for active tracks.
  - Added `first_seen_sec`, `last_seen_sec`, and `duration_seconds` to initial telemetry log entries.
  - Added finalization loop after video processing to compute exact `duration_seconds = round(max(0.0, last_ts - first_ts), 2)` across the entire video pass before writing `hazard_telemetry.json`.

### B. ML Ingestion Service
- **File**: [`src/services/ml_ingestion_service.py`](file:///d:/Not-So-Smart_ELCIA/src/services/ml_ingestion_service.py)
- **Modifications**:
  - Extracted `duration_seconds` from telemetry items, or derived it from `last_seen_sec - first_seen_sec`.
  - Persisted `duration_seconds` to `Incident.duration_seconds` and `Detection.detection_metadata["duration_seconds"]`.

### C. Frontend Service & Types
- **File**: [`dashboard/client/src/types/incident.ts`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/types/incident.ts)
  - Updated `Incident.durationSeconds: number | null;` and `SeverityFactors.persistenceSeconds: number | null;` to permit nullable states.
- **File**: [`dashboard/client/src/services/incidentService.ts`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/incidentService.ts)
  - Exported `formatPersistenceDuration(seconds?: number | null): string` helper.
  - Removed `?? 180` silent fallback. Explicitly preserved numeric seconds or `null`.
  - Updated `severityFactors.explanation` to dynamically reflect actual duration or state `Temporal persistence unrecorded during initial aerial pass.` when null.

### D. Frontend UI Components
- **File**: [`dashboard/client/src/components/incidents/IncidentCard.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx)
  - Rendered `Persistence: {formatPersistenceDuration(incident.durationSeconds)}` to support `"14.5s"`, `"14s"`, `"1m 24s"`, or `"N/A"`.
- **File**: [`dashboard/client/src/components/detail/SeverityExplainer.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/detail/SeverityExplainer.tsx)
  - Handled nullable `persistenceSeconds` gracefully without dividing `null` by 300.

---

## 6. Verification & Test Results

### A. Backend Test Suite (`pytest`)
- **File**: [`tests/services/test_ml_ingestion.py`](file:///d:/Not-So-Smart_ELCIA/tests/services/test_ml_ingestion.py)
  - `test_real_duration_propagation_from_timestamps`: Verified `first=10.0s`, `last=24.5s` $\rightarrow$ `Incident.duration_seconds == 14.5`.
  - `test_short_duration_hazard_propagation`: Verified `first=10.0s`, `last=11.0s` $\rightarrow$ `Incident.duration_seconds == 1.0`.
  - `test_missing_duration_does_not_become_180s`: Verified missing duration produces `None` in DB (not `180.0`).
  - `test_derived_duration_from_first_last_seen`: Verified derivation of `15.4s` from `12.4s` and `27.8s`.
  - `test_idempotent_duplicate_ingestion`: Verified deduplication remains intact.
- **Result**: **82 / 82 pytest tests PASSED (100% pass rate)**.

### B. Frontend Test Suite (`vitest` + `tsc`)
- **File**: [`dashboard/client/src/__tests__/incidentService.test.ts`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/__tests__/incidentService.test.ts)
  - Verified `formatPersistenceDuration`: `14.5s`, `14s`, `1s`, `0.5s`, `1m 24s`, `2m 03s`, and `N/A` for `null`/`undefined`/`NaN`.
  - Verified `mapBackendIncidentToFrontend` correctly maps `14.5s` without 180s fallback.
  - Verified `mapBackendIncidentToFrontend` sets `durationSeconds` to `null` when missing.
- **Result**: **56 / 56 Vitest tests PASSED**, `tsc --noEmit` clean with 0 errors.

---

## 7. Operational & Safety Confirmations
1. **ML Model / Weights / Inference**: Untouched. YOLO detection, bounding boxes, segmentation masks, confidence scores, DPT depth, and `SeverityAnalyzer` logic remain 100% identical.
2. **Database State**: No database reset, delete, truncation, or reseed was executed.
3. **Database Schema**: No migration needed. The existing `Incident.duration_seconds` column was utilized directly.
4. **Mock / Demo Fixtures**: Intentional mock fixtures in `mockIncidents.ts` and `inferenceService.ts` remain operational for offline demonstration.
