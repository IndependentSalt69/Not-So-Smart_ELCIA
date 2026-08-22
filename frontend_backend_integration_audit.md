# CivicPulse Frontend — Backend Integration Audit Report

**Date:** August 23, 2026  
**Repository:** CivicPulse / Not-So-Smart_ELCIA  
**Scope:** Complete audit of the frontend/dashboard implementation for backend REST API integration readiness.  
**Target Output File:** `frontend_backend_integration_audit.md`

---

## 1. Executive Summary

The CivicPulse frontend is a highly polished, production-grade React application designed for municipal surveillance and automated incident triage across Electronics City Phase 1 & 2. 

* **UI/UX Quality:** State-of-the-art responsive design with dark mode support, sliding glider tab navigation, Google Maps satellite tracking, frame-by-frame evidence inspection, AI explainability metrics, and full lifecycle state progression.
* **Backend Readiness:** All UI components, state contracts, status enums, and data models **exactly mirror** the domain entity schemas established in the FastAPI + PostGIS database backend.
* **Current Data Source:** The frontend currently operates in **mock/simulation mode**, storing state in `localStorage` (`civicpulse_incidents_v1`) via `incidentService.ts`. No actual HTTP requests are currently being made to the FastAPI endpoints (`http://127.0.0.1:8000/api/v1`).
* **Integration Effort Needed:** Minimal. Connecting the frontend requires refactoring `incidentService.ts` and `analyticsService.ts` to call the available FastAPI endpoints (`/api/v1/incidents`, `/api/v1/zones`, `/api/v1/users`, etc.).

---

## 2. Frontend Framework & Entry Point

* **Framework:** React 18, TypeScript, Vite.
* **Styling:** TailwindCSS v4 with custom dark mode colors (`zinc-950`, `emerald-500`, `amber-500`, `rose-500`), glassmorphism overlays, and shadcn/ui components (`Dialog`, `Switch`, `Select`, `Button`, `Badge`, `Sonner`).
* **Routing:** `wouter` router (`Switch`, `Route`).
* **Maps Library:** `@vis.gl/react-google-maps` using Google Maps JavaScript API (`AdvancedMarker`, `InfoWindow`, `Map`).
* **Charts Library:** `recharts` (`AreaChart`, `PieChart`, `BarChart`, `ResponsiveContainer`).
* **Entry Point Flow:**
  1. `dashboard/client/index.html`
  2. `dashboard/client/src/main.tsx`
  3. `dashboard/client/src/App.tsx` (Provides `ErrorBoundary`, `ThemeProvider`, `TooltipProvider`, `Toaster`, `wouter Router`)
  4. `dashboard/client/src/pages/Home.tsx`
  5. `dashboard/client/src/components/CivicPulseDashboard.tsx` (Main operational shell)

---

## 3. Complete Frontend Folder & File Structure

