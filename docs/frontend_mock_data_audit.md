# CivicPulse Frontend Mock Data & Integration Audit

**Audit Date:** August 23, 2026  
**Scope:** `dashboard/client/src/` (105 TS/TSX files inspected)  
**Status:** Audit Complete — Zero Destructive Changes Made  

---

## 1. Verified Real Backend Integrations

The frontend dashboard is fully connected to the FastAPI backend (`http://127.0.0.1:8000/api/v1`) and PostgreSQL/PostGIS database (`civicpulse_db`) across 7 completed integration phases:

1. **Incidents Feed (`GET /api/v1/incidents/`):** Real-time incident retrieval, state filtering, priority sorting, spatial PostGIS coordinate parsing.
2. **Single Incident Detail (`GET /api/v1/incidents/{incident_id}`):** Primary key UUID lookup, tracking code (`incident_code`) display.
3. **Status Transitions & Audit Trail (`PATCH /api/v1/incidents/{incident_id}/status`):** Strict state machine transitions (`VERIFIED`, `REJECTED`, `IN_PROGRESS`, `RE_INSPECTION`, `CLOSED`) with automatic PostgreSQL `IncidentStatusHistory` audit records.
4. **Evidence Assets (`GET /api/v1/incidents/{incident_id}/evidence`):** Live evidence metadata fetching (`file_path`, `evidence_type`, `description`, `is_primary`).
5. **Operator & Assignment Management (`GET /api/v1/users/`, `POST & GET /api/v1/incidents/{incident_id}/assignments`):** Real system user retrieval and operational dispatch assignment creation.
6. **Model Detection Observations (`GET /api/v1/incidents/{incident_id}/detections`):** Frame-level AI detection observations (`detection_type`, `confidence`, `frame_number`, `location`, `detection_metadata`).
7. **Field Verification Inspections (`POST & GET /api/v1/incidents/{incident_id}/inspections`):** Field inspection reports with strict `InspectionResult` enum values (`RESOLVED`, `NOT_RESOLVED`, `PARTIALLY_RESOLVED`).

---

## 2. Mock Data Inventory

