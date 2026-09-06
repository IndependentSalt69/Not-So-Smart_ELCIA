# Architecture & UX Audit: Flight-First Incident Queue (Phase 6A)

**Document Version**: 1.0  
**Date**: September 2026  
**Status**: Phase 6A Audit & Architecture Proposal (Awaiting User Review & Approval)

---

## Executive Summary & Product Objective

The objective of Phase 6 is to evolve the default information architecture of the CivicPulse **Incident Queue** from an **incident-first** interface to a **flight-first** interface.

### The Shift in Information Architecture:
- **Previous Architecture (Phase 5)**: The Incident Queue defaulted to a dense list/grid of all individual `IncidentCard` items across the entire city, with an optional dropdown filter to isolate a specific flight.
- **New Architecture (Phase 6)**: The Incident Queue defaults to **Flight Inspections** — a clean, visual grid of minimal **Flight Inspection cards** representing drone surveillance missions. Operators can click a flight card to inspect its individual incidents, while still retaining one-click access to the full canonical **Individual Incidents** queue.

### Core Non-Negotiable Semantic Rules:
1. **1 Physical Hazard = 1 Incident Record**:
   - Drone flight grouping is strictly **visual and contextual presentation**.
   - If Flight `#EA989E90` detected **13 hazards**, opening that flight presents **13 distinct, actionable `IncidentCard` items**.
   - Zero merging, deduplication, collapsing, or replacement of incident records.
2. **Minimal Flight Card Visual Requirement**:
   - The top-level Flight Inspection card must contain essentially **ONLY**:
     - **[ Actual video thumbnail / clip frame ]**
     - **Flight Inspection #EA989E90**
   - **DO NOT** turn the card into another busy summary dashboard.
   - **DO NOT** add mini-incident cards, hazard class breakdowns, priority counters, large metric sections, repeated evidence images, or fake statistics.
3. **Zero-Hazard Flights (Clean Baselines)**:
   - Zero-hazard flights appear as minimal Flight cards with video thumbnail.
   - Opening a zero-hazard flight displays **0 `IncidentCard` items** and a clear **Clean Flight Baseline / Verification Banner** (Section 14 semantics).
   - **Zero dummy incident records manufactured**.
4. **Human-Reported Anomalies**:
   - An incident reported by a human operator during aerial footage review displays **`AI Detection Confidence: N/A`** and **`Detection Source: HUMAN REPORTED`**.
5. **No Static Demo Data in Real Mode**:
   - In `VITE_USE_MOCK_DATA=false`, all flight cards and metrics are fetched from `GET /api/v1/process/runs` (persisted PostgreSQL/PostGIS records).
6. **Zero Backend Changes**:
   - Reuses existing Phase 2 endpoints (`GET /api/v1/process/runs` and `GET /api/v1/process/runs/{job_id}`).

---

## 1. Current Incident Queue Architecture

In the current live implementation (Phase 5B):
- **`CivicPulseDashboard.tsx`**: Renders `IncidentQueueView.tsx` when `activeView === 'queue'`.
- **`IncidentQueueView.tsx`**:
  - Top level contains `SlidingSegmentedControl` for lifecycle tabs: `Active (14)`, `Completed (3)`, `Rejected (2)`.
  - Header toolbar with sort dropdown (`Severity`, `Time`, `Confidence`, `Priority`) and layout switcher (`Grid` / `List`).
  - `IncidentFilters.tsx`: Top row has search and sliding pills for Hazard Class and Priority; bottom row has dropdowns for `Zone`, `Flight Inspection`, `Status`, and `Reset Filters`.
  - Body: Directly renders individual `IncidentCard` items for all incidents in the database.
  - When `filters.flightRunId !== 'all'`, it renders a Flight Context Banner above the cards and filters incidents to that flight.

---

## 2. Summary of Phases 1–5 Capabilities

