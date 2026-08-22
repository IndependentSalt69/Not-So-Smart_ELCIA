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

### 4. Exact Changes Made
* Updated `Incident` interface contract in `types/incident.ts` to support both `id` (database primary key UUID) and `code` (human-readable tracking code e.g. `TEST-INC-001`).
* Refactored `mapBackendIncidentToFrontend()` in `incidentService.ts` to assign `id = item.id` (UUID) and `code = item.incident_code`.
* Implemented `getIncidentById(id: string)` in `incidentService.ts` using `api.get<BackendIncidentItem>(`/incidents/${id}`)` with safe 404 error handling and fallback to local state if offline.
* Wired `handleSelectIncident` in `CivicPulseDashboard.tsx` to asynchronously fetch single incident details from the backend upon drawer open.

### 5. API Endpoint Integrated
* **Endpoint:** `GET /api/v1/incidents/{incident_id}`
* **Request URL Example:** `http://127.0.0.1:8000/api/v1/incidents/820d5447-eb9f-4264-9e66-995fd147d6a7` or `http://127.0.0.1:8000/api/v1/incidents/TEST-INC-001`
* **Response Model:** `IncidentResponse`

### 6. Backend → Frontend Field Mappings
| Backend Field (`IncidentResponse`) | Frontend Field (`Incident`) | Transformation / Notes |
| :--- | :--- | :--- |
| `id` (UUID) | `id` | Database primary key (used for all API requests). |
| `incident_code` | `code` | Tracking code label (used for UI display). |
| `incident_type` (`WATERLOGGING` \| `POTHOLE`) | `type` (`waterlogging` \| `pothole`) | Lowercase string conversion. |
| `confidence` | `confidence` | Direct `0.0 - 1.0` float. |
| `severity_score` | `severity` | Direct `0.0 - 10.0` float. |
| `priority` (`P1` \| `P2` \| `P3`) | `priority` | String enum. |
| `status` | `status` | Lifecycle status enum (`VERIFIED`, `DETECTED`, etc.). |
| `started_at` \|\| `created_at` | `timestamp` | ISO datetime string. |
| `duration_seconds` | `durationSeconds` | Defaults to duration or 180s. |
| `recommended_action` | `recommendedAction` | Preserves existing fallback string if null. |
| `location` (`{ type: "Point", coordinates: [lng, lat] }`) | `coordinates` (`{ lat, lng }`) | GeoJSON `[77.6631, 12.8452]` converted to `{ lat: 12.8452, lng: 77.6631 }`. |

### 7. Identifier Handling
* The backend `repo_get_incident` accepts both primary key UUIDs and string tracking codes.
* Frontend `mapBackendIncidentToFrontend` sets `id` to the actual database UUID (`item.id`) while storing `code = item.incident_code`. All subsequent API requests use the database UUID.

### 8. Tests & Commands Executed
1. **TypeScript Typecheck (`npm run check`):**
   ```bash
   npm run check
   # Result: Exit code 0, 0 type errors.
   ```
2. **Phase 2 Verification Script (`npx tsx scratch/verify_phase2.ts`):**
   ```bash
   npx tsx scratch/verify_phase2.ts
   # Result:
   # 1. Fetching TEST-INC-001 by UUID (820d5447-eb9f-4264-9e66-995fd147d6a7) -> Returns status: VERIFIED, type: waterlogging, severity: 9.0, priority: P1
   # 2. Fetching TEST-INC-001 by tracking code -> Returns same record successfully
   # 3. Fetching PG-SPATIAL-INC01 by tracking code -> Returns status: DETECTED, severity: 8.5, coordinates: { lat: 12.8452, lng: 77.6631 }
   # 4. Fetching NONEXISTENT-99999 -> Returns HTTP 404, handled gracefully without UI crash.
   ```

### 9. Warnings / Errors
* **Zero build errors.**
* ApiError status 404 is caught and logged gracefully when querying nonexistent IDs.

### 10. Remaining Mock / Fallback Behavior
* `mockIncidents.ts` is retained as an offline/fallback data provider if the backend API server is unreachable.
* Dynamic SVG frame previews are generated as fallbacks when binary evidence image URLs are null in database records.

### 11. Known Limitations
* Image/video evidence clips (`evidenceClip`), multi-frame detections, assignments, status updates, and field inspections are not yet connected to backend endpoints (scheduled for Phase 3+).

### 12. Recommended Next Step
* Proceed to **Phase 3**: Implement status transition mutation endpoints (`PATCH /api/v1/incidents/{incident_id}/status`) for human-in-the-loop verification (`VERIFIED` / `REJECTED`) and lifecycle progression (`IN_PROGRESS`, `RE_INSPECTION`, `CLOSED`).