| File Path | Mock Dependency | Used By | Purpose | Still Needed? | Classification / Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dashboard/client/src/data/mockIncidents.ts` | `INITIAL_MOCK_INCIDENTS` | `incidentService.ts` | Offline dev fixture when API is disconnected. | Yes | `KEEP FOR DEVELOPMENT` |
| `dashboard/client/src/data/mockIncidents.ts` | `generateSvgFrame` | `incidentService.ts`, `EvidenceViewer.tsx` | SVG data URI frame renderer for local filesystem evidence paths (`outputs/evidence/...`). | Yes | `KEEP AS FALLBACK` (Legitimate UI Fallback) |
| `dashboard/client/src/data/mockAnalytics.ts` | `MOCK_ANALYTICS_DATA` | `analyticsService.ts` | Trend history (`trend`), zone metrics (`zoneMetrics`), and distribution charts. | Yes | `REMOVE BEFORE DEMO` (After Phase 9 Analytics Integration) |
| `dashboard/client/src/services/inferenceService.ts` | `generateInferenceOverlaySvg`, `MOCK_PRESET_FOOTAGE` | `DroneIngestionStudio.tsx` | Aerial drone surveillance video simulation & preset video stream feed. | Yes | `KEEP FOR DEVELOPMENT` (Simulation Studio) |
| `dashboard/client/src/__tests__/incidentService.test.ts` | `resetToMockData` | Unit Tests | Offline unit test fixtures. | Yes | `KEEP FOR DEVELOPMENT` |
| `dashboard/client/src/__tests__/incidentFilters.test.ts` | `INITIAL_MOCK_INCIDENTS` | Unit Tests | Filter unit test fixtures. | Yes | `KEEP FOR DEVELOPMENT` |

---

## 3. localStorage Inventory

| File Path | Key | Purpose | Legitimate? | Classification / Action |
| :--- | :--- | :--- | :--- | :--- |
| `dashboard/client/src/services/incidentService.ts` | `civicpulse_incidents_cache` | In-memory cache synced with `localStorage` for offline fallback when backend API is unreachable. | Yes | `KEEP AS FALLBACK` |
| `dashboard/client/src/contexts/ThemeContext.tsx` | `theme` | Persists user dark/light UI theme preference. | Yes | `KEEP PERMANENTLY` |
| `dashboard/client/src/components/map/IncidentMapView.tsx` | `civicpulse_gmaps_key` | User-provided Google Maps API key override if `.env` key is absent. | Yes | `KEEP PERMANENTLY` |
| `dashboard/client/src/components/overview/MiniMapWidget.tsx` | `civicpulse_gmaps_key` | User-provided Google Maps API key override if `.env` key is absent. | Yes | `KEEP PERMANENTLY` |

* **Total localStorage Dependencies:** 4 keys  
* **Total sessionStorage Dependencies:** 0 keys  

---

## 4. Hard-coded Data Inventory

| Item Type | File / Location | Hard-coded Value | Purpose | Legitimate? | Classification / Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Google Map ID | `IncidentMapView.tsx`, `MiniMapWidget.tsx`, `Map.tsx` | `"DEMO_MAP_ID"` | Google Maps Vector rendering ID. | Yes | `KEEP PERMANENTLY` |
| Default Coordinates | `incidentService.ts` (L115-116) | `lat: 12.8452, lng: 77.6631` | Default lat/lng for Electronics City if incident GeoJSON location is null. | Yes | `KEEP AS FALLBACK` |
| Telemetry Coords | `inferenceService.ts` (L66, 76, 87) | `lat: 12.8452, lng: 77.6631` | Simulated drone GPS telemetry coordinates. | Yes | `KEEP FOR DEVELOPMENT` |
| Mock Analytics KPIs | `mockAnalytics.ts` (L4-13) | `waterloggedAreaSqm: 1450`, `meanTimeToResolutionHours: 1.4` | Fallback KPI values for analytics dashboard. | Partial | `SHOULD REPLACE IN PHASE 9` |
| Mock Zone Metrics | `mockAnalytics.ts` (L23-60) | `EC-01` to `EC-04` zone aggregations | Zone breakdown chart fixtures. | Partial | `SHOULD REPLACE IN PHASE 9` |
| Mock Trend Data | `mockAnalytics.ts` (L14-22) | 7-day rainfall & incident trend history | Historical trend chart fixtures. | Partial | `SHOULD REPLACE IN PHASE 9` |

---

## 5. Fallback Inventory

1. **API $\rightarrow$ Local Cache Fallback:** `incidentService.ts` (`loadInitialState()`). Executed when `GET /api/v1/incidents/` returns network error or offline state. *(Legitimate Development / Offline Fallback)*
2. **Evidence Image SVG Generator:** `incidentService.ts` (`generateSvgFrame`). Used when backend evidence `file_path` is a local filesystem relative string (`outputs/evidence/test.jpg`) that cannot be rendered directly by browser DOM `<img>` tag without static file serving. *(Legitimate UI Rendering Fallback)*
3. **Default Electronics City Point:** `incidentService.ts` (`mapBackendIncidentToFrontend`). Used when backend incident `location` GeoJSON object is null or missing coordinates. *(Legitimate Spatial Fallback)*
4. **Google Maps API Key Fallback:** `IncidentMapView.tsx` (`localStorage` $\rightarrow$ `import.meta.env`). Used when `VITE_GOOGLE_MAPS_API_KEY` is undefined in browser environment. *(Legitimate Developer UX Fallback)*

---

## 6. Map Data Audit

* **Source of Map Markers:**
  - `CivicPulseDashboard.tsx` fetches live backend incidents via `useIncidents()`.
  - `useIncidents()` calls `incidentService.getIncidents()`, issuing `GET /api/v1/incidents/` to FastAPI / PostgreSQL / PostGIS.
  - `mapBackendIncidentToFrontend()` parses PostGIS 4326 GeoJSON `location.coordinates` (`[lng, lat]`) into `coordinates: { lat, lng }`.
  - `<IncidentMapView incidents={incidents} />` renders Advanced Markers on Google Maps using live coordinates (`lat: incident.coordinates.lat, lng: incident.coordinates.lng`).
  - **Verdict:** **100% REAL BACKEND POSTGIS INCIDENT LOCATIONS**. Hard-coded coordinates `12.8452, 77.6631` only act as a safety fallback if an incident has no spatial geometry.

---

## 7. Analytics Audit

* **Current Implementation (`analyticsService.ts`):**
  - **Dynamic Elements (Real Data Driven):** `totalActiveIncidents`, `criticalP1Count`, `highP2Count`, `routineP3Count`, `waterloggedAreaSqm`, `potholeClustersCount`, and `pendingVerificationCount` are calculated dynamically in real-time from the active backend incident list (`incidents.filter(...)`).
  - **Mock/Demo Elements (Hard-coded Fixtures):** `meanTimeToResolutionHours` (`1.4`), `trend` (7-day historical rainfall vs waterlogging vs potholes), `zoneMetrics` (`EC-01` to `EC-04` zone breakdowns), and `statusDistribution` & `priorityDistribution` static arrays (merged from `MOCK_ANALYTICS_DATA`).
  - **Recommendation:** Phase 9 should integrate dedicated FastAPI analytics endpoints (`GET /api/v1/analytics/summary`, `GET /api/v1/analytics/trends`, `GET /api/v1/analytics/zones`) to make 100% of the Analytics Dashboard live and backend-backed.

---

## 8. Removal & Retention Plan

### A. REMOVE NOW (Dead Code)
* **0 items**: No dead code identified; all existing functions serve an active purpose (API integration, fallback, testing, or simulation studio).

### B. REMOVE BEFORE DEMO (After Phase 9 Analytics Integration)
* `MOCK_ANALYTICS_DATA` in `dashboard/client/src/data/mockAnalytics.ts` (once Phase 9 analytics backend endpoints are connected).

### C. KEEP AS FALLBACK (Legitimate UI & System Fallbacks)
* `generateSvgFrame` in `dashboard/client/src/data/mockIncidents.ts` (for local relative evidence path rendering).
* Default coordinates `lat: 12.8452, lng: 77.6631` in `incidentService.ts` (for incidents missing PostGIS geometry).
* `localStorage` key `civicpulse_incidents_cache` in `incidentService.ts` (for offline dev state).
* `localStorage` key `theme` in `ThemeContext.tsx` (for dark/light user preference).
* `localStorage` key `civicpulse_gmaps_key` in `IncidentMapView.tsx` (for user map API key override).

### D. KEEP FOR DEVELOPMENT / SIMULATION
* `DroneIngestionStudio.tsx` & `inferenceService.ts` (Drone stream simulation & live detection demo studio).
* `INITIAL_MOCK_INCIDENTS` in `mockIncidents.ts` (Offline development fixture).

---

## 9. Recommended Phase 9: Real-Time Analytics Integration

Wire real-time analytics aggregation endpoints (`GET /api/v1/analytics/summary`, `GET /api/v1/analytics/trends`, `GET /api/v1/analytics/zones`) to replace `mockAnalytics.ts` entirely.