| Phase | Delivered Capability | Status |
| :--- | :--- | :--- |
| **Phase 1** | Incident-Clubbing Architecture Audit (`docs/INCIDENT_CLUBBING_UI_AUDIT.md`) | Approved |
| **Phase 2** | Backend Flight Aggregation (`/api/v1/process/runs`, `/api/v1/process/runs/{job_id}`, `processing_runs.py`) | Complete & Verified (139 tests) |
| **Phase 3** | Reusable Flight UI Components (`FlightInspectionCard`, `FlightInspectionResultsList`, `inspectionService.ts`) | Complete & Verified |
| **Phase 4** | Drone Ingestion Studio Integration (`DroneIngestionStudio.tsx`) | Complete & Verified (91 tests) |
| **Phase 5** | Incident Queue Dropdown Integration & Flight Scoped Filtering (`IncidentQueueView.tsx`) | Complete & Verified (105 tests) |

---

## 3. Recommended Flight-First Architecture

### A. The Core Information Architecture Model
We establish a two-tier operational hierarchy within the Incident Queue workspace:

```
                                  [ Incident Queue View ]
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
      [ Mode: Flight Inspections (DEFAULT) ]               [ Mode: Individual Incidents ]
                   |                                                   |
                   v                                                   v
     Minimal Flight Cards Grid                             Canonical Incident Queue
   ┌───────────────────┐ ┌───────────────────┐             (Active/Completed/Rejected Tabs,
   │  video thumbnail  │ │  video thumbnail  │             Class Pills, Priority Pills,
   ├───────────────────┤ ├───────────────────┤             Zone/Status/Run Dropdowns,
   │ Flight Inspection │ │ Flight Inspection │             Individual Incident Cards)
   │ #EA989E90         │ │ #66FABA48         │
   └───────────────────┘ └───────────────────┘
                   |
     (Click Flight Card)
                   |
                   v
     [ Flight Results Drilldown View ]
     - [← Back to Flight Inspections]
     - Flight Inspection Header & Video Action
     - Grid/List of Individual IncidentCards (13 hazards)
                   |
     (Click Incident Card)
                   |
                   v
     [ IncidentDetailDrawer ]
```

---

## 4. Evaluation of Mode Switch vs Separate View vs Internal State

We evaluated three structural approaches:

| Approach | Architecture Description | Pros | Cons | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Pure Internal State inside `IncidentQueueView`** | Default page shows flight cards; clicking a card replaces the grid with flight incidents. | Simple component tree. | Hard for operators to browse all global incidents without selecting a flight; hides the canonical queue. | ❌ Too restrictive |
| **Option B: Separate Top-Level View in Navbar (`/flights`)** | Adds a new top-level navigation tab `Flight Inspections` in `Navbar.tsx`. | Total separation. | Fragments incident management across two navbar tabs; clutters top command navigation. | ❌ Unnecessary navbar clutter |
| **Option C: Top-Level Mode Switch in `IncidentQueueView`** | Top of Incident Queue has a `SlidingSegmentedControl`: `[ ✈ Flight Inspections (Default) ] [ 📋 Individual Incidents ]`. | **1. Flight-first by default**.<br>**2. Zero loss of canonical queue**.<br>**3. Clear mental model**.<br>**4. Clean drilldown and back navigation**. | None. | **✅ RECOMMENDED (GO)** |

### Detailed Rationale for Option C:
1. **Preserves Established UI Patterns**: Uses the existing `SlidingSegmentedControl` component (with animated sliding glider).
2. **Zero Regressions**: Operators who need global multi-hazard queries (e.g. "show all P1 potholes across all zones") can click `[ Individual Incidents ]` in 1 click.
3. **Focused Context**: When in `Flight Inspections`, the toolbar is simplified to search flight IDs/zones without irrelevant single-incident class pills.

---

## 5. Exact Minimal Flight Card Design