```text
dashboard/
├── client/
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── const.ts
│       ├── index.css
│       ├── components/
│       │   ├── CivicPulseDashboard.tsx        # Main Operational Dashboard Shell
│       │   ├── ErrorBoundary.tsx
│       │   ├── ManusDialog.tsx
│       │   ├── Map.tsx                        # Google Maps Core Proxy Loader
│       │   ├── analytics/
│       │   │   └── AnalyticsDashboard.tsx     # Recharts Analytics & Metrics View
│       │   ├── common/
│       │   │   ├── EmptyState.tsx             # Empty Filter Results Component
│       │   │   ├── PriorityBadge.tsx          # P1/P2/P3 Badge Component
│       │   │   └── StatusBadge.tsx            # Lifecycle Status Badge Component
│       │   ├── detail/
│       │   │   ├── AssignmentSection.tsx      # Dispatch & Crew Assignment Form
│       │   │   ├── EvidenceViewer.tsx         # Frame Stepper & AI Overlay Canvas
│       │   │   ├── IncidentDetailDrawer.tsx   # Slide-over Comprehensive Triage Drawer
│       │   │   ├── IncidentStepper.tsx        # 6-Step Workflow Progression Bar
│       │   │   ├── SeverityExplainer.tsx      # 4-Vector AI Explainability Breakdown
│       │   │   └── VerificationBar.tsx        # Human-in-the-loop Verify/Reject Bar
│       │   ├── incidents/
│       │   │   ├── IncidentCard.tsx           # Grid/List Incident Card Component
│       │   │   ├── IncidentCardSkeleton.tsx   # Loading Skeleton
│       │   │   ├── IncidentFilters.tsx        # Multi-dimensional Search & Filter Bar
│       │   │   └── IncidentQueueView.tsx      # Incident Feed with Sorting & Layouts
│       │   ├── ingestion/
│       │   │   └── DroneIngestionStudio.tsx   # Simulated Multi-stage YOLOv8/SAM Studio
│       │   ├── layout/
│       │   │   └── Navbar.tsx                 # Sliding Glider Header & View Switcher
│       │   ├── map/
│       │   │   └── IncidentMapView.tsx        # Satellite Spatial Ops Center
│       │   ├── overview/
│       │   │   ├── KpiSummaryGrid.tsx         # Active Incidents & Area KPI Cards
│       │   │   ├── MiniMapWidget.tsx          # Quick Map Preview Widget
│       │   │   ├── OverviewTab.tsx            # Command Center Overview Dashboard
│       │   │   └── RecentAlertsFeed.tsx       # Live Alert Ticker Feed
│       │   └── ui/                            # shadcn UI Primitives
│       ├── contexts/
│       │   └── ThemeContext.tsx
│       ├── data/
│       │   ├── mockAnalytics.ts               # Analytics Baseline Trends & Metrics
│       │   └── mockIncidents.ts               # 12 Detailed Municipal Hazard Fixtures
│       ├── hooks/
│       │   ├── useAnalytics.ts                # Custom Hook for Analytics State
│       │   ├── useComposition.ts
│       │   ├── useIncidents.ts                # Custom Hook for Incidents CRUD & State
│       │   ├── useMobile.tsx                  # Breakpoint Hook (<768px)
│       │   └── usePersistFn.ts
│       ├── lib/
│       │   ├── stateMachine.ts                # Valid Status Transition Rules
│       │   └── utils.ts                       # Classnames Merger (clsx + tailwind-merge)
│       ├── pages/
│       │   ├── Home.tsx
│       │   └── NotFound.tsx
│       ├── services/
│       │   ├── analyticsService.ts            # Analytics Computation & Aggregation Service
│       │   ├── incidentService.ts            # Incident State Management (localStorage)
│       │   └── inferenceService.ts            # Simulated Multi-stage Vision Pipeline
│       └── types/
│           ├── analytics.ts                   # Analytics Data Interfaces
│           ├── incident.ts                    # Incident, Priority, Status Types
│           └── ingestion.ts                   # Ingestion & Telemetry Interfaces
├── server/
│   └── index.ts                               # Express Dev Server Entrypoint
└── shared/
    └── const.ts
```

---

## 4. Dashboard Pages & Components Analysis

| View Name | Component File | Description & Functionality |
| :--- | :--- | :--- |
| **Command Overview** | `OverviewTab.tsx` | Executive summary displaying active KPI grids (`KpiSummaryGrid`), recent critical alerts feed (`RecentAlertsFeed`), quick filters, and interactive mini map (`MiniMapWidget`). |
| **Active Queue** | `IncidentQueueView.tsx` | Surveillance triage feed with search bar, zone filter, status filter, priority filter, grid/list layout switcher, and multi-field sorting (severity, time, confidence, priority). |
| **Spatial Map** | `IncidentMapView.tsx` | Fullscreen Google Maps spatial operations center with zone centers, custom GPS coordinate fly-to, satellite hybrid toggle, pulsing P1 markers, and interactive InfoWindows. |
| **Drone Vision Studio** | `DroneIngestionStudio.tsx` | Simulated multi-stage YOLOv8 & SAM vision inferencing studio supporting sample video footage presets (`Hosur Road Flyover`, `Velankani Drive`), progress tracking, and publishing directly to queue. |
| **Analytics & Trends** | `AnalyticsDashboard.tsx` | Recharts charts displaying monsoon inundation trends, lifecycle status distribution donut, zone incident breakdown bar chart, and resolution time KPIs. |
| **Inspection Drawer** | `IncidentDetailDrawer.tsx` | Slide-over drawer dialog orchestrating evidence viewing, verification/rejection, mitigation assignment, stepper progression, AI explainability, and audit trail history. |

