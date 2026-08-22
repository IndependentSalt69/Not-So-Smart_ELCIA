# CivicPulse Frontend — Backend Integration Work Log

---

## Phase 2: Single Incident Detail Integration (`GET /api/v1/incidents/{incident_id}`)

**Date:** August 23, 2026  
**Status:** Completed & Verified  

### 1. Objective
Connect the frontend Incident Detail Drawer and single-incident inspection flow to the live FastAPI backend endpoint `GET /api/v1/incidents/{incident_id}` while preserving actual database UUID primary keys for lookups and tracking codes (`incident_code`) for user-facing UI labels.

### 2. Files Inspected
* **Frontend:**
  - `dashboard/client/src/components/detail/IncidentDetailDrawer.tsx`
  - `dashboard/client/src/components/incidents/IncidentQueueView.tsx`
  - `dashboard/client/src/components/incidents/IncidentCard.tsx`
  - `dashboard/client/src/hooks/useIncidents.ts`
  - `dashboard/client/src/services/incidentService.ts`
  - `dashboard/client/src/services/api.ts`
  - `dashboard/client/src/types/incident.ts`
  - `dashboard/client/src/components/CivicPulseDashboard.tsx`
* **Backend:**
  - `src/schemas/incident.py`
  - `src/api/routes/incidents.py`
  - `src/repositories/incidents.py`

### 3. Files Created / Modified
* **Created:**
  - `dashboard/scratch/verify_phase2.ts` (Phase 2 automated integration verification script)
  - `docs/frontend_backend_integration_log.md` (Integration work log)
* **Modified:**
  - `dashboard/client/src/types/incident.ts` (Added optional `code?: string` field to `Incident` interface)
  - `dashboard/client/src/services/incidentService.ts` (Updated `mapBackendIncidentToFrontend` to set `id` = backend UUID, `code` = `incident_code`, and updated `getIncidentById(id)` to call `GET /api/v1/incidents/{incident_id}` via `api.ts`)
  - `dashboard/client/src/hooks/useIncidents.ts` (Exposed `getIncidentById(id)` callback helper)
  - `dashboard/client/src/components/CivicPulseDashboard.tsx` (Updated `handleSelectIncident` to query `getIncidentById(incident.id)` to fetch fresh backend incident detail)
  - `dashboard/client/src/components/detail/IncidentDetailDrawer.tsx` (Updated header label to display `incident.code || incident.id`)
  - `dashboard/client/src/components/incidents/IncidentCard.tsx` (Updated card title to display `incident.code || incident.id`)

---

## Phase 3: Human Verification & Status Transitions (`PATCH /api/v1/incidents/{incident_id}/status`)

**Date:** August 23, 2026  
**Status:** Completed & Verified  

### 1. Objective
Connect human verification (`VERIFIED`), false positive rejection (`REJECTED`), and lifecycle status controls (`IN_PROGRESS`, `RE_INSPECTION`, `CLOSED`) in the frontend UI to the real FastAPI backend mutation endpoint `PATCH /api/v1/incidents/{incident_id}/status` using strict no-optimistic-update control flow.

### 2. Files Inspected
* **Frontend:**
  - `dashboard/client/src/components/detail/VerificationBar.tsx`
  - `dashboard/client/src/components/detail/IncidentDetailDrawer.tsx`
  - `dashboard/client/src/components/detail/IncidentStepper.tsx`
  - `dashboard/client/src/components/CivicPulseDashboard.tsx`
  - `dashboard/client/src/hooks/useIncidents.ts`
  - `dashboard/client/src/services/incidentService.ts`
  - `dashboard/client/src/services/api.ts`
  - `dashboard/client/src/types/incident.ts`
* **Backend:**
  - `src/db/models/enums.py` (Confirmed `IncidentStatus` enum values)
  - `src/schemas/incident.py` (Inspected `IncidentStatusUpdate`: `status`, `changed_by`, `comment`)
  - `src/api/routes/incidents.py` (Inspected `PATCH /{incident_id}/status` route)
  - `src/repositories/incidents.py` (Inspected `repo_update_incident_status` and automatic `IncidentStatusHistory` audit creation)

### 3. Files Created / Modified
* **Created:**
  - `dashboard/scratch/verify_phase3.ts` (Phase 3 automated status mutation & audit verification script)
* **Modified:**
  - `dashboard/client/src/services/incidentService.ts` (Updated `updateIncidentStatus`, `verifyIncident`, `rejectIncident` to issue `api.patch('/incidents/' + id + '/status', payload)` to FastAPI backend)
  - `dashboard/client/src/hooks/useIncidents.ts` (Exported mutation callbacks `verifyIncident`, `rejectIncident`, `updateStatus`)
  - `dashboard/client/src/components/CivicPulseDashboard.tsx` (Connected operations lifecycle handlers to updated service layer and state)