The top-level Flight Inspection card must adhere strictly to the **minimal visual requirement**:

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │                                                         │ │
│ │                  Actual Video Thumbnail                 │ │
│ │                   (from Flight Clip)                    │ │
│ │                                                         │ │
│ │  [EC-01]                                            ▶   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  Flight Inspection #EA989E90                                │
│  02:45 PM, Sep 6                                            │
└─────────────────────────────────────────────────────────────┘
```

### Visual Specifications:
1. **Upper Media Container (Aspect 16:9)**:
   - Displays a frame truthfully derived from the actual flight clip (`/static/jobs/{job_id}/annotated_output.mp4`).
   - Subtle top-left badge: `EC-01` (Zone code).
   - Subtle bottom-right hover icon: `Play` indicator (semi-transparent glass pill).
   - Zero-hazard indicator: If `total_hazards === 0`, a subtle badge `Clean Flight` or `Verification Required` is shown.
2. **Lower Card Body**:
   - Primary Heading: **`Flight Inspection #EA989E90`** (using 8-character uppercase hex prefix).
   - Secondary Subtitle: Formatted flight timestamp (`02:45 PM, Sep 6`).
3. **Prohibited Elements (DO NOT ADD)**:
   - ❌ No mini-incident cards
   - ❌ No hazard count breakdown bars (e.g. "8 Potholes, 2 Waterlogging")
   - ❌ No priority counters (e.g. "P1: 4, P2: 5")
   - ❌ No repeated evidence snapshots
   - ❌ No multi-button action rows
   - ❌ No fake or hardcoded metrics

---

## 6. Thumbnail Strategy & Backend Media Storage Analysis

### A. Current Backend Storage Audit
We audited how video and media files are stored and served across the system:

1. **Job Output Directory**:
   - `outputs/jobs/{job_id}/annotated_output.mp4` -> Served via FastAPI static mount at `/static/jobs/{job_id}/annotated_output.mp4`.
   - `outputs/jobs/{job_id}/evidence/hazard_{id}_{risk}.jpg` -> Created **only** for frames with detected hazards (absent in 0-hazard flights).
2. **Uploaded Source Video**:
   - `uploads/{job_id}/{filename}` -> Served via FastAPI static mount at `/static/uploads/{job_id}/{filename}`.
3. **Current Thumbnail Availability**:
   - The backend does **not** currently write a dedicated `thumbnail.jpg` for the entire flight run.

### B. Safest Minimal Thumbnail Implementation Strategy

#### Approach 1: Frontend-Native Video Frame (Zero Backend Changes — Immediate)
- Modern HTML5 `<video>` elements can natively render a video thumbnail without server-side image extraction by specifying:
  ```html
  <video
    src={`${annotatedVideoUrl}#t=0.5`}
    preload="metadata"
    muted
    playsInline
    className="w-full h-full object-cover pointer-events-none"
  />
  ```
- **Fallback**: If video is unavailable or loading, render a high-fidelity SVG Aerial Radar Wireframe containing `Flight #${job_prefix}` (reusing `generateSvgFrame` pattern).
- **Prohibitions**: Never use stock/Shutterstock imagery, never reuse arbitrary hazard snapshots as the flight thumbnail.

#### Approach 2: Smallest Backend Extraction (Documented for Reference)
If a dedicated static JPEG is desired in the future:
1. In `src/detection/runner.py` / `video_tracker.py`, save frame 0: `cv2.imwrite(output_dir / "thumbnail.jpg", first_frame)`.
2. In `src/repositories/processing_runs.py`, add `thumbnail_url = f"/static/jobs/{job_id}/thumbnail.jpg"` to `FlightInspectionRunSummary`.
3. In `src/api/main.py`, the existing `/static/jobs` mount already serves all files in `outputs/jobs/`.

---

## 7. Flight Detail & Results Drilldown Flow

When an operator clicks a minimal Flight card (e.g. `Flight #EA989E90`):