---

## 5. Existing API Services & HTTP Call Audit

### Existing Service Files
1. **`dashboard/client/src/services/incidentService.ts`**:
   - Manages state in memory and persists to `localStorage` (`civicpulse_incidents_v1`).
   - Pre-populates with `INITIAL_MOCK_INCIDENTS` from `mockIncidents.ts`.
   - Simulates async network delays (`setTimeout(..., 30)`).
   - Functions provided:
     * `getIncidents(filters, sortField, sortDir)`
     * `getIncidentById(id)`
     * `verifyIncident(id, actor, notes)`
     * `rejectIncident(id, reason, actor)`
     * `assignIncident(id, owner, action, actor)`
     * `updateIncidentStatus(id, nextStatus, actor, notes)`
     * `createIncident(incident)`
     * `resetToMockData()`
2. **`dashboard/client/src/services/analyticsService.ts`**:
   - Calculates dynamic KPIs from `incidentService.getIncidents()`.
   - Merges dynamic active counts with `MOCK_ANALYTICS_DATA`.
   - Functions provided:
     * `getAnalyticsSummary()`
     * `getKpiMetrics()`
3. **`dashboard/client/src/services/inferenceService.ts`**:
   - Generates SVG overlay frames for waterlogging and pothole hazard presets.
   - Simulates 5-stage AI inference pipeline execution.
   - Functions provided:
     * `getSamplePresets()`
     * `analyzeMedia(options)`
     * `publishAsIncident(result)`

### HTTP API Call Audit (`fetch` / `axios`):
* **REST API Calls to FastAPI Backend:** **0 calls**. Currently, no `fetch()` or `axios` calls are made to `http://127.0.0.1:8000/api/v1/`.
* **External Script Loading:** `Map.tsx` and `IncidentMapView.tsx` inject Google Maps API script from `https://forge.butterfly-effect.dev/v1/maps/proxy/maps/api/js`.

---

## 6. Hard-Coded & Mock Datasets Audit

### Incident Mock Dataset (`dashboard/client/src/data/mockIncidents.ts`)
Contains 12 comprehensive municipal hazard incidents covering Electronics City Phase 1 & 2:
1. `EC-0142`: Waterlogging — Hosur Road Flyover Underpass (`P1`, Severity `8.7`, Lat `12.8452`, Lng `77.6631`)
2. `EC-0145`: Waterlogging — Toll Plaza Inbound Express Lane (`P1`, Severity `8.2`, Lat `12.8510`, Lng `77.6595`)
3. `EC-0148`: Pothole — Velankani Drive Transit Corridor (`P1`, Severity `8.4`, Lat `12.8385`, Lng `77.6745`)
4. `EC-0150`: Waterlogging — West Phase 1 Main Entrance (`P2`, Severity `7.1`, Lat `12.8495`, Lng `77.6655`)
5. `EC-0152`: Pothole — Phase 2 Tech Park Loop Road (`P2`, Severity `6.8`, Lat `12.8350`, Lng `77.6810`)
6. `EC-0155`: Waterlogging — West Phase 1 Gate 2 (`P3`, Severity `4.2`, Lat `12.8415`, Lng `77.6610`)
7. `EC-0160`: Waterlogging — Siemens Transit Junction (`P1`, Severity `8.9`, Lat `12.8470`, Lng `77.6670`)
8. `EC-0162`: Pothole — Wipro Gate 5 Access Road (`P2`, Severity `6.5`, Lat `12.8400`, Lng `77.6710`)
9. `EC-0165`: Waterlogging — Cyber Park Drainage Outlet (`P2`, Severity `7.4`, Lat `12.8530`, Lng `77.6620`)
10. `EC-0170`: Pothole — Infosys Gate 4 Service Lane (`P3`, Severity `4.8`, Lat `12.8370`, Lng `77.6760`)
11. `EC-0172`: Waterlogging — Electronics City Bus Terminal (`P1`, Severity `8.6`, Lat `12.8440`, Lng `77.6640`)
12. `EC-0175`: Pothole — Phase 2 Freight Corridor (`P2`, Severity `6.2`, Lat `12.8320`, Lng `77.6830`)

