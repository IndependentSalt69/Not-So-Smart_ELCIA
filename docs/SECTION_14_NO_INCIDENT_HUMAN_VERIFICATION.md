# Section 14: No-Incident Human Verification Workflow

## 1. Overview & Operational Problem

In the CivicPulse aerial surveillance pipeline, when drone footage is processed by the ML vision engine (YOLOv8 + ByteTrack + MiDaS depth estimation), there are two distinct outcomes:

1. **AI Detected Hazards ($\text{incidents\_created} > 0$)**: Hazards are automatically grouped into spatial incidents, ingested into PostgreSQL/PostGIS, and routed to the live Incident Queue (`status: DETECTED`).
2. **AI Found Zero Hazards ($\text{incidents\_created} == 0$)**: The footage contains no AI-detected anomalies.

Previously, a zero-incident outcome silently completed without human oversight. In critical municipal infrastructure surveillance, a negative AI result can represent either:
- **A True Negative**: A clean road surface with no hazards requiring maintenance.
- **A False Negative**: An undetected civic hazard (e.g., in heavy shadows, obscured angles, or novel failure modes).

Section 14 introduces the **No-Incident Human Verification Workflow**, requiring explicit operator review and sign-off on negative surveillance flights to maintain complete auditability and prevent undetected civic risks.

---

## 2. Architectural Design & Scope Rules

### A. Strict Scope Enforcement
- A `video_verifications` record is created **ONLY** when `incidents_created == 0`.
- When AI creates one or more incidents ($\text{incidents\_created} > 0$), the standard incident workflow proceeds normally and no additional `VideoVerification` record is spawned.

### B. GPS Safety Rule
- **Never fabricate coordinates**: The system never guesses, averages, or uses zone centroids or flight-start coordinates as a fallback location.
- If GPS is available in the flight telemetry / video timestamp: the exact coordinate is used.
- If GPS is unavailable: location is explicitly marked as unavailable, and the human operator is **mandated** to provide or select coordinates and an address before a manual incident can be submitted.

### C. Domain Model Separation
- **`inspections` table**: Preserved for physical, ground-level field re-inspections performed by response teams following repair work (`PENDING_REINSPECTION` $\rightarrow$ `CLOSED`).
- **`video_verifications` table**: Dedicated entity for human-in-the-loop review of aerial video surveillance missions.

---

## 3. State Transitions & Workflow

```
                        [ ML Processing Completes ]
                                     │
                    ┌────────────────┴────────────────┐
          incidents_created > 0             incidents_created == 0
                    │                                 │
         [ Standard Incident Flow ]         [ VideoVerification Created ]
         (status: DETECTED)                 (status: PENDING_REVIEW)
                                                      │
                                      ┌───────────────┴───────────────┐
                              Operator Approves               Operator Disputes
                                      │                               │
                              [ Confirm Clear ]             [ Report Anomaly ]
                                      │                               │
                                      ▼                               ▼
                             CONFIRMED_CLEAR                  ANOMALY_REPORTED
                          (True Negative Audit)                       │
                                                                      ▼
                                                          [ Genuine Incident Created ]
                                                            • status: VERIFIED
                                                            • source: MANUAL_REVIEW
                                                            • Detection: manual_override=true
                                                            • Evidence attached
                                                            • Linked to verification
                                                                      │
                                                                      ▼
                                                          [ Live Incident Queue ]
```

---

## 4. Backend Implementation

### A. Database Entity (`src/db/models/verification.py`)
- **Table**: `video_verifications`
- **Enum**: `VerificationStatus` (`PENDING_REVIEW`, `CONFIRMED_CLEAR`, `ANOMALY_REPORTED`)
- **Key Columns**:
  - `id`: UUID Primary Key
  - `job_id`: Processing Job ID (indexed, unique per zero-incident flight)
  - `status`: `VerificationStatus` enum
  - `video_path`: Relative or absolute path to flight video
  - `srt_path`: Optional telemetry path
  - `flight_metadata`: JSON field containing frame counts, duration, and telemetry metadata
  - `zone_id`: Foreign key to `zones.id`
  - `drone_id`: Identifier of the drone
  - `reviewed_by`: User ID or operator callsign
  - `reviewed_at`: Timestamp of human sign-off
  - `notes`: Human operator notes
  - `created_incident_id`: Foreign key to `incidents.id` if an anomaly is disputed
  - `created_at`, `updated_at`: Audit timestamps