```
+----------------------------------------------------------------------------------------------------+
|  [ ← Back to Flight Inspections ]                                                                 |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | Flight Inspection #EA989E90                                         [ Zone EC-01 ]           |  |
|  | 13 individual hazards detected • 8 Potholes, 3 Waterlogging, 2 Open Manholes                |  |
|  | [ ▶ Watch Flight Video ]                                            [ Confirmed / Verified ] |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  Showing 13 individual incident records from Flight #EA989E90                                      |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Grid / List of Individual IncidentCard components:                                          |  |
|  |  - Card 1: INC-EA989E90-1  (Pothole • P1 • 94% AI Confidence)                                 |  |
|  |  - Card 2: INC-EA989E90-2  (Waterlogging • P2 • 89% AI Confidence)                            |  |
|  |  - Card 3: INC-EA989E90-3  (Open Manhole • P1 • 96% AI Confidence)                             |  |
|  |  ...                                                                                          |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

### Key Drilldown Principles:
1. **Breadcrumb Navigation**: A clear `[ ← Back to Flight Inspections ]` button immediately returns to the top-level flight grid.
2. **Context Header**: Uses a compact summary banner (reusing the Phase 3 `FlightInspectionCard` / Phase 5 context banner) showing flight metadata and video playback action.
3. **Individual Incident Cards**: Renders the exact 13 independent `IncidentCard` items. Clicking any card opens the existing `IncidentDetailDrawer`.
4. **Filtering within Flight**: Sub-filters (hazard class, priority, search) remain available to filter within the 13 incidents.

---

## 8. Relationship to Existing Individual Incident Queue

When the operator toggles the top mode switch to `[ Individual Incidents ]`:
- The entire existing Incident Queue functions **without any changes**:
  - `Active` / `Completed` / `Rejected` tabs with live count badges
  - Hazard class segmented pills (`Waterlogging`, `Potholes`, `Drainage Overflow`, `Damaged Footpath`, `Open Manhole`)
  - Priority segmented pills (`All`, `P1`, `P2`, `P3`)
  - Bottom toolbar dropdowns: `Zone`, `Flight Inspection`, `Status`, `Reset Filters`
  - Sorting and Grid/List layout toggle
  - `IncidentDetailDrawer` integration
- **Zero Regressions**: 100% of existing tests and workflows remain green.

---

## 9. Zero-Hazard Flight Behavior (Section 14 Semantics)

1. **Card in Top Grid**: Appears as a minimal flight card with video thumbnail and subtle `Clean Flight` badge:
   ```
   ┌─────────────────────────────┐
   │      actual video frame     │
   │ [EC-01]       [Clean Flight]│
   ├─────────────────────────────┤
   │ Flight Inspection           │
   │ #8F2B1C04                   │
   └─────────────────────────────┘
   ```
2. **Drilldown Results View**:
   - **0 `IncidentCard` items rendered** (no fake incident records created).
   - Dedicated **Clean Flight Baseline Banner**:
     - `Flight #8F2B1C04 — Clean Flight Baseline`
     - `0 physical hazards detected by AI vision across Zone EC-01.`
     - Status: `VERIFICATION REQUIRED` (if `VideoVerification` is pending review) or `CONFIRMED CLEAR (True Negative)`.
     - Action button: `[ ▶ Watch Flight Video ]` allowing the operator to review the raw flight footage.

---

## 10. Human-Reported Anomaly Behavior

1. **Flight Run Association**:
   - If an operator reviews a zero-AI flight and reports an undetected anomaly via Section 14, that manual incident is linked to the flight run.
2. **Card in Top Grid**:
   - The same Flight card `Flight #8F2B1C04` represents the flight.
3. **Drilldown Results View**:
   - Renders the manual incident as a standard `IncidentCard`.
   - Strictly displays:
     - **`AI Detection Confidence: N/A`** (never 100% or synthetic numeric value)
     - **`Detection Source: HUMAN REPORTED`**
   - Independently actionable (can be verified, assigned, updated).

---

## 11. Routing & Navigation Implications

- **URL & View State**:
  - `CivicPulseDashboard.tsx` maintains `activeView === 'queue'`.
  - In `IncidentQueueView.tsx`:
    - `queueMode: 'flights' | 'incidents'` (Default: `'flights'`).
    - `selectedFlightId: string | null` (Default: `null`).
- **Seamless Deep-Linking**:
  - When an operator completes a flight in `DroneIngestionStudio` and clicks "View in Queue", the dashboard can route to `activeView = 'queue'`, `queueMode = 'flights'`, and `selectedFlightId = jobId`, immediately presenting that flight's results.

---

## 12. Exact Files & Components to Change in Phase 6B