### "Traffic Congestion" Mock/Demo Data Audit:
* **Audit Finding:** **Zero traffic congestion data exists**.
* All incident types across `mockIncidents.ts`, `mockAnalytics.ts`, `inferenceService.ts`, and `incident.ts` are strictly `waterlogging` or `pothole` hazards.

---

## 7. Subsystem-by-Subsystem Technical Audit

### A. Google Maps & Marker Logic (`IncidentMapView.tsx`, `Map.tsx`)
* **Libraries:** `@vis.gl/react-google-maps`.
* **Center Coordinates:** Electronics City (`12.8450°N, 77.6650°E`).
* **Zone Presets:** `EC-01` (Phase 1 West), `EC-02` (Phase 1 East), `EC-03` (Phase 2 Tech Park), `EC-04` (Main Junction).
* **Marker Rendering:** Uses `<AdvancedMarker>`. `P1 Critical` markers render a pulsing red radar ring (`animate-ping`). Icon `🌊` for waterlogging, `⚠️` for pothole.
* **Marker Interaction:** Clicking a marker updates `targetCoords` to fly camera smoothly to the spot (`MapFlyToController`) and opens `<InfoWindow>` with inspection CTA.
* **Manual GPS Input:** Supports typing custom latitude & longitude to fly camera to any exact point.

### B. Incident Queue & Filters (`IncidentQueueView.tsx`, `IncidentFilters.tsx`)
* **Filters Supported:** Type (`waterlogging`, `pothole`, `all`), Priority (`P1`, `P2`, `P3`, `all`), Status (`DETECTED`, `VERIFIED`, etc.), Zone (`EC-01` to `EC-04`, `all`), and Search Query (searches ID, location description, zone, type).
* **Sorting Options:** Severity (desc/asc), Timestamp (desc/asc), AI Confidence (desc), Priority (P1 first).
* **Layouts:** Toggle between responsive grid cards and compact list view.

### C. Incident Detail Panel (`IncidentDetailDrawer.tsx`)
* Slide-over modal dialog rendering location header, lat/lng coordinates, triage actions, evidence, stepper, explainability, and audit trail.

### D. Evidence Viewer (`EvidenceViewer.tsx`)
* Displays primary frame (`evidenceFrame`) and AI segmentation overlay (`evidenceOverlay`).
* Features an **AI Overlay Toggle Switch** to turn mask/bounding box ON/OFF.
* Includes **Photo vs Video Stream** toggle and frame stepper controls (`-1 frame`, `+1 frame`, `play/pause`, scrub bar).
* HUD overlay stamp displays active camera ID, GPS coordinates, frame number, and resolution (`1080p 60FPS`).

### E. Confidence, Severity & Priority Displays
* **Confidence:** Formatted as percentage badges (e.g. `94%`).
* **Severity:** Displayed as `X.X / 10` score. High severity (>8.0) highlighted in red.
* **Priority Badges (`PriorityBadge.tsx`):**
  * `P1`: Red badge with pulsing red dot (`P1 Critical`).
  * `P2`: Orange badge (`P2 High`).
  * `P3`: Amber/yellow badge (`P3 Routine`).

