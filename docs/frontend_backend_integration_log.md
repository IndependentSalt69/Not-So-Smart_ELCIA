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

### 4. Endpoint Integrated
* **Endpoint:** `GET /api/v1/incidents/{incident_id}/evidence`
* **Request URL Example:** `http://127.0.0.1:8000/api/v1/incidents/820d5447-eb9f-4264-9e66-995fd147d6a7/evidence`
* **Response Model:** `List[EvidenceResponse]`

### 5. `EvidenceResponse` $\rightarrow$ Frontend `EvidenceAsset` Mapping
| Backend Field (`EvidenceResponse`) | Frontend Field (`EvidenceAsset`) | Mapping / Notes |
| :--- | :--- | :--- |
| `id` | `id` | Evidence UUID. |
| `incident_id` | `incidentId` | Parent incident UUID. |
| `evidence_type` | `evidenceType` | Enum (`IMAGE` \| `VIDEO` \| `CLIP`). |
| `file_path` | `filePath` | Raw stored string (e.g. `outputs/evidence/test-waterlogging.jpg`). |
| `captured_at` | `capturedAt` | Optional ISO datetime. |
| `description` | `description` | Optional description string. |
| `is_primary` | `isPrimary` | Boolean primary asset indicator flag. |
| `created_at` | `createdAt` | ISO datetime string. |

### 6. Browser Accessibility & File Path Handling
* **Filesystem-relative paths:** The backend returns `file_path = "outputs/evidence/test-waterlogging.jpg"`. Because no static HTTP file server route exists yet on the FastAPI backend, the raw path cannot be directly loaded by browser `<img>` tags (`http://127.0.0.1:8000/outputs/evidence/...` returns 404).
* **UI Handling Strategy:**
  - The exact `file_path` string is rendered in an explicit HUD metadata banner (`Path: outputs/evidence/test-waterlogging.jpg`, `Type: IMAGE`, `Primary: true`).
  - To prevent broken image renders in the browser, the visual canvas preserves the SVG frame preview when `file_path` is a local filesystem path.
  - If a browser-accessible URL (starting with `http://`, `https://`, or `data:`) is returned, the viewer renders the live image directly.

### 7. Loading, Empty & Error States
* **Loading:** Displays an active loading indicator (`Fetching backend evidence metadata...`).
* **Empty State:** If an incident has no evidence (e.g. `PG-SPATIAL-INC01`), displays `No backend evidence assets attached to this incident` chip.
* **Error Handling:** If `ApiError` 404 or network failure occurs, the catch block logs a warning, returns `[]`, and renders the empty state cleanly without UI crash.

### 8. Tests & Commands Executed
1. **TypeScript Typecheck (`npm run check`):**
   ```bash
   npm run check
   # Result: Exit code 0, 0 type errors.
   ```
2. **Phase 4 Integration Verification Script (`npx tsx scratch/verify_phase4.ts`):**
   ```bash
   npx tsx scratch/verify_phase4.ts
   # Output:
   # 1. Fetching evidence for TEST-INC-001 (UUID 820d5447-eb9f-4264-9e66-995fd147d6a7) -> Evidence Count: 1, Type: IMAGE, Path: outputs/evidence/test-waterlogging.jpg, Description: Backend integration test evidence, Primary: true
   # 2. Fetching evidence for PG-SPATIAL-INC01 (UUID 6ba7265f-0326-40dd-bcb2-699c7bf4398d) -> Evidence Count: 0 (Empty state verified)
   # 3. Fetching evidence for NONEXISTENT-99999 -> Caught ApiError 404, Evidence Count: 0 (Graceful error handling)
   ```

### 9. Known Limitations
* No static HTTP file serving endpoint currently exists on the FastAPI backend for serving raw local filesystem assets under `outputs/evidence/`.

### 10. Recommended Next Step
* Proceed to **Phase 5**: Connect field crew & mitigation task assignments (`POST /api/v1/incidents/{incident_id}/assignments`) or detection observations (`GET /api/v1/incidents/{incident_id}/detections`).