---

## Phase 4: Incident Evidence Integration (`GET /api/v1/incidents/{incident_id}/evidence`)

**Date:** August 23, 2026  
**Status:** Completed & Verified  

### 1. Objective
Connect the frontend `EvidenceViewer` component to the live FastAPI backend endpoint `GET /api/v1/incidents/{incident_id}/evidence`, displaying real evidence asset metadata (`evidence_type`, `file_path`, `description`, `is_primary`) while preserving fallback SVG image rendering for local filesystem paths.

### 2. Files Inspected
* **Frontend:**
  - `dashboard/client/src/components/detail/EvidenceViewer.tsx`
  - `dashboard/client/src/components/detail/IncidentDetailDrawer.tsx`
  - `dashboard/client/src/components/CivicPulseDashboard.tsx`
  - `dashboard/client/src/services/incidentService.ts`
  - `dashboard/client/src/services/api.ts`
  - `dashboard/client/src/types/incident.ts`
  - `dashboard/client/src/data/mockIncidents.ts`
* **Backend:**
  - `src/schemas/evidence.py` (Inspected `EvidenceResponse`: `id`, `incident_id`, `evidence_type`, `file_path`, `captured_at`, `description`, `is_primary`, `created_at`)
  - `src/api/routes/incidents.py` (Inspected `GET /{incident_id}/evidence` route)

### 3. Files Created / Modified
* **Created:**
  - `dashboard/scratch/verify_phase4.ts` (Phase 4 evidence integration verification script)
* **Modified:**
  - `dashboard/client/src/types/incident.ts` (Added `EvidenceAsset` interface)
  - `dashboard/client/src/services/incidentService.ts` (Added `BackendEvidenceItem` interface and implemented `getIncidentEvidence(incidentId)` calling `GET /api/v1/incidents/{incident_id}/evidence` via `api.ts`)
  - `dashboard/client/src/hooks/useIncidents.ts` (Exposed `getIncidentEvidence` helper)
  - `dashboard/client/src/components/detail/EvidenceViewer.tsx` (Connected component state to `getIncidentEvidence(incident.id)`, rendering live metadata bar and empty states)

---

## Phase 5: Incident Assignments (`POST` & `GET /api/v1/incidents/{incident_id}/assignments`)

**Date:** August 23, 2026  
**Status:** Completed & Verified  

### 1. Objective
Connect the frontend `AssignmentSection` component and dispatch flow to the live FastAPI user management endpoint `GET /api/v1/users/` and assignment endpoints (`POST` & `GET /api/v1/incidents/{incident_id}/assignments`) using database UUIDs for users and incidents.

### 2. Files Inspected
* **Frontend:**
  - `dashboard/client/src/components/detail/AssignmentSection.tsx`
  - `dashboard/client/src/components/detail/IncidentDetailDrawer.tsx`
  - `dashboard/client/src/components/CivicPulseDashboard.tsx`
  - `dashboard/client/src/hooks/useIncidents.ts`
  - `dashboard/client/src/services/incidentService.ts`
  - `dashboard/client/src/services/api.ts`
  - `dashboard/client/src/types/incident.ts`
* **Backend:**
  - `src/schemas/assignment.py` (Inspected `AssignmentCreate` & `AssignmentResponse`)
  - `src/schemas/user.py` (Inspected `UserResponse`)
  - `src/api/routes/incidents.py` (Inspected `POST` & `GET /{incident_id}/assignments`)
  - `src/api/routes/users.py` (Inspected `GET /api/v1/users/`)
  - `src/repositories/assignments.py` (Inspected `create_assignment` and `get_incident_assignments`)

### 3. Files Created / Modified
* **Created:**
  - `dashboard/scratch/verify_phase5.ts` (Phase 5 assignment integration verification script)
* **Modified:**
  - `dashboard/client/src/types/incident.ts` (Added `User`, `Assignment`, `AssignmentCreatePayload` interfaces)
  - `dashboard/client/src/services/incidentService.ts` (Added `BackendUserItem`, `BackendAssignmentItem` interfaces and implemented `getUsers()`, `createIncidentAssignment()`, `getIncidentAssignments()`, and updated `assignIncident()`)
  - `dashboard/client/src/hooks/useIncidents.ts` (Exposed `getUsers` and `getIncidentAssignments` helpers)
  - `dashboard/client/src/components/detail/AssignmentSection.tsx` (Connected component to fetch backend system users for selector dropdown and display existing verified assignments)

---

## Phase 6: Detection Observations (`GET /api/v1/incidents/{incident_id}/detections`)

**Date:** August 23, 2026  
**Status:** Completed & Verified  