### F. "Why High Priority?" Explainability (`SeverityExplainer.tsx`)
* Implements a **4-Vector Sensor Fusion Explainability Meter**:
  1. *Water Extent & Road Surface Area* (Score 0-10, e.g. `78% lane coverage (~340 m²)`)
  2. *Temporal Persistence & Duration* (Score 0-10, e.g. `184s continuous verification`)
  3. *Road Obstruction & Lane Blockage* (Score 0-10, e.g. `High dual-lane blockage`)
  4. *Corridor & Junction Criticality* (Score 0-10, e.g. `Primary arterial junction`)
* Includes bulleted "Operational Reasoning Summary" generated by AI.

### G. Human-in-the-Loop Triage (`VerificationBar.tsx`)
* Renders when incident status is `DETECTED`.
* **Verify Action:** Advances status `DETECTED -> VERIFIED`, logs operator name and timestamp.
* **Reject Action (False Positive):** Advances status `DETECTED -> REJECTED`. Prompts operator for rejection rationale from dropdown:
  - *Optical reflection / Specular glare on wet road*
  - *Transient shadow / Tree canopy optical distortion*
  - *Water depth below operational threshold (<5cm)*
  - *Surface discoloration / Construction gravel texture*
  - *Duplicate scan of adjacent corridor marker*

### H. Dispatch & Mitigation Assignment (`AssignmentSection.tsx`)
* Renders when incident status is `VERIFIED`.
* Allows dispatching response crew (e.g. `Drainage Operations Team A`, `Emergency Pump Unit 2`) and selecting recommended mitigation protocol (e.g. `Deploy high-capacity mobile de-watering sump pumps`).
* Advances status `VERIFIED -> ASSIGNED`.

