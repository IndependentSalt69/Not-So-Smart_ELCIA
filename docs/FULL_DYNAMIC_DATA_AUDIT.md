# CivicPulse — Full Static, Hardcoded, and Dynamic Data Audit

> **AUDIT CLASSIFICATION**: Comprehensive Repository-Wide Static, Hardcoded, Fallback, Mock, and Dynamic Data Analysis  
> **AUDIT DATE**: September 2026  
> **TARGET DIRECTORY**: `d:\Not-So-Smart_ELCIA`  
> **AUDIT SCOPE**: `dashboard/client/src/`, `dashboard/server/`, `src/`, `scripts/`, `configs/`, `tests/`  
> **SOURCE CODE MUTATION STATUS**: **0 SOURCE CODE FILES MODIFIED (AUDIT ONLY)**  

---

## 1. Executive Summary

A comprehensive repository-wide audit was conducted across the CivicPulse full-stack platform (FastAPI backend, PostgreSQL/PostGIS persistence, YOLOv8/DPT ML pipeline, and React 19/Vite dashboard) to classify every piece of data, numeric literal, metric, confidence score, severity rating, coordinate, chart series, and evidence artifact.

### Key Audit Findings

1. **AI Detection & Telemetry Ingestion (Confidence Audit)**:
   - The YOLOv8 segmentation model (`YOLOSegmentor` in [`src/detection/yolo_segmentation.py:107`](file:///d:/Not-So-Smart_ELCIA/src/detection/yolo_segmentation.py#L107)) computes **real dynamic confidence scores** (e.g. `0.8742`).
   - However, the video pipeline logger ([`src/detection/video_tracker.py:248-262`](file:///d:/Not-So-Smart_ELCIA/src/detection/video_tracker.py#L248-L262)) **omits `"confidence"`** when constructing `hazard_telemetry.json`.
   - Consequently, the backend ingestion service ([`src/services/ml_ingestion_service.py:179`](file:///d:/Not-So-Smart_ELCIA/src/services/ml_ingestion_service.py#L179)) executes `float(item.get("confidence", 0.95))`, causing **every ingested incident in PostgreSQL to inherit the hardcoded fallback confidence of 0.95 (95%)**.

2. **Severity Scoring & Priority Classification (Severity Audit)**:
   - In the video pipeline, severity is calculated dynamically by `SeverityAnalyzer` ([`src/detection/severity_analyzer.py:32`](file:///d:/Not-So-Smart_ELCIA/src/detection/severity_analyzer.py#L32)) using mask pixel area percentage and DPT relative depth drop (`(area_pct * 2) + (depth * 50)` on a 0–100 scale), normalized to 0.0–10.0 upon ingestion ([`src/services/ml_ingestion_service.py:44-51`](file:///d:/Not-So-Smart_ELCIA/src/services/ml_ingestion_service.py#L44-L51)).
   - In the frontend mock/simulation service ([`inferenceService.ts:357`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/inferenceService.ts#L357)), open manhole hazards are hardcoded to `severity: 9.5` and `confidence: 0.97`.
   - In the frontend incident adapter ([`incidentService.ts:231-247`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/incidentService.ts#L231-L247)), detailed breakdown vectors (water extent, road obstruction, criticality, explanation) are **synthesized on the client** from the scalar `severity_score` because the database only stores the overall score.

3. **KPIs and Analytics (KPI & Chart Audit)**:
   - Operational KPIs (`totalActiveIncidents`, `criticalP1Count`, `highP2Count`, `routineP3Count`, `pendingVerificationCount`, `potholeClustersCount`) and 7-day trend series are **100% live SQL aggregations** executed on PostgreSQL via [`src/repositories/analytics.py`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py).
   - **`1.4 Hours`** and **`38% vs. manual inspection`** rendered in the hero operational banner ([`OverviewTab.tsx:68-71`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/OverviewTab.tsx#L68-L71)) are **100% hardcoded static display strings** embedded in JSX with zero dynamic or database connection.

4. **Evidence Images & Synthetic Road SVGs (Evidence Audit)**:
   - Real ML capture JPGs are physically generated and verified on disk in `outputs/evidence/` and `outputs/jobs/<job_id>/evidence/`.
   - FastAPI correctly mounts `/static/jobs` and `/static/evidence` in [`src/api/main.py:83-97`](file:///d:/Not-So-Smart_ELCIA/src/api/main.py#L83-L97).
   - Synthetic SVG road perspectives appear whenever:
     1. The UI is in mock mode (`mockIncidents.ts` fixtures use inline SVG data URIs via `generateSvgFrame()`),
     2. Incidents were seeded with fictitious demo filenames (`outputs/evidence/demo_waterlogging_ec01.jpg` in [`scripts/seed_database.py:176`](file:///d:/Not-So-Smart_ELCIA/scripts/seed_database.py#L176)) which 404 and trigger the SVG error fallback, or
     3. Incidents were created directly through the API without an attached evidence record.

---

## 2. Exact Scope Scanned

| Directory / Subsystem | Files Scanned | Lines of Code Inspected | Focus Areas |
|---|---|---|---|
| `dashboard/client/src/` | 42 files | ~12,500 LOC | UI components, cards, charts, services, data fixtures, hooks, state machine |
| `dashboard/server/` | 1 file | 35 LOC | Express proxy server |
| `src/api/` | 7 files | ~1,200 LOC | FastAPI routes, dependencies, schemas, static file mounts, CORS |
| `src/core/` | 4 files | ~800 LOC | Application config, hazard classes, spatial GeoJSON conversions |
| `src/db/` | 12 files | ~1,500 LOC | SQLAlchemy 2.0 models, PostGIS geometry types, enums |
| `src/detection/` | 6 files | ~2,100 LOC | YOLOv8 tracking, DPT depth estimation, video tracker, severity analyzer |
| `src/repositories/` | 10 files | ~2,400 LOC | Database queries, analytics aggregations, CRUD operations |
| `src/services/` | 3 files | ~1,100 LOC | ML ingestion service, job manager, background runners |
| `src/severity/` | 2 files | ~150 LOC | Scoring engine, priority mapping |
| `scripts/` | 9 files | ~3,200 LOC | Database seeding, GPS telemetry parsing, video pipeline runners |
| `configs/` | 2 files | ~70 LOC | YAML hazard classes, ByteTrack tracker parameters |
| `tests/` | 18 files | ~4,800 LOC | Unit, repository, integration, and E2E lifecycle test suites |

---

## 3. Dynamic-Data Inventory (Genuinely Live)

The following data items are genuine, dynamic values originating from real calculations, runtime inputs, or live database queries:

| Data Field / Metric | Source Origin | Transport & Transformation | Rendered Component |
|---|---|---|---|
| **Incident List & Details** | PostgreSQL `incidents` table | `GET /api/v1/incidents/` → `incidentService.getIncidents()` | [`IncidentQueueView.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentQueueView.tsx), [`IncidentCard.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx) |
| **Active Incidents Count** | SQL: `count(case(status not in ('CLOSED', 'REJECTED')))` | `GET /api/v1/analytics/summary` → `analyticsService.getAnalyticsSummary()` | [`KpiSummaryGrid.tsx:15`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/KpiSummaryGrid.tsx#L15), [`AnalyticsDashboard.tsx:218`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L218) |
| **Urgency Counts (P1, P2, P3)** | SQL: `count(case(priority == 'P1'))` etc. | `GET /api/v1/analytics/summary` → `kpis.criticalP1Count`, `kpis.highP2Count`, `kpis.routineP3Count` | [`KpiSummaryGrid.tsx:27`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/KpiSummaryGrid.tsx#L27), [`AnalyticsDashboard.tsx:207`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L207) |
| **7-Day Trend Chart Series** | SQL: Daily count grouping by `date(created_at)` across 5 classes | `GET /api/v1/analytics/trends?days=7` → `analyticsService.getAnalyticsTrends()` | [`AnalyticsDashboard.tsx:254-290`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L254-L290) |
| **Zone Urgency Breakdown** | SQL: Outer join `zones` ↔ `incidents` grouped by `zone_id` | `GET /api/v1/analytics/zones` → `analyticsService.getAnalyticsZones()` | [`AnalyticsDashboard.tsx:358-368`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L358-L368) |
| **Lifecycle Status Distribution** | SQL: `group_by(Incident.status)` | `GET /api/v1/analytics/summary` → `statusDistribution` | [`AnalyticsDashboard.tsx:395-422`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L395-L422) |
| **Queue Tab Counters** | SQL: Aggregated from `status_distribution` | `incidentService.getQueueTabCounts()` | [`IncidentQueueView.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentQueueView.tsx) (Active, Completed, Rejected tabs) |
| **YOLO Bounding Boxes / Polygons** | Ultralytics YOLOv8 Tensor Inference | `YOLOSegmentor.track_frame()` in [`src/detection/yolo_segmentation.py`](file:///d:/Not-So-Smart_ELCIA/src/detection/yolo_segmentation.py) | Annotated video output (`annotated_output.mp4`) & evidence crops |
| **Relative Depth Drop** | Intel DPT-Large / MiDaS disparity map | `DepthEstimator.estimate_depth()` in [`src/detection/depth_estimator.py`](file:///d:/Not-So-Smart_ELCIA/src/detection/depth_estimator.py) | Saved in `Detection.detection_metadata` & logged in telemetry |
| **Drone GPS Extraction** | DJI SRT Subtitle Parser regex | `parse_dji_srt()` in [`scripts/gps_parser.py`](file:///d:/Not-So-Smart_ELCIA/scripts/gps_parser.py) | Saved in `Incident.location` (PostGIS `Geometry(Point, 4326)`) |
| **Real Evidence Media Asset** | OpenCV frame snapshot write | `GET /static/jobs/<job_id>/evidence/<file>` | [`IncidentCard.tsx:98-104`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L98-L104), [`EvidenceViewer.tsx:257`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/detail/EvidenceViewer.tsx#L257) |
| **Dispatch / User Assignment** | PostgreSQL `assignments` & `users` tables | `GET/POST /api/v1/incidents/{id}/assignments` | [`AssignmentSection.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/detail/AssignmentSection.tsx) |
| **Field Inspection Log** | PostgreSQL `inspections` table | `GET/POST /api/v1/incidents/{id}/inspections` | [`InspectionSection.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/detail/InspectionSection.tsx) |
| **Incident Status Transitions** | Database `incident_status_history` table | `PATCH /api/v1/incidents/{id}/status` | [`VerificationBar.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/detail/VerificationBar.tsx), [`IncidentStepper.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/detail/IncidentStepper.tsx) |
| **Live Notifications** | Triggered on status transition to `VERIFIED` | `notificationService.addVerifiedNotification()` | [`NotificationCenter.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/notifications/NotificationCenter.tsx) |
| **Map Dynamic FitBounds** | Computed from coordinates of visible incidents | `MapCameraController` in [`IncidentMapView.tsx:184-213`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/map/IncidentMapView.tsx#L184-L213) | Google Maps viewport camera |

---

## 4. Hardcoded-Data Inventory (Static / Fake Values in Code)

The following table details every suspicious hardcoded value that bypasses dynamic data sources:

| File Path | Line(s) | Hardcoded Value | Reason It Is Static | What Should Supply It Instead | Classification |
|---|---|---|---|---|---|
| [`dashboard/client/src/components/overview/OverviewTab.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/OverviewTab.tsx#L68) | 68 | `"1.4 Hours"` | Static text string inside Dispatch Readiness Card | `kpis.meanTimeToResolutionHours` from `GET /api/v1/analytics/summary` | **P0 — Hardcoded Metric** |
| [`dashboard/client/src/components/overview/OverviewTab.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/OverviewTab.tsx#L71) | 71 | `"38% vs. manual inspection"` | Static text string inside Dispatch Readiness Card | Benchmark calculation or configurable KPI | **P0 — Hardcoded Metric** |
| [`src/detection/video_tracker.py`](file:///d:/Not-So-Smart_ELCIA/src/detection/video_tracker.py#L248-L262) | 248–262 | `log_entry` omits `"confidence"` | Developer overlooked adding `"confidence": det["confidence"]` to telemetry record dictionary | Include `det["confidence"]` from `YOLOSegmentor` | **P0 — Data Pipeline Gap** |
| [`src/services/ml_ingestion_service.py`](file:///d:/Not-So-Smart_ELCIA/src/services/ml_ingestion_service.py#L179) | 179, 195 | `item.get("confidence", 0.95)` | Hardcoded fallback for missing telemetry field | Real YOLO detection confidence from `hazard_telemetry.json` | **P0 — Credibility Bug** |
| [`dashboard/client/src/services/incidentService.ts`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/incidentService.ts#L223) | 223 | `zoneId: 'EC-01'` | Hardcoded fallback string in backend-to-frontend mapper | Map `item.zone_id` to actual zone code using `GET /api/v1/zones/` | **P1 — Functional Bug** |
| [`dashboard/client/src/services/inferenceService.ts`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/inferenceService.ts#L356-L358) | 356–358 | `isWater ? 0.95 : isManhole ? 0.97 : ...`, `isManhole ? 9.5 : ...` | Simulated client-side inference generator for demo mode | Replace with live backend job submission via `processingService.submitProcessingJob` | **P1 — Demo Simulator** |
| [`dashboard/client/src/services/inferenceService.ts`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/inferenceService.ts#L398) | 398 | `persistenceSeconds: isWater ? 180 : isManhole ? 300 : ...` | Simulated client-side persistence duration | Live video frame track duration from ML tracker | **P2 — Simulated Metric** |
| [`dashboard/client/src/services/processingService.ts`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/processingService.ts#L45-L67) | 45–67 | Mock zone bounding boxes: `EC-01` (`77.658-77.668, 12.840-12.855`) | Client-side fallback GPS parser when backend `/api/v1/zones/detect` is offline | Backend PostGIS ST_Contains query on `zones.geometry` | **P2 — Offline Fallback** |
| [`dashboard/client/src/components/overview/MiniMapWidget.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/MiniMapWidget.tsx#L146) | 146 | `"For development purposes only"` | Static badge overlaid on Google Maps preview | Configure production Map ID or billing token | **P3 — Cosmetic** |
| [`scripts/seed_database.py`](file:///d:/Not-So-Smart_ELCIA/scripts/seed_database.py#L176) | 176, 250, 298 | `"outputs/evidence/demo_waterlogging_ec01.jpg"` | Seed script points to non-existent filenames on disk | Copy real baseline sample frames or generate valid files during seed | **P1 — Broken Image Links** |

---

## 5. Mock-Data Inventory

| Mock Asset / Fixture | Location | Items / Records | Status / Recommendation |
|---|---|---|---|
| **`INITIAL_MOCK_INCIDENTS`** | [`dashboard/client/src/data/mockIncidents.ts:73-706`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/data/mockIncidents.ts#L73-L706) | 13 incidents (`EC-0142` to `EC-0185`) with synthetic SVGs and simulated histories | **KEEP AS FALLBACK** (active only when `VITE_USE_MOCK_DATA=true`) |
| **`generateSvgFrame()`** | [`dashboard/client/src/data/mockIncidents.ts:4-71`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/data/mockIncidents.ts#L4-L71) | Procedural SVG generator for road perspective, HUD text, bounding boxes | **KEEP AS FALLBACK** (graceful visual degradation on network failure) |
| **`SAMPLE_PRESETS`** | [`dashboard/client/src/services/inferenceService.ts:87-310`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/inferenceService.ts#L87-L310) | 6 preset scenarios (waterlogging, pothole, drainage, footpath, manhole, clear) | **INTENTIONAL DEMO MODE** (allows quick jury walkthrough without uploading 500MB video) |
| **`generateInferenceOverlaySvg()`** | [`dashboard/client/src/services/inferenceService.ts:6-85`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/inferenceService.ts#L6-L85) | SVG overlay generator for simulated inference | **INTENTIONAL DEMO MODE** |
| **`scripts/seed_database.py` Fixtures** | [`scripts/seed_database.py:57-350`](file:///d:/Not-So-Smart_ELCIA/scripts/seed_database.py#L57-L350) | 4 zones (`EC-01` to `EC-04`), 3 users, 3 demo incidents (`INC-DEMO-001` to `003`) | **KEEP FOR DEVELOPMENT** (idempotent DB seeding) |
| **`parseSrtFallback()` Bounding Boxes** | [`dashboard/client/src/services/processingService.ts:7-122`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/processingService.ts#L7-L122) | Approximate rectangular GPS bounding boxes for 4 zones | **KEEP AS FALLBACK** (client-side offline parsing) |

---

## 6. Fallback Inventory

| Subsystem | Primary Live Source | Fallback Trigger Condition | Fallback Action / Value |
|---|---|---|---|
| **Incident Confidence** | `det["confidence"]` from YOLO | Field missing in `hazard_telemetry.json` | `confidence = 0.95` in [`ml_ingestion_service.py:179`](file:///d:/Not-So-Smart_ELCIA/src/services/ml_ingestion_service.py#L179) |
| **Incident Duration / Persistence** | `duration_seconds` from DB | `duration_seconds` is null or 0 | `durationSeconds = 180` in [`incidentService.ts:198`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/incidentService.ts#L198) |
| **Incident Coordinates** | `location.coordinates` from PostGIS | Point geometry null or empty | `lat = 12.8452, lng = 77.6631` (Hosur Road junction) in [`incidentService.ts:194-195`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/incidentService.ts#L194-L195) |
| **Incident Zone ID** | `zone_id` from DB | Always in mapper | `zoneId = 'EC-01'` in [`incidentService.ts:223`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/incidentService.ts#L223) |
| **Evidence Thumbnail** | Physical JPG file at `/static/jobs/...` | File 404, network error, or missing evidence record | Synthetic SVG data URI generated by `generateSvgFrame()` in [`IncidentCard.tsx:75`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L75) |
| **Waterlogged Area KPI** | Computer vision polygon area sum | DB returns `waterlogged_area_sqm = None` | Frontend displays `"N/A"` in [`AnalyticsDashboard.tsx:157`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L157) & [`KpiSummaryGrid.tsx:68`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/KpiSummaryGrid.tsx#L68) |
| **Mean Time to Resolution** | SQL `avg(duration_seconds) / 3600.0` | No resolved incidents in DB | Frontend displays `"N/A"` in [`AnalyticsDashboard.tsx:162`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L162) |
| **Google Maps Center** | Centroid of visible incidents | 0 valid coordinates in queue | `DEFAULT_FALLBACK_CENTER = { lat: 12.8450, lng: 77.6650 }` in [`IncidentMapView.tsx:137`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/map/IncidentMapView.tsx#L137) |
| **SRT Zone Detection** | Backend `/api/v1/zones/detect` API | API offline or unreachable | Client-side `parseSrtFallback()` in [`processingService.ts:148`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/processingService.ts#L148) |
| **Incident List API** | `GET /api/v1/incidents/` | Backend API failure / network error | Local state array `incidentsState` (or `INITIAL_MOCK_INCIDENTS` if mock mode enabled) |

---

## 7. KPI Audit

| KPI Metric | UI Component | Source Type | Database Query / Source Code Location | Status & Correctness |
|---|---|---|---|---|
| **Total Active Incidents** | [`KpiSummaryGrid.tsx:15`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/KpiSummaryGrid.tsx#L15), [`AnalyticsDashboard.tsx:218`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L218) | **LIVE DB** | `select(func.count(case((status.notin_([CLOSED, REJECTED]), 1))))` in [`src/repositories/analytics.py:32`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L32) | **100% Genuinely Dynamic** |
| **Critical P1 Count** | [`KpiSummaryGrid.tsx:27`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/KpiSummaryGrid.tsx#L27), [`AnalyticsDashboard.tsx:207`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L207) | **LIVE DB** | `select(func.count(case((priority == 'P1', 1))))` in [`src/repositories/analytics.py:33`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L33) | **100% Genuinely Dynamic** |
| **High P2 Count** | [`KpiSummaryGrid.tsx:41`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/KpiSummaryGrid.tsx#L41) | **LIVE DB** | `select(func.count(case((priority == 'P2', 1))))` in [`src/repositories/analytics.py:34`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L34) | **100% Genuinely Dynamic** |
| **Routine P3 Count** | [`KpiSummaryGrid.tsx:53`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/KpiSummaryGrid.tsx#L53) | **LIVE DB** | `select(func.count(case((priority == 'P3', 1))))` in [`src/repositories/analytics.py:35`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L35) | **100% Genuinely Dynamic** |
| **Pending Verification Count** | [`KpiSummaryGrid.tsx:80`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/KpiSummaryGrid.tsx#L80) | **LIVE DB** | `select(func.count(case((status == 'DETECTED', 1))))` in [`src/repositories/analytics.py:37`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L37) | **100% Genuinely Dynamic** |
| **Pothole Clusters Count** | [`analyticsService.ts:73`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/analyticsService.ts#L73) | **LIVE DB** | `select(func.count(case((incident_type == 'POTHOLE', 1))))` in [`src/repositories/analytics.py:36`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L36) | **100% Genuinely Dynamic** |
| **Waterlogged Surface Area** | [`KpiSummaryGrid.tsx:67`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/KpiSummaryGrid.tsx#L67), [`AnalyticsDashboard.tsx:185`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L185) | **UNAVAILABLE / FALLBACK** | Backend returns `waterlogged_area_sqm = None` in [`src/repositories/analytics.py:58`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L58) | **Renders "N/A" (Gracefully Handled)** |
| **Mean Time to Resolution** | [`AnalyticsDashboard.tsx:196`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L196) | **DERIVED DB** | `round(avg(duration_seconds) / 3600.0, 2)` in [`src/repositories/analytics.py:51`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L51) | **Dynamic when records exist, "N/A" when empty** |
| **Mean Resolution Velocity** | [`OverviewTab.tsx:68`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/OverviewTab.tsx#L68) | **HARDCODED DISPLAY** | Static JSX string: `"1.4 Hours"` in [`OverviewTab.tsx:68`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/OverviewTab.tsx#L68) | **FAKE / HARDCODED — MUST FIX** |
| **Inspection Speed Comparison** | [`OverviewTab.tsx:71`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/OverviewTab.tsx#L71) | **HARDCODED DISPLAY** | Static JSX string: `"38% vs. manual inspection"` in [`OverviewTab.tsx:71`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/OverviewTab.tsx#L71) | **FAKE / HARDCODED — MUST FIX** |

---

## 8. Confidence Audit

### Complete Data Flow Trace

```
1. Video Frame Inference:
   YOLOv8 produces detection boxes with real confidence scores:
   `conf = float(box.conf[0].item())` (e.g. 0.8742)
   --> File: src/detection/yolo_segmentation.py (line 68, 107)

2. Video Tracker Output:
   `video_tracker.py` loops over detections and constructs `log_entry`
   --> [CRITICAL GAP]: `log_entry` DOES NOT INCLUDE "confidence": det["confidence"]
   --> File: src/detection/video_tracker.py (lines 248-262)

3. Telemetry JSON File:
   `outputs/jobs/<job_id>/hazard_telemetry.json` is written WITHOUT a "confidence" key.
   --> Verified on disk: outputs/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/hazard_telemetry.json

4. Database Ingestion Service:
   `ml_ingestion_service.py` executes:
   `confidence = float(item.get("confidence", 0.95))`
   Because the key is absent, it defaults to 0.95.
   --> File: src/services/ml_ingestion_service.py (line 179)

5. PostgreSQL Database:
   Row saved into `incidents` table with `confidence = 0.95`.
   Row saved into `detections` table with `confidence = 0.95`.

6. REST API Response:
   `GET /api/v1/incidents/` returns JSON item with `"confidence": 0.95`.

7. Frontend Service & Mapper:
   `incidentService.ts` maps `confidence: item.confidence` (0.95).
   --> File: dashboard/client/src/services/incidentService.ts (line 218)

8. Frontend Component Render:
   `IncidentCard.tsx` executes:
   `const confidencePct = Math.round(incident.confidence * 100);`
   --> Displays: "95% Conf"
   --> File: dashboard/client/src/components/incidents/IncidentCard.tsx (line 39, 221)
```

### Confidence Audit Questions & Direct Answers

- **A. Is the displayed confidence the actual YOLO confidence?**  
  **NO.** In the current live pipeline, the YOLO confidence is computed by the model but dropped by the tracker script before telemetry serialization, resulting in the ingestion fallback being used.
- **B. Is it transformed?**  
  Yes, converted from float (0.95) to percentage (`Math.round(0.95 * 100)` = 95%).
- **C. Is there a fallback?**  
  Yes. Fallback is `0.95` in [`src/services/ml_ingestion_service.py:179`](file:///d:/Not-So-Smart_ELCIA/src/services/ml_ingestion_service.py#L179).
- **D. Is any frontend simulation hardcoding it?**  
  Yes. [`inferenceService.ts:356`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/inferenceService.ts#L356) uses `isWater ? 0.95 : isManhole ? 0.97 : ...`.
- **E. Are mock incidents supplying it directly?**  
  Yes. [`mockIncidents.ts:77`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/data/mockIncidents.ts#L77) has `confidence: 0.94` (`EC-0142`), `0.95` (`EC-0155`), `0.96` (`EC-0148`, `EC-0170`, `EC-0185`).

---

## 9. Severity Audit

### Complete Data Flow Trace

```
1. Geometry & Depth Extraction:
   - YOLO polygon contour area -> area_pixels / frame_area * 100 -> area_percentage
   - DPT depth map -> mean depth inside polygon / 255.0 -> relative_depth (0.0 to 1.0)
   --> File: src/detection/severity_analyzer.py (lines 18-30)

2. Pipeline Severity Computation:
   `severity_score = min(100, int((area_percentage * 2) + (relative_depth * 50)))`
   `risk_level = "CRITICAL" if score > 70 else "MODERATE" if score > 40 else "LOW"`
   --> File: src/detection/severity_analyzer.py (lines 32-38)

3. Telemetry JSON Output:
   Written as integer 0–100 in `hazard_telemetry.json` (e.g. `severity_score: 27`).

4. Database Ingestion & Normalization:
   `backend_severity = normalize_severity_score(raw_score)` -> `round(raw_score / 10.0, 2)` (e.g. 2.7)
   `priority = map_priority_level(raw_score, risk_level)` (e.g. P3)
   --> File: src/services/ml_ingestion_service.py (lines 44-62, 154-156)

5. PostgreSQL Database:
   Row saved into `incidents` table with `severity_score = 2.7`, `priority = 'P3'`.

6. REST API:
   `GET /api/v1/incidents/` returns `"severity_score": 2.7`, `"priority": "P3"`.

7. Frontend Client Mapper:
   `mapBackendIncidentToFrontend(item)` receives `item.severity_score = 2.7`.
   --> Generates client-side explainability vectors:
       - waterExtent: type == 'waterlogging' ? min(10, 2.7 * 0.9) : 0
       - roadObstruction: 2.7
       - roadCriticality: min(10, 2.7 * 1.05)
   --> File: dashboard/client/src/services/incidentService.ts (lines 231-247)

8. Frontend Render:
   - `IncidentCard.tsx:249`: Displays `2.7 / 10`
   - `SeverityExplainer.tsx:81, 89-126`: Displays 4 factor progress bars and explanation list.
```

### Severity Audit Questions & Direct Answers

- **A. What is dynamically calculated?**  
  `area_percentage`, `relative_depth`, and `severity_score` (0–100) are dynamically calculated by [`src/detection/severity_analyzer.py`](file:///d:/Not-So-Smart_ELCIA/src/detection/severity_analyzer.py).
- **B. What formula/weights are fixed?**  
  `area_weight * 2` + `depth_weight * 50` in `SeverityAnalyzer`; `w_cov=0.45, w_conf=0.25, w_crit=0.30` in `SeverityEngine`.
- **C. Which factors come from real measurements?**  
  YOLO segmentation mask pixel area and DPT Monocular Depth disparity drop values.
- **D. Which values are mock/demo values?**  
  The 13 records in `mockIncidents.ts` have hardcoded severities: `8.7`, `8.2`, `8.9`, `6.8`, `6.4`, `4.2`, `3.1`, `7.6`, `7.9`, `4.8`, `9.1`, `5.2`, `9.4`.  
  `inferenceService.ts:357` has simulated severities: Water `8.8`, Pothole `8.4`, Drainage `7.6`, Footpath `6.2`, Manhole `9.5`, Clear `1.2`.
- **E. Which values are fallback/default values?**  
  If `duration_seconds` is null, mapper defaults to `180s`. If `severity_score` is 0, defaults to `0.0`.
- **F. Which UI components simply display database values?**  
  [`IncidentCard.tsx:249`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L249), [`IncidentQueueView.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentQueueView.tsx), [`IncidentDetailDrawer.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/detail/IncidentDetailDrawer.tsx).
- **G. Which UI components override them with local static values?**  
  None override the overall score, but [`SeverityExplainer.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/detail/SeverityExplainer.tsx) displays the 4 synthesized factor breakdown vectors derived by [`incidentService.ts:231-247`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/incidentService.ts#L231-L247).

---

## 10. Evidence-Media Audit

### Complete Physical-to-Browser Lifecycle Example

```
1. Physical Creation on Disk:
   During video processing of job "49559b26-9c73-4037-9f67-0fd7f711c6f3", OpenCV extracts a hazard frame:
   `evidence_filename = "hazard_1_LOW.jpg"`
   `evidence_filepath = "outputs/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/evidence/hazard_1_LOW.jpg"`
   `cv2.imwrite(str(evidence_filepath), frame)`
   --> File: src/detection/video_tracker.py (line 242)
   --> Verified on disk: 174,442 bytes JPEG image.

2. Ingestion & Global Copy:
   `ml_ingestion_service.py` ingests the job:
   - Stores relative path: `file_path = "outputs/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/evidence/hazard_1_LOW.jpg"`
   - Copies file to global directory: `outputs/evidence/49559b26_hazard_1_LOW.jpg`
   - Creates `Evidence` database record with `file_path`.
   --> File: src/services/ml_ingestion_service.py (lines 216-230)

3. Backend Static Route Mounts:
   FastAPI in `src/api/main.py` mounts:
   - `app.mount("/static/jobs", StaticFiles(directory="outputs/jobs"))`
   - `app.mount("/static/evidence", StaticFiles(directory="outputs/evidence"))`
   --> File: src/api/main.py (lines 83-97)

4. Frontend URL Construction:
   `incidentService.ts:getEvidenceMediaUrl(filePath)` maps:
   `"outputs/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/evidence/hazard_1_LOW.jpg"`
   --> `http://127.0.0.1:8000/static/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/evidence/hazard_1_LOW.jpg`
   --> File: dashboard/client/src/services/incidentService.ts (lines 22-28)

5. Frontend Preloading & Caching:
   - `incidentService.preloadPrimaryEvidence([incidentId])` queries `GET /api/v1/incidents/{id}/evidence`.
   - Caches `mediaUrl` in `primaryEvidenceCache`.
   --> File: dashboard/client/src/services/incidentService.ts (lines 653-708)

6. IncidentCard / EvidenceViewer Rendering:
   - In `IncidentCard.tsx`:
     `const [thumbnailUrl, setThumbnailUrl] = useState(...)`
     `const isRealCapture = Boolean(thumbnailUrl && !imageError);`
     `const activeImageSrc = isRealCapture ? thumbnailUrl! : incident.evidenceFrame;`
     `<img src={activeImageSrc} onError={() => setImageError(true)} />`
   - If real image loads: Displays actual camera JPEG with green "Live Capture" pulse dot.
   - If image 404s or is absent: Triggers `onError` and renders `incident.evidenceFrame` (synthetic SVG).
```

### Why Do Some Screenshots Show Synthetic Road Graphics Instead of Real JPGs?

There are **three distinct reasons**:

1. **Mock Mode (`VITE_USE_MOCK_DATA=true` or Local Storage Cache)**:  
   All 13 mock incidents in [`mockIncidents.ts`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/data/mockIncidents.ts) have `evidenceFrame` and `evidenceOverlay` populated with `data:image/svg+xml;charset=utf-8,...` generated by `generateSvgFrame()`. They have no backing JPEG on disk.
2. **Fictitious File Paths in `seed_database.py`**:  
   [`scripts/seed_database.py:176, 250, 298`](file:///d:/Not-So-Smart_ELCIA/scripts/seed_database.py#L176) seeds records pointing to `outputs/evidence/demo_waterlogging_ec01.jpg`, which does not physically exist in `outputs/evidence/`. When the browser attempts to fetch this URL, FastAPI returns `404 Not Found`, firing `onError` and instantly switching the `<img>` tag to the synthetic SVG fallback.
3. **Incidents Created via API Without Uploading Video**:  
   If an incident is created via `POST /api/v1/incidents/` or simulated in `DroneIngestionStudio.tsx`, no `Evidence` sub-resource exists. `getPrimaryEvidenceMediaUrl` resolves to `null`, causing `IncidentCard` to display `incident.evidenceFrame` (the synthetic SVG).

---

## 11. Incident Card Audit

Audit of all 12 visible fields across [`IncidentCard.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx) and [`IncidentQueueView.tsx`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentQueueView.tsx):

| Displayed Field | Exact UI Component Reference | Code Source & Trace | Data Classification |
|---|---|---|---|
| **Incident ID / Code** | [`IncidentCard.tsx:231`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L231) | `incident.code \|\| incident.id` from `item.incident_code` / `item.id` | **LIVE DB / MOCK (Context Dependent)** |
| **Incident Hazard Type** | [`IncidentCard.tsx:201`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L201) | `getIncidentTypeLabel(incident.type)` via `mapBackendTypeToFrontend(item.incident_type)` | **LIVE DB / MOCK** |
| **Confidence Percentage** | [`IncidentCard.tsx:221`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L221) | `Math.round(incident.confidence * 100)` from `item.confidence` (falls back to 0.95 in ingestion) | **FALLBACK (0.95) / MOCK** |
| **AI Severity Score** | [`IncidentCard.tsx:249`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L249) | `incident.severity.toFixed(1) / 10` from `item.severity_score` | **LIVE DB (0.0–10.0) / MOCK** |
| **Priority Level Badge** | [`IncidentCard.tsx:210`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L210) | `<PriorityBadge priority={incident.priority} />` from `item.priority` | **LIVE DB / MOCK** |
| **Persistence Duration** | [`IncidentCard.tsx:264`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L264) | `incident.durationSeconds` from `item.duration_seconds ?? 180` | **LIVE DB / FALLBACK (180s)** |
| **Surveillance Zone Code** | [`IncidentCard.tsx:217`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L217) | `incident.zoneId` (defaults to `'EC-01'` in mapper line 223) | **HARDCODED FALLBACK ('EC-01')** |
| **Surveillance Zone Label** | [`IncidentCard.tsx:266`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L266) | `incident.zone` (`Electronics City Zone (${item.zone_id.slice(0, 8)})`) | **DERIVED STRING** |
| **Location Description** | [`IncidentCard.tsx:237`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L237) | `incident.locationDescription` derived from lat/lng or recommended action | **DERIVED STRING / MOCK** |
| **Lifecycle Status Badge** | [`IncidentCard.tsx:233`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L233) | `<StatusBadge status={incident.status} />` from `item.status` | **LIVE DB / MOCK** |
| **Evidence Thumbnail** | [`IncidentCard.tsx:189`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L189) | `activeImageSrc` (`thumbnailUrl` if valid, otherwise `incident.evidenceFrame`) | **LIVE MEDIA / SVG FALLBACK** |
| **Live Capture Pulse Dot** | [`IncidentCard.tsx:205`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/incidents/IncidentCard.tsx#L205) | Rendered only when `isRealCapture === true` (`thumbnailUrl && !imageError`) | **DYNAMIC LOGIC** |

---

## 12. Analytics Audit

| Chart / Visualization | Component Reference | API Endpoint & Function | Data Authenticity & Series Check |
|---|---|---|---|
| **Issues Over Time (Area Chart)** | [`AnalyticsDashboard.tsx:254-290`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L254-L290) | `GET /api/v1/analytics/trends?days=7` → `get_analytics_trends()` in [`src/repositories/analytics.py:81`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L81) | **100% REAL DATABASE DATA**  <br>Aggregates real daily counts for all 5 hazard classes over past 7 days. Returns 0 for days with no records. |
| **Issues by Type (Horizontal Bar)** | [`AnalyticsDashboard.tsx:313-342`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L313-L342) | Derived on client in [`analyticsService.ts:114-126`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/analyticsService.ts#L114-L126) by summing the 7-day trend series | **100% REAL DATABASE DATA**  <br>Accurately sums 7-day totals for Waterlogging, Potholes, Damaged Footpath, Drainage Overflow, Open Manhole. |
| **Issues by Urgency (Grouped Bar)** | [`AnalyticsDashboard.tsx:356-369`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L356-L369) | `GET /api/v1/analytics/zones` → `get_analytics_zones()` in [`src/repositories/analytics.py:149`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L149) | **100% REAL DATABASE DATA**  <br>SQL outer join aggregates P1, P2, P3 counts grouped by each zone code (`EC-01` to `EC-04`). |
| **Operational Status (Donut Chart)** | [`AnalyticsDashboard.tsx:384-423`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/analytics/AnalyticsDashboard.tsx#L384-L423) | `GET /api/v1/analytics/summary` → `get_analytics_summary()` in [`src/repositories/analytics.py:65`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L65) | **100% REAL DATABASE DATA**  <br>SQL `group_by(Incident.status)` returns exact counts for DETECTED, VERIFIED, ASSIGNED, IN_PROGRESS, RE_INSPECTION, CLOSED, REJECTED. |

---

## 13. Complete Master Data-Flow Matrix

| UI Field / Component | UI Location | Data Source | Dynamic? | Derived? | Mock? | Fallback? | Hardcoded? | Correct? |
|---|---|---|---|---|---|---|---|---|
| **Incident ID / Code** | `IncidentCard.tsx` | DB `incident_code` | YES | NO | If Mock mode | NO | NO | **YES** |
| **Hazard Type** | `IncidentCard.tsx` | DB `incident_type` | YES | NO | If Mock mode | NO | NO | **YES** |
| **Confidence Score** | `IncidentCard.tsx` | DB `confidence` | NO | YES | If Mock mode | **YES (0.95)** | **YES (tracker gap)** | **MUST FIX** |
| **Severity Score** | `IncidentCard.tsx` | DB `severity_score` | YES | YES | If Mock mode | NO | NO | **YES** |
| **Priority Level** | `IncidentCard.tsx` | DB `priority` | YES | YES | If Mock mode | NO | NO | **YES** |
| **Persistence Duration** | `IncidentCard.tsx` | DB `duration_seconds` | YES | NO | If Mock mode | **YES (180s)** | NO | **ACCEPTABLE** |
| **Surveillance Zone** | `IncidentCard.tsx` | Mapper `zoneId` | NO | NO | If Mock mode | **YES ('EC-01')** | **YES ('EC-01')** | **MUST FIX** |
| **GPS Coordinates** | `IncidentMapView.tsx` | DB `location` (PostGIS) | YES | NO | If Mock mode | **YES (Center)** | NO | **YES** |
| **Timestamp / Age** | `IncidentCard.tsx` | DB `started_at`/`created_at` | YES | YES (time ago) | If Mock mode | NO | NO | **YES** |
| **Evidence Thumbnail** | `IncidentCard.tsx` | `/static/jobs/...` JPG | YES | NO | If Mock mode | **YES (SVG)** | NO | **YES (on real run)** |
| **Evidence Overlay** | `EvidenceViewer.tsx` | SVG / AI Observations | YES | YES | If Mock mode | **YES (SVG)** | NO | **YES** |
| **Recommended Action** | `IncidentDetail.tsx` | DB `recommended_action` | YES | YES | If Mock mode | YES (template) | NO | **YES** |
| **Operator Assignment** | `AssignmentSection.tsx`| DB `assignments` table | YES | NO | If Mock mode | NO | NO | **YES** |
| **Resolution Status** | `IncidentCard.tsx` | DB `status` enum | YES | NO | If Mock mode | NO | NO | **YES** |
| **Active Incidents KPI** | `KpiSummaryGrid.tsx` | SQL `count(active)` | YES | YES (SQL) | If Mock mode | NO | NO | **YES** |
| **Urgency P1/P2/P3 KPIs** | `KpiSummaryGrid.tsx` | SQL `count(priority)` | YES | YES (SQL) | If Mock mode | NO | NO | **YES** |
| **Waterlogged Surface** | `KpiSummaryGrid.tsx` | `None` (SQL) | NO | NO | NO | **YES ("N/A")** | NO | **YES** |
| **Resolution Velocity** | `OverviewTab.tsx:68` | Static JSX String | **NO** | **NO** | **NO** | **NO** | **YES ("1.4 Hours")** | **MUST FIX** |
| **Manual Speedup Stat** | `OverviewTab.tsx:71` | Static JSX String | **NO** | **NO** | **NO** | **NO** | **YES ("38%")** | **MUST FIX** |
| **7-Day Trend Chart** | `AnalyticsDashboard.tsx`| SQL `date(created_at)` | YES | YES (SQL) | If Mock mode | NO | NO | **YES** |
| **Urgency by Zone Chart** | `AnalyticsDashboard.tsx`| SQL `outerjoin(zones)` | YES | YES (SQL) | If Mock mode | NO | NO | **YES** |
| **Status Donut Chart** | `AnalyticsDashboard.tsx`| SQL `group_by(status)` | YES | YES (SQL) | If Mock mode | NO | NO | **YES** |
| **Notifications** | `NotificationCenter.tsx`| LocalStorage Event Bus | YES | YES | NO | NO | NO | **YES** |

---

## 14. Production-Readiness Classification

### List A: SAFE / GENUINELY DYNAMIC (Production Ready)

1. **PostgreSQL & PostGIS Schema**: Complete database tables (`incidents`, `detections`, `evidence`, `assignments`, `inspections`, `incident_status_history`, `zones`, `users`).
2. **SQL Analytics Engine**: Full aggregation repository in [`src/repositories/analytics.py`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py) calculating true dynamic KPIs, 7-day class trends, zone risk distributions, and status counts.
3. **ML YOLOv8 Tracking & Inference**: `YOLOSegmentor` running real model tensor inference and generating ByteTrack IDs.
4. **DPT-Large Depth Estimation**: `DepthEstimator` generating real metric disparity maps for pothole depth calculations.
5. **Video H.264 Transcoding Pipeline**: FFmpeg transcode pipeline in `video_tracker.py` producing streamable web MP4s.
6. **FastAPI Static Media Serving**: Clean mounts for `/static/jobs`, `/static/evidence`, and `/evidence`.
7. **Spatial Google Maps Integration**: Real Google Maps JS API with data-driven `fitBounds` camera controllers.
8. **Operational Workflow State Machine**: Status transitions (`DETECTED` → `VERIFIED` → `ASSIGNED` → `IN_PROGRESS` → `RE_INSPECTION` → `CLOSED` / `REJECTED`) enforced on both client and backend.

### List B: DEMO-ONLY / MOCK (Intentional for Offline Demos)

1. **`INITIAL_MOCK_INCIDENTS` (`mockIncidents.ts`)**: 13 mock fixtures for offline UI development and demos when no backend is running.
2. **`SAMPLE_PRESETS` (`inferenceService.ts`)**: 6 built-in video preset cards allowing instant jury presentations without uploading 500MB drone video files.
3. **`generateSvgFrame()`**: Procedural SVG renderer ensuring the dashboard never shows broken image icons if media is loading or missing.
4. **`parseSrtFallback()`**: Client-side GPS parser with approximate zone bounding boxes when the backend is offline.

### List C: MUST FIX BEFORE JURY DEMO (Credibility Risks)

1. **Missing Confidence in Video Tracker Output (`src/detection/video_tracker.py:248-262`)**:  
   *Why*: The YOLO model calculates real confidence, but `video_tracker.py` forgets to log it in `log_entry`. This triggers the `0.95` fallback in ingestion, causing a jury to see 95% on every single card and suspect the entire AI pipeline is fake.
2. **Hardcoded `"1.4 Hours"` and `"38% vs. manual inspection"` in `OverviewTab.tsx:68-71`**:  
   *Why*: These are static strings in the hero header. If a judge or auditor inspects the code or resolves incidents, these numbers never change.
3. **Hardcoded `zoneId: 'EC-01'` Fallback in `incidentService.ts:223`**:  
   *Why*: In the frontend mapper, `zoneId` is hardcoded to `'EC-01'`, causing filtering by other zones (`EC-02`, `EC-03`, `EC-04`) to miss backend incidents.
4. **Fictitious Filenames in `seed_database.py:176, 250, 298`**:  
   *Why*: Seeding demo data points to non-existent image paths (`demo_waterlogging_ec01.jpg`), causing 404s and forcing fallback SVGs instead of real camera frames.

---

## 15. Recommended Fix Order (Prioritized)

> **NOTE**: Per instructions, these fixes are documented for planning purposes only and have **NOT** been implemented in this audit turn.

### Priority P0 — Credibility & Misleading Data (Fix First)

1. **Restore Real Confidence Score in `video_tracker.py`**:
   - Add `"confidence": round(det["confidence"], 4)` into `log_entry` in [`src/detection/video_tracker.py:248-262`](file:///d:/Not-So-Smart_ELCIA/src/detection/video_tracker.py#L248-L262).
   - This single 1-line addition ensures real YOLO model confidence (e.g. 87.3%, 92.1%) flows through to `hazard_telemetry.json`, database, API, and UI cards.
2. **Wire Hero Banner Metrics to Dynamic KPIs in `OverviewTab.tsx`**:
   - Replace static `"1.4 Hours"` with `{analytics?.kpis.meanTimeToResolutionHours ? \`${analytics.kpis.meanTimeToResolutionHours} Hours\` : '1.4 Hours'}`.
   - Replace static `"38%"` with dynamic speedup calculation or configurable metric.

### Priority P1 — Major Functionality & Linking Issues

3. **Dynamic Zone Code Mapping in `incidentService.ts`**:
   - Update `mapBackendIncidentToFrontend()` in [`incidentService.ts:223`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/services/incidentService.ts#L223) to look up zone code from cached zones list rather than hardcoding `'EC-01'`.
4. **Fix Seed Script Image Paths in `seed_database.py`**:
   - Update [`scripts/seed_database.py:176`](file:///d:/Not-So-Smart_ELCIA/scripts/seed_database.py#L176) to reference actual sample JPG files located in `outputs/evidence/` or `data/samples/`.

### Priority P2 — Useful Improvements

5. **Expose `waterlogged_area_sqm` in Analytics Repository**:
   - In [`src/repositories/analytics.py:58`](file:///d:/Not-So-Smart_ELCIA/src/repositories/analytics.py#L58), compute `sum(case((incident_type == 'WATERLOGGING', detection_metadata->>'mask_pixels')))` to return real waterlogged area rather than `None`.
6. **Add Rainfall Metric Ingestion**:
   - Allow optional weather/rainfall mm data points to be stored with daily analytics trends.

### Priority P3 — Cosmetic / Polish

7. **Remove Development Badge from MiniMapWidget**:
   - Remove or conditionally hide `"For development purposes only"` badge in [`MiniMapWidget.tsx:142-147`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/MiniMapWidget.tsx#L142-L147).

---

## 16. Explicit Audit Conclusions

### Conclusion 1: Why Are JPG Evidence Images Not Loading in Some Views?
1. In Mock Mode (`mockIncidents.ts`), incidents use inline procedural SVGs (`generateSvgFrame()`) by design.
2. In Database Seed Mode (`seed_database.py`), the script registered fictitious filenames (`demo_waterlogging_ec01.jpg`) that did not exist in `outputs/evidence/`, triggering 404 errors and activating the SVG fallback.
3. In Live ML Mode, real JPGs exist in `outputs/jobs/<job_id>/evidence/` and **DO load successfully** via `/static/jobs/<job_id>/evidence/<filename>`.

### Conclusion 2: Is 95% Confidence Dynamic or Hardcoded?
The 95% confidence displayed on live ingested incidents is **HARDCODED FALLBACK DATA**. While the YOLO model computes genuine confidence in `yolo_segmentation.py`, `video_tracker.py` omitted `"confidence"` when saving `hazard_telemetry.json`. `ml_ingestion_service.py` defaulted missing values to `0.95`, causing every incident in PostgreSQL to store `0.95`.

### Conclusion 3: Is Severity 9.5 Dynamic or Hardcoded?
- On real ML pipeline runs, severity is **DYNAMICALLY CALCULATED** from contour pixel area and DPT depth disparity drop (`SeverityAnalyzer`), then normalized to 0.0–10.0 in `ml_ingestion_service.py`.
- On simulated open manhole inference presets in `inferenceService.ts`, severity is **HARDCODED TO 9.5**.

### Conclusion 4: Are "1.4 Hours" and "38% vs. manual inspection" Real?
**NO. THEY ARE 100% HARDCODED STATIC DISPLAY STRINGS.** They are written directly in JSX in [`dashboard/client/src/components/overview/OverviewTab.tsx:68-71`](file:///d:/Not-So-Smart_ELCIA/dashboard/client/src/components/overview/OverviewTab.tsx#L68-L71) and have no connection to the database or analytics APIs.

---

## 17. Source File Integrity Verification

**CONFIRMATION**:
In strict compliance with instructions:
- **NO application source files were modified.**
- **NO database records were altered or deleted.**
- **NO test suites or configuration files were changed.**
- **ONLY this audit report (`docs/FULL_DYNAMIC_DATA_AUDIT.md`) was created.**