### 1. Objective
Connect the frontend incident inspection surfaces (`EvidenceViewer` / `IncidentDetailDrawer`) to the live FastAPI backend detection endpoint `GET /api/v1/incidents/{incident_id}/detections`, displaying frame-level AI detection observations (`detection_type`, `confidence`, `frame_number`, `location`, `detection_metadata`).

### 2. Files Inspected
* **Frontend:**
  - `dashboard/client/src/components/detail/EvidenceViewer.tsx`
  - `dashboard/client/src/components/detail/IncidentDetailDrawer.tsx`
  - `dashboard/client/src/components/incidents/IncidentCard.tsx`
  - `dashboard/client/src/hooks/useIncidents.ts`
  - `dashboard/client/src/services/incidentService.ts`
  - `dashboard/client/src/services/api.ts`
  - `dashboard/client/src/types/incident.ts`
* **Backend:**
  - `src/schemas/detection.py` (Inspected `DetectionCreate` & `DetectionResponse`: `id`, `incident_id`, `detection_type`, `confidence`, `frame_number`, `detected_at`, `location`, `detection_metadata`, `created_at`)
  - `src/api/routes/incidents.py` (Inspected `GET` & `POST /{incident_id}/detections`)
  - `src/repositories/detections.py` (Inspected `create_detection` and `list_incident_detections`)

### 3. Files Created / Modified
* **Created:**
  - `dashboard/scratch/verify_phase6.ts` (Phase 6 detection observations integration verification script)
* **Modified:**
  - `dashboard/client/src/types/incident.ts` (Added `DetectionObservation` interface)
  - `dashboard/client/src/services/incidentService.ts` (Added `BackendDetectionItem` interface and implemented `getIncidentDetections(incidentId)` querying `GET /api/v1/incidents/{incident_id}/detections` via `api.ts`)
  - `dashboard/client/src/hooks/useIncidents.ts` (Exposed `getIncidentDetections` helper)
  - `dashboard/client/src/components/detail/EvidenceViewer.tsx` (Connected component to fetch live detection observations and display AI detection HUD pills)

### 4. Endpoints Integrated
* `GET /api/v1/incidents/{incident_id}/detections` (Retrieves frame-level AI detection observations for an incident)

### 5. `POST` Endpoint Decision Rationale
* `POST /api/v1/incidents/{incident_id}/detections` is designed exclusively for the automated ML computer vision pipeline / background drone processing scripts.
* No manual user workflow for manually logging frame-level AI bounding box detections exists (or should exist) in the frontend UI.
* Therefore, only `GET` was integrated into the frontend service layer, strictly preserving the ML pipeline boundary as instructed.

### 6. `DetectionResponse` $\rightarrow$ Frontend `DetectionObservation` Mapping
| Backend Field (`DetectionResponse`) | Frontend Field (`DetectionObservation`) | Mapping / Notes |
| :--- | :--- | :--- |
| `id` | `id` | Detection observation UUID. |
| `incident_id` | `incidentId` | Parent incident UUID. |
| `detection_type` | `detectionType` | String (`WATERLOGGING`, `POTHOLE`, etc.). |
| `confidence` | `confidence` | Model confidence float (`0.0 - 1.0`). |
| `frame_number` | `frameNumber` | Frame index integer (e.g. `127`). |
| `detected_at` | `detectedAt` | ISO datetime string. |
| `location` | `location` | GeoJSON Point `{ type: "Point", coordinates: [lng, lat] }`. |
| `detection_metadata` | `detectionMetadata` | Dictionary metadata (`model`, `source`, `severity`). |
| `created_at` | `createdAt` | ISO datetime string. |

### 7. Tests & Commands Executed
1. **TypeScript Typecheck (`npm run check`):**
   ```bash
   npm run check
   # Result: Exit code 0, 0 type errors.
   ```
2. **Phase 6 Integration Verification Script (`npx tsx scratch/verify_phase6.ts`):**
   ```bash
   npx tsx scratch/verify_phase6.ts
   # Output:
   # 1. Fetching detection observations for TEST-INC-001 (UUID 820d5447-eb9f-4264-9e66-995fd147d6a7) ->
   #    Detections count: 1
   #    Verified Detection Type: WATERLOGGING
   #    Verified Confidence: 0.94 (94%)
   #    Verified Frame Number: 127
   #    Verified Location: Point [77.6631, 12.8452]
   # 2. Fetching detections for PG-SPATIAL-INC01 (UUID 6ba7265f-0326-40dd-bcb2-699c7bf4398d) -> Detections count: 0 (Empty state verified)
   # 3. Fetching detections for NONEXISTENT-99999 -> Caught ApiError 404: "Incident 'NONEXISTENT-99999' not found.", Detections count: 0 (Graceful error handling)
   ```

### 8. Recommended Next Step
* Proceed to **Phase 7**: Connect field inspection reports (`POST` & `GET /api/v1/incidents/{incident_id}/inspections`).