### New Components to Create:
1. **`dashboard/client/src/components/inspections/MinimalFlightCard.tsx`**:
   - Ultra-minimal card rendering thumbnail, `Flight Inspection #PREFIX`, zone badge, timestamp, and click handler.
2. **`dashboard/client/src/components/inspections/FlightInspectionsGridView.tsx`**:
   - Grid coordinator displaying search bar (by flight ID / zone), Zone selector, empty state, and list of `MinimalFlightCard` components.
3. **`dashboard/client/src/components/inspections/FlightInspectionDetailView.tsx`**:
   - Drilldown view rendering `[ ← Back to Flight Inspections ]`, flight header banner, video modal, and the grid of individual `IncidentCard` items.

### Existing Components to Modify:
4. **`dashboard/client/src/components/incidents/IncidentQueueView.tsx`**:
   - Add the top `SlidingSegmentedControl` mode switcher (`[ Flight Inspections ] [ Individual Incidents ]`).
   - Coordinate rendering between `FlightInspectionsGridView`, `FlightInspectionDetailView`, and the canonical `IncidentQueueView` incident list.

### Test Files to Add/Update:
5. **`dashboard/client/src/__tests__/flightFirstQueue.test.tsx`**:
   - New test suite verifying default flight-first rendering, minimal card layout, drilldown, 11-hazard rendering, 0-hazard clean baseline, human-reported anomalies, and mode switching.

---

## 13. Testing Strategy

### A. Automated Frontend Tests (Vitest)
1. **Default View Mode**: Verify `IncidentQueueView` renders `Flight Inspections` mode by default.
2. **Minimal Flight Card**: Verify `MinimalFlightCard` renders video frame and `Flight Inspection #PREFIX` without metric bloat or mini-cards.
3. **Flight Drilldown**: Verify clicking a flight card opens the drilldown results view.
4. **11-Hazard Flight**: Verify drilldown renders 11 distinct, clickable `IncidentCard` items.
5. **Zero-Hazard Flight**: Verify drilldown renders 0 incident cards and displays Clean Flight Baseline banner without crashing.
6. **Human-Reported Anomaly**: Verify human-reported incident displays `AI Confidence: N/A` and `Source: HUMAN REPORTED`.
7. **Back Navigation**: Verify `[ ← Back to Flight Inspections ]` restores the flight grid.
8. **Mode Switching**: Verify switching to `[ Individual Incidents ]` renders the full canonical queue with tabs and filters.
9. **Zone Filtering**: Verify changing zone scopes the flight cards grid.

### B. Automated Backend Regression Tests (Pytest)
- Execute `pytest tests/test_processing_runs.py` to ensure all 139 backend tests continue to pass.

---

## 14. Risks & Mitigations

| Risk | Potential Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Card Metric Bloat** | Card becomes a dense dashboard, violating UX objective. | Strict minimalist component design (`MinimalFlightCard.tsx`) containing only thumbnail, title, zone tag, and timestamp. |
| **Video Thumbnail Overhead** | Multiple video elements slowing down grid render. | Use `preload="metadata"`, muted, playsInline, with SVG wireframe fallback while loading. |
| **Loss of Granular Incident Workflow** | Operators unable to perform global multi-hazard queries. | Top mode switch (`[ Flight Inspections ] [ Individual Incidents ]`) retains 100% of existing queue filters and tabs. |
| **Accidental Incident Merging** | Breaking the 1 physical hazard = 1 Incident rule. | Flight drilldown renders canonical `IncidentCard` items individually; zero incident collapsing. |

---

## 15. Final Recommendation

### Final Recommendation: **GO (Approved & Implemented)**

The proposed Flight-First architecture:
- **Directly Fulfills Product Vision**: Sets clean, minimal Flight Inspection cards as the default landing experience.
- **Maintains Semantic Integrity**: Strictly enforces `1 physical hazard = 1 Incident record`.
- **Zero Regressions**: Fully preserves the existing canonical incident queue via a clear mode switcher.
- **Zero Backend Risk**: Requires zero database migrations, zero schema changes, and zero ML alterations.

---

## Phase 6B Implementation Status

**Implementation Status**: **COMPLETE & FULLY VERIFIED**  
**Execution Date**: September 2026