### B. Alembic Migration (`alembic/versions/20260907_004_add_video_verifications.py`)
- Revision ID: `20260907_004` (revises `20260904_003`)
- Creates `verification_status` PostgreSQL enum and `video_verifications` table with indexes on `job_id`, `status`, `zone_id`, and `created_incident_id`.

### C. ML Ingestion Hook (`src/services/ml_ingestion_service.py`)
- In `ingest_ml_results()`, if `incidents_created == 0`:
  ```python
  verification = create_video_verification(
      db=db,
      job_id=job_id,
      video_path=video_path,
      srt_path=srt_path,
      flight_metadata={
          "total_frames": total_frames,
          "duration_seconds": duration_seconds,
          "source": "ml_ingestion_zero_detections",
      },
      zone_id=zone_id,
      drone_id=drone_id,
  )
  ```

### D. Verification Endpoints (`src/api/routes/verifications.py`)
- `GET /api/v1/verifications`: List verifications with filtering by status and zone.
- `GET /api/v1/verifications/{id}`: Retrieve a single verification by UUID or Job ID.
- `POST /api/v1/verifications/{id}/confirm-clear`: Certifies the flight as a True Negative.
- `POST /api/v1/verifications/{id}/report-anomaly`: Dispatches a manual anomaly report, creating a genuine `Incident`, `Detection`, and `Evidence` record.

---

## 5. Frontend Implementation

### A. Verification Service (`dashboard/client/src/services/verificationService.ts`)
- `getVerification(idOrJobId)`
- `listVerifications(params)`
- `confirmClear(idOrJobId, payload)`
- `reportAnomaly(idOrJobId, payload)`

### B. Manual Anomaly Reporting Modal (`dashboard/client/src/components/ingestion/ManualAnomalyModal.tsx`)
- Allows selecting one of the 5 CivicPulse hazard types (`WATERLOGGING`, `POTHOLE`, `DRAINAGE_OVERFLOW`, `DAMAGED_FOOTPATH`, `OPEN_MANHOLE`).
- Human severity slider (1.0 to 10.0) with automatic priority assignment (`P1`, `P2`, `P3`).
- Video timestamp / frame capture.
- **Strict GPS validation**: If flight GPS is missing, coordinate fields are highlighted and required before submission.
- On creation, immediately routes the operator to the newly created Incident in the queue.

### C. Drone Ingestion Studio (`dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx`)
- When processing completes with zero hazards, displays the **Human-in-the-Loop Verification Card**.
- Provides one-click "Confirm No Anomaly" (persists True Negative audit) and "Report Undetected Hazard" (opens modal).
- Live status badge transitions dynamically:
  - `PENDING REVIEW` (amber pulsating) $\rightarrow$ `CONFIRMED CLEAR ✓` (emerald) or `ANOMALY REPORTED` (amber).

---

## 6. Verification and Test Results

### A. Backend Pytest Suite
All 125 backend tests passing:
- `tests/repositories/test_verifications.py`: Verified CRUD, True Negative confirmation, and genuine incident generation with GPS validation.
- `tests/api/test_verifications.py`: Verified all 4 FastAPI endpoints with mock database sessions.
- `tests/services/test_ml_ingestion_verification.py`: Verified zero-incident ingestion creates verification and multi-incident ingestion does not.
- `tests/db/test_migrations.py`: Verified Alembic migration schema.

### B. Frontend Vitest Suite
All 71 frontend tests passing:
- `dashboard/client/src/__tests__/verificationService.test.ts`: Verified API client methods and payload structures.
- All existing tests in `incidentService.test.ts`, `analyticsService.test.ts`, `inferenceService.test.ts`, `srtZoneDetection.test.ts`, `stateMachine.test.ts`, `notificationCenter.test.ts`, `incidentFilters.test.ts` passing without regression.

### C. Build and Typecheck
- `npm run check` (TypeScript): 0 errors.
- `npm run build` (Vite production bundle): Completed successfully.
- `git diff --check`: Clean (no trailing whitespace or whitespace errors).