### I. Status Progression & State Machine (`IncidentStepper.tsx`, `stateMachine.ts`)
* Full 6-step lifecycle stepper:
  $$\text{DETECTED} \longrightarrow \text{VERIFIED} \longrightarrow \text{ASSIGNED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{RE\_INSPECTION} \longrightarrow \text{CLOSED}$$
* Enforces strict state machine rules via `canTransition(fromStatus, toStatus)` in `src/lib/stateMachine.ts`.

### J. Analytics Implementation (`AnalyticsDashboard.tsx`)
* **Monsoon Inundation Trend:** Recharts `AreaChart` plotting waterlogged surface area (m²) against rainfall (mm).
* **Lifecycle Distribution:** Recharts `PieChart` / Donut chart showing active incident counts by status.
* **Zone Incident Breakdown:** Recharts `BarChart` showing P1, P2, P3 incident counts grouped by zone (`EC-01` to `EC-04`).

### K. Responsive & Mobile Implementation
* Mobile-responsive breakpoints managed via `useMobile.tsx` (<768px).
* Navbar collapses into a full-screen mobile menu overlay (`isMobileMenuOpen`).
* Main layout switches from multi-column grid to single-column stack on smaller screens.

### L. Current Environment & API URL Configuration
* Currently, `dashboard/client/src/const.ts` contains:
  * `import.meta.env.VITE_OAUTH_PORTAL_URL`
  * `import.meta.env.VITE_APP_ID`
* Currently, `dashboard/client/src/components/map/IncidentMapView.tsx` contains:
  * `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`
* **API Base URL Configuration:** `VITE_API_BASE_URL` is **not yet defined** in the frontend client configuration.

---

## 8. Integration Mapping: Frontend UI to Backend API Contract

Below is the mapping between existing frontend UI features and the verified FastAPI backend endpoints:

| Frontend UI Feature | Component / Service | Available FastAPI Backend Endpoint | Data Mapping Notes |
| :--- | :--- | :--- | :--- |
| **Health Status** | `Navbar.tsx` | `GET /api/v1/health` | Can display backend database connection health badge in Navbar. |
| **Zone Filter & List** | `IncidentMapView.tsx`, `IncidentFilters.tsx` | `GET /api/v1/zones/` | Map zones directly to PostGIS zone records (`code`, `name`, `geometry`). |
| **Incidents Queue** | `IncidentQueueView.tsx`, `useIncidents.ts` | `GET /api/v1/incidents/` | Map backend list response (`items`, `total`) to frontend `Incident[]`. Filter params match (`status`, `priority`, `zone_id`, `incident_type`). |
| **Single Incident** | `IncidentDetailDrawer.tsx` | `GET /api/v1/incidents/{incident_id}` | Retrieve incident details including GeoJSON point coordinates (`location`). |
| **Create Incident** | `DroneIngestionStudio.tsx` | `POST /api/v1/incidents/` | Publish inferred drone detections to backend PostGIS database. |
| **Verify / Reject** | `VerificationBar.tsx` | `PATCH /api/v1/incidents/{incident_id}/status` | Send `status: "VERIFIED"` or `status: "REJECTED"` with operator `comment` & `changed_by`. |
| **Dispatch Assignment** | `AssignmentSection.tsx` | `POST /api/v1/incidents/{incident_id}/assignments` | Submit assigned team and notes to backend assignment repository. |
| **Status Progression** | `IncidentStepper.tsx` | `PATCH /api/v1/incidents/{incident_id}/status` | Advance lifecycle status (`IN_PROGRESS`, `RE_INSPECTION`, `CLOSED`). |
| **Evidence Media** | `EvidenceViewer.tsx` | `GET /api/v1/incidents/{incident_id}/evidence` | Fetch primary frame, overlay mask, and video clip assets from backend evidence table. |
| **Frame Detections** | `EvidenceViewer.tsx` | `GET /api/v1/incidents/{incident_id}/detections` | Retrieve frame-level detection observations and SAM mask metadata. |
| **Field Inspection** | `IncidentStepper.tsx` | `POST /api/v1/incidents/{incident_id}/inspections` | Record inspector resolution notes and evidence verification. |
| **Audit History** | `IncidentDetailDrawer.tsx` | `GET /api/v1/incidents/{incident_id}/history` | Display complete audit trail from `incident_status_history` table. |

---

## 9. Ready vs Placeholder / Mock Component Categorization

### A. Components Fully Ready for Backend Connection (UI / Props Layer)
These components are 100% complete and require **zero layout or styling changes**:
* `CivicPulseDashboard.tsx`
* `OverviewTab.tsx`
* `IncidentQueueView.tsx`
* `IncidentMapView.tsx`
* `IncidentCard.tsx`
* `IncidentFilters.tsx`
* `IncidentDetailDrawer.tsx`
* `VerificationBar.tsx`
* `AssignmentSection.tsx`
* `EvidenceViewer.tsx`
* `SeverityExplainer.tsx`
* `IncidentStepper.tsx`
* `Navbar.tsx`

### B. Placeholders & Service Adapters Requiring Backend API Wiring
To transition the application from simulation mode to live production, the following files need API integration:

1. **`dashboard/client/src/services/incidentService.ts`**:
   - *Current State:* Synchronizes with `localStorage` and `INITIAL_MOCK_INCIDENTS`.
   - *Required Action:* Replace mock methods with `fetch()` calls to `http://127.0.0.1:8000/api/v1/incidents/`.
2. **`dashboard/client/src/services/analyticsService.ts`**:
   - *Current State:* Computes KPIs in memory from mock incidents.
   - *Required Action:* Fetch dynamic metrics from backend list and count endpoints.
3. **`dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx`**:
   - *Current State:* Simulates YOLOv8/SAM inference with `setTimeout`.
   - *Required Action:* Connect "Publish as Active Incident" to `POST /api/v1/incidents/`.
4. **Environment Configuration (`.env`)**:
   - *Current State:* `VITE_API_BASE_URL` is missing.
   - *Required Action:* Add `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` to `dashboard/client/.env`.

---

## 10. Conclusion & Next Steps

The CivicPulse frontend architecture is exceptionally well-structured, modular, and fully aligned with the backend PostgreSQL/PostGIS database schema and FastAPI endpoints. No refactoring of component UI, state machines, or design assets is necessary.

Connecting the frontend to the backend will involve simply swapping the mock data layer in `incidentService.ts` with HTTP API calls targeting `http://127.0.0.1:8000/api/v1/`.