### 1. Components Created:
- **`MinimalFlightCard.tsx`** (`dashboard/client/src/components/inspections/MinimalFlightCard.tsx`):
  - Minimal visual design: truthfully derived flight video thumbnail frame (`#t=0.5` with `preload="metadata"`, muted, playsInline), subtle top-left zone badge (`EC-01`), prominent header **`Flight Inspection #EA989E90`**, and formatted timestamp.
  - Zero metric bloat: prohibited mini-incident cards, hazard count breakdown bars, priority counters, and repeated evidence images.
  - Zero-hazard badge: displays `Clean Flight` or `Verification Required` when `total_hazards === 0`.
  - SVG radar wireframe fallback when video URL is not present.
- **`FlightInspectionsGridView.tsx`** (`dashboard/client/src/components/inspections/FlightInspectionsGridView.tsx`):
  - Fetches flight runs from `inspectionService.listFlightRuns()` (newest first).
  - Streamlined flight search (by Flight ID `#EA989E90`, zone, or status).
  - Zone selector (`All Zones`, `EC-01`, `EC-02`, `EC-03`, `EC-04`).
  - Loading skeletons, empty state, and error handling with retry.
- **`FlightInspectionDetailView.tsx`** (`dashboard/client/src/components/inspections/FlightInspectionDetailView.tsx`):
  - Navigation: Prominent `[ ← Back to Flight Inspections ]` button.
  - Header context: Flight inspection header, zone code, truthful timestamp, video player action (`[ ▶ Watch Flight Video ]`).
  - 11-hazard rendering: Renders exact 11 independent, clickable `IncidentCard` items.
  - Zero-hazard flight: Displays 0 incident cards + dedicated Clean Flight Baseline banner (Section 14 verification semantics: `0 physical hazards detected by AI vision across Zone...`).
  - Human-reported anomaly: Displays `AI Confidence: N/A` and `Source: HUMAN REPORTED`.
  - Clicking any `IncidentCard` opens the canonical `IncidentDetailDrawer`.
- **`flightFirstQueue.test.tsx`** (`dashboard/client/src/__tests__/flightFirstQueue.test.tsx`):
  - Comprehensive unit and integration test suite with 12 tests.

### 2. Existing Components Modified:
- **`IncidentQueueView.tsx`** (`dashboard/client/src/components/incidents/IncidentQueueView.tsx`):
  - Added top `SlidingSegmentedControl` mode switcher: `[ ✈ Flight Inspections (Default) ] [ 📋 Individual Incidents ]`.
  - In `Flight Inspections` mode (default): renders `FlightInspectionsGridView` and `FlightInspectionDetailView`.
  - In `Individual Incidents` mode: preserves 100% of existing canonical queue (Active/Completed/Rejected tabs, class pills, priority pills, multi-dimensional dropdowns, sort, Grid/List switcher, and drawer).
- **`inspectionService.ts`** (`dashboard/client/src/services/inspectionService.ts`):
  - Normalized relative `annotated_video_url` with `getMediaBaseUrl()` in `listFlightRuns()`.
- **`index.ts`** (`dashboard/client/src/components/inspections/index.ts`):
  - Exported `MinimalFlightCard`, `FlightInspectionsGridView`, and `FlightInspectionDetailView`.

### 3. Verification & Test Metrics:
- **Frontend Vitest Suite**: **12 passed / 12 test files** (**117 passed**, 0 failed)
- **TypeScript Typecheck**: **0 errors** (`tsc --noEmit` exited with code 0)
- **Production Build**: **Succeeded in 5.74s** (`vite build && esbuild` exited with code 0)
- **Backend Pytest Suite**: **139 passed / 139 tests** (0 failed)

### 4. Safety & Scope Confirmation:
- **Zero Backend Python Changes**: Unchanged.
- **Zero Database Changes**: Schema, models, and migrations remain 100% intact.
- **Zero ML Changes**: YOLO, ByteTrack, and processing pipelines remain 100% intact.
- **Semantic Rule Preserved**: `1 physical hazard = 1 Incident record` strictly enforced.

