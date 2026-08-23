# CivicPulse Current System State & Technical Snapshot

**Document Date:** August 24, 2026  
**System Version:** 1.0.0 (Post-ML Pipeline Deployment & End-to-End Verification)  
**Context:** ELCIA Smart City Drone-AI Challenge 2026  

---

## 1. Current Architecture

```text
Surveillance Video Feed / DJI Drone Footage (.mov / .mp4)
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ ML Processing & Inference                              │
│ • Frame Extraction & Preprocessing                     │
│ • YOLOv8 Segmentation (civicpulse_best.pt)             │
│ • MiDaS Depth Estimation (DPT_Large for Potholes)     │
│ • ByteTrack Multi-Object Tracking                      │
│ • Severity Scoring & Physical Hazard Calculation       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Evidence & Telemetry Generation                        │
│ • Snapshot Frame Capture (outputs/evidence/*.jpg)      │
│ • Telemetry Aggregation (outputs/hazard_telemetry.json)│
│ • DJI SRT Telemetry Sync (Latitude/Longitude lookup)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Backend Ingestion & Database                           │
│ • FastAPI REST Service Layer (/api/v1/incidents/)      │
│ • PostgreSQL 15 + PostGIS 3 Spatial Database           │
│ • ORM Data Layer & Subresources (Detections, Evidence, │
│   Assignments, Inspections, History Audit Trail)       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ React Operations Dashboard                             │
│ • Ingest Studio (Video Processing & Publishing)        │
│ • Google Maps Spatial Operations Center (PostGIS Points)│
│ • Incident Queue & Interactive Triage Workflow         │
│ • Analytics Insights (SQL Database-Side Aggregations)  │
└────────────────────────────────────────────────────────┘
```

### Stage Implementations

1. **Video/Input**: Ingests drone aerial footage (`data_raw/demo_video.mov`) and associated flight telemetry (`data_raw/demo_video.srt`) or client browser clip uploads via the dashboard Ingest Studio.
2. **ML Preprocessing & Model Inference**: Handled by `YOLOSegmentor` (`src/detection/yolo_segmentation.py`) loading `models/production/civicpulse_best.pt` (YOLOv8s-seg fine-tuned on waterlogging, potholes, drainage overflows, and damaged footpaths). Runs GPU/CPU tensor inference at 640x640 resolution with confidence threshold `0.20` and IoU `0.45`.
3. **Detection & Depth Analysis**: For pothole detections (`class_id == 1`), `DepthEstimator` (`src/detection/depth_estimator.py`) executes MiDaS `DPT_Large` to compute relative depth drop maps. `SeverityAnalyzer` (`src/detection/severity_analyzer.py`) combines mask pixel coverage, area percentage, and relative depth drop to compute physical hazard severity scores (0–100) and risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
4. **Temporal Association & Deduplication**: ByteTrack tracking (`configs/custom_bytetrack.yaml`) assigns persistent tracking IDs to moving and stationary hazards across frames. `HazardVideoPipeline` (`src/detection/video_tracker.py`) uses an in-memory set `logged_hazard_ids` to log and snapshot each unique hazard once, suppressing duplicate frame alerts.
5. **Incident & Evidence Generation**: `HazardVideoPipeline` outputs:
   - Annotated video: `outputs/demo_tracked_output.mp4`
   - Telemetry JSON: `outputs/hazard_telemetry.json`
   - Evidence image snapshots: `outputs/evidence/hazard_{track_id}_{risk_level}.jpg`
6. **FastAPI & PostgreSQL/PostGIS Backend**: Ingested payloads are posted via REST API (`POST /api/v1/incidents/`) or database seeders (`scripts/seed_database.py`), storing representative spatial coordinates in PostGIS `Geometry(POINT, srid=4326)` columns. Subresources (evidence, detections, assignments, inspections, history) are linked via foreign keys.
7. **React Operations Dashboard**: TypeScript/Vite frontend fetches incidents via `incidentService.ts` and `api.ts`, displaying live spatial pins on `@vis.gl/react-google-maps`, managing status state transitions (`DETECTED` $\rightarrow$ `VERIFIED`/`REJECTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RE_INSPECTION` $\rightarrow$ `CLOSED`), and rendering database SQL analytics using Recharts.

---

## 2. ML Pipeline

### Component Specifications

- **Model Checkpoints**: `models/production/civicpulse_best.pt` (primary production YOLOv8-seg weights) and `runs/segment/civicpulse_4class_max-2/weights/last.pt`.
- **Depth Estimator**: Intel ISL MiDaS `DPT_Large` PyTorch vision transformer model (`torch.hub` loader).
- **Tracker**: ByteTrack multi-object tracking via `configs/custom_bytetrack.yaml`.
- **Pipeline Entry Points**: `HazardVideoPipeline` (`src/detection/video_tracker.py`), `scripts/run_pipeline.py`, `scripts/test_video.py`.
- **Inference Command**:
  ```bash
  python scripts/run_pipeline.py
  ```

### Input & Output Data Contracts

- **Input Format**: MP4 / MOV surveillance video + optional DJI SRT subtitle telemetry log containing timestamped GPS coordinates (`latitude`, `longitude`).
- **Output Format**:
  - Telemetry Log: `outputs/hazard_telemetry.json`
  - Evidence Directory: `outputs/evidence/`
  - Annotated Render: `outputs/demo_tracked_output.mp4`

### Telemetry JSON Field Schema (`outputs/hazard_telemetry.json`)

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `hazard_id` | Integer | ByteTrack persistent tracking ID | `3` |
| `frame_logged` | Integer | Video frame index where hazard was first logged | `1` |
| `timestamp_sec` | Float | Timestamp in seconds from video start | `0.02` |
| `latitude` | Float | GPS latitude parsed from SRT telemetry | `22.3072` |
| `longitude` | Float | GPS longitude parsed from SRT telemetry | `73.1812` |
| `class_name` | String | Model target class (`waterlogging`, `pothole`, `drainage_overflow`, `damaged_footpath`) | `"waterlogging"` |
| `risk_level` | String | Categorical risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) | `"LOW"` |
| `severity_score` | Integer/Float | Calculated physical severity score (0 to 100) | `36` |
| `relative_depth_drop` | Float | MiDaS relative depth drop metric (potholes only) | `0.721` |
| `area_coverage_pct` | Float | Percentage of frame area occupied by hazard mask | `0.47` |
| `mask_pixels` | Float | Total pixel area of segmentation mask polygon | `10215.5` |
| `evidence_file` | String | Snapshot image filename in `outputs/evidence/` | `"hazard_3_LOW.jpg"` |

### Inference Thresholds & Performance Parameters

- **Confidence Threshold (`conf_threshold`)**: `0.20` (lowered to catch small/distant road hazards).
- **IoU Threshold (`iou_threshold`)**: `0.45`.
- **Inference Resolution (`imgsz`)**: `640` (configurable to `1280` for high-altitude drone footage).
- **Noise Area Filter (`min_area_pixels`)**: `150` pixels (suppresses small mask noise).
- **Duplicate Suppression**: `self.logged_hazard_ids` set prevents repeated logging of the same ByteTrack `track_id`.

---

## 3. Backend Integration

ML pipeline outputs enter the backend database through REST API endpoints defined in `src/api/routes/incidents.py` and service wrappers in `dashboard/client/src/services/incidentService.ts`.

### Integration Flow & Endpoints

```text
ML Telemetry / Ingest Studio
            │
            ├──► POST /api/v1/incidents/ (Creates Incident Record)
            ├──► POST /api/v1/incidents/{id}/evidence (Attaches Evidence Snapshot)
            └──► POST /api/v1/incidents/{id}/detections (Attaches Frame Detection Observation)
```

### Key Request Payloads & Mappings

1. **Incident Creation (`POST /api/v1/incidents/`)**:
   ```json
   {
     "incident_code": "INC-8492",
     "incident_type": "WATERLOGGING",
     "confidence": 0.94,
     "severity_score": 7.8,
     "priority": "P1",
     "zone_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
     "status": "DETECTED",
     "started_at": "2026-08-24T04:00:00Z",
     "recommended_action": "Drainage Clearing",
     "location": {
       "type": "Point",
       "coordinates": [77.6650, 12.8450]
     }
   }
   ```
2. **Evidence Attachment (`POST /api/v1/incidents/{id}/evidence`)**:
   ```json
   {
     "evidence_type": "IMAGE",
     "file_path": "outputs/evidence/hazard_3_LOW.jpg",
     "description": "Snapshot captured at 0.02s",
     "is_primary": true
   }
   ```

### Backend Repositories & Data Access Layer

- `src/repositories/incidents.py`: Handles `create_incident`, `get_incident`, `list_incidents`, `update_incident_status`. Uses GeoAlchemy2 `WKTElement` to insert PostGIS `POINT(longitude latitude)` geometries.
- `src/repositories/evidence.py`: Handles `create_evidence`, `list_incident_evidence`.
- `src/repositories/detections.py`: Handles `create_detection`, `list_incident_detections`.
- `src/repositories/zones.py`: Handles `get_zone`, `create_zone`, `list_zones`.

---

## 4. Database State

### Database Engine & Extension
- **Engine**: PostgreSQL 15+ (with SQLite fallback for lightweight unit tests).
- **Spatial Extension**: PostGIS 3 (`CREATE EXTENSION IF NOT EXISTS postgis;`).
- **ORM**: SQLAlchemy 2.0 with GeoAlchemy2 geometry column types.
- **Migrations**: Alembic revision `20260821_001` (`alembic/versions/20260821_001_initial_schema.py`).

### Table Schemas & Foreign Keys

```text
    ┌─────────────┐            ┌─────────────────┐
    │    zones    │◄───────────┤    incidents    │
    └─────────────┘            └────────┬────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
  ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
  │   detections    │          │    evidence     │          │   assignments   │
  └─────────────────┘          └─────────────────┘          └────────┬────────┘
                                                                     │
                                                                     ▼
                                                            ┌─────────────────┐
                                                            │      users      │
                                                            └─────────────────┘
```

#### 1. `incidents` Table
- `id` (UUID, Primary Key)
- `incident_code` (VARCHAR(64), Unique, Indexed)
- `incident_type` (VARCHAR(32), `WATERLOGGING` / `POTHOLE`, Indexed)
- `confidence` (FLOAT, Constraint: `0.0 <= confidence <= 1.0`)
- `severity_score` (FLOAT, Constraint: `0.0 <= severity_score <= 10.0`)
- `priority` (VARCHAR(10), `P1` / `P2` / `P3`, Indexed)
- `status` (VARCHAR(32), `DETECTED` / `VERIFIED` / `REJECTED` / `ASSIGNED` / `IN_PROGRESS` / `RE_INSPECTION` / `CLOSED`, Indexed)
- `started_at` (TIMESTAMPTZ, Indexed)
- `ended_at` (TIMESTAMPTZ, Nullable)
- `duration_seconds` (FLOAT, Nullable)
- `recommended_action` (TEXT, Nullable)
- `zone_id` (UUID, FK `zones.id`, RESTRICT, Indexed)
- `location` (`Geometry(POINT, srid=4326)`, Spatial Index)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### 2. `zones` Table
- `id` (UUID, Primary Key)
- `code` (VARCHAR(32), Unique, Indexed e.g., `EC-01`, `EC-02`, `EC-03`, `EC-04`)
- `name` (VARCHAR(128))
- `description` (TEXT, Nullable)
- `geometry` (`Geometry(POLYGON, srid=4326)`, Spatial Index)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### 3. `detections` Table
- `id` (UUID, Primary Key)
- `incident_id` (UUID, FK `incidents.id`, CASCADE, Indexed)
- `detection_type` (VARCHAR(64))
- `confidence` (FLOAT)
- `frame_number` (INTEGER, Nullable)
- `detected_at` (TIMESTAMPTZ, Nullable)
- `location` (`Geometry(POINT, srid=4326)`, Spatial Index, Nullable)
- `detection_metadata` (JSONB, Nullable)
- `created_at` (TIMESTAMPTZ)

#### 4. `evidence` Table
- `id` (UUID, Primary Key)
- `incident_id` (UUID, FK `incidents.id`, CASCADE, Indexed)
- `evidence_type` (VARCHAR(32), `IMAGE` / `VIDEO` / `CLIP`)
- `file_path` (VARCHAR(512))
- `captured_at` (TIMESTAMPTZ, Nullable)
- `description` (TEXT, Nullable)
- `is_primary` (BOOLEAN, Default `false`)
- `created_at` (TIMESTAMPTZ)

#### 5. `assignments` Table
- `id` (UUID, Primary Key)
- `incident_id` (UUID, FK `incidents.id`, CASCADE, Indexed)
- `assigned_to` (UUID, FK `users.id`, RESTRICT, Indexed)
- `assigned_team` (VARCHAR(128), Nullable)
- `assigned_at` (TIMESTAMPTZ, Default `now()`)
- `completed_at` (TIMESTAMPTZ, Nullable)
- `notes` (TEXT, Nullable)

#### 6. `status_history` Table
- `id` (UUID, Primary Key)
- `incident_id` (UUID, FK `incidents.id`, CASCADE, Indexed)
- `from_status` (VARCHAR(32), Nullable)
- `to_status` (VARCHAR(32), Indexed)
- `changed_by` (UUID, FK `users.id`, Nullable)
- `comment` (TEXT, Nullable)
- `created_at` (TIMESTAMPTZ)

#### 7. `inspections` Table
- `id` (UUID, Primary Key)
- `incident_id` (UUID, FK `incidents.id`, CASCADE, Indexed)
- `inspector_id` (UUID, FK `users.id`, RESTRICT, Indexed)
- `result` (VARCHAR(32), `VERIFIED_ACCURATE` / `MISCLASSIFIED` / `RESOLVED` / `UNRESOLVED` / `DUPLICATE`)
- `inspection_time` (TIMESTAMPTZ, Default `now()`)
- `notes` (TEXT, Nullable)
- `location` (`Geometry(POINT, srid=4326)`, Nullable)
- `evidence_id` (UUID, FK `evidence.id`, Nullable)
- `created_at` (TIMESTAMPTZ)

#### 8. `users` Table
- `id` (UUID, Primary Key)
- `name` (VARCHAR(128))
- `email` (VARCHAR(255), Unique, Indexed)
- `role` (VARCHAR(32), `ADMIN` / `OPERATOR` / `INSPECTOR`)
- `is_active` (BOOLEAN, Default `true`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

---

## 5. Dashboard Integration

The React dashboard (`dashboard/client/src/`) interacts with the backend via `incidentService.ts` and `analyticsService.ts`:

- **Incident Queue (`IncidentQueueView.tsx`)**: Fetches incidents via `GET /api/v1/incidents/`. Multi-criteria filtering by incident type, status, priority, and zone. Client-side sorting and reactive polling.
- **Google Maps Spatial View (`IncidentMapView.tsx` & `MiniMapWidget.tsx`)**: Renders PostGIS `location` coordinates on `@vis.gl/react-google-maps`. Features radar pulse animation for P1 critical hazards, custom pin coordinate fly-to, satellite hybrid toggle, and a clean map-unavailable fallback card if `VITE_GOOGLE_MAPS_API_KEY` is missing.
- **AI Ingest Studio (`DroneIngestionStudio.tsx`)**: Accepts clip selection, executes simulated inference processing, and publishes resulting incidents directly to the backend database via `POST /api/v1/incidents/`.
- **Incident Inspector Modal (`IncidentDetailModal.tsx`)**: Displays evidence snapshots (`GET /incidents/{id}/evidence`), detection observations (`GET /incidents/{id}/detections`), status history audit trail (`GET /incidents/{id}/history`), and inspector actions.
- **Verification Workflow**:
  - `verifyIncident(id)` $\rightarrow$ `PATCH /api/v1/incidents/{id}/status` with status `VERIFIED`.
  - `rejectIncident(id)` $\rightarrow$ `PATCH /api/v1/incidents/{id}/status` with status `REJECTED`.
- **Assignments Workflow**: `assignIncident(id, owner, action)` $\rightarrow$ `POST /api/v1/incidents/{id}/assignments` and status update to `ASSIGNED`.
- **Field Inspections**: `createIncidentInspection(id, payload)` $\rightarrow$ `POST /api/v1/incidents/{id}/inspections`.
- **Analytics Dashboard (`AnalyticsDashboard.tsx`)**:
  - `GET /api/v1/analytics/summary`: Displays KPI cards (Total inundated area: N/A, MTTR, P1 critical count, Active count).
  - `GET /api/v1/analytics/trends`: Displays 7-day rolling surge trend AreaChart.
  - `GET /api/v1/analytics/zones`: Displays zone priority vulnerability BarChart.
  - Donut Chart: Displays operational status distribution with flexbox center overlay (`top-[37%] left-1/2 -translate-x-1/2 -translate-y-1/2`).

---

## 6. End-to-End Test Execution & Verification

### Test Execution Procedure

1. **Input Data**: Drone aerial video (`data_raw/demo_video.mov`) and subtitle telemetry (`data_raw/demo_video.srt`).
2. **ML Pipeline Run**:
   ```bash
   python scripts/run_pipeline.py
   ```
   - Loaded YOLOv8-seg weights (`civicpulse_best.pt`).
   - Processed 7,142 frame detections.
   - Ran MiDaS depth estimation on pothole candidates.
   - Outputted annotated video (`outputs/demo_tracked_output.mp4`), telemetry JSON (`outputs/hazard_telemetry.json`), and 39 evidence frames (`outputs/evidence/*.jpg`).
3. **Database Seeding & Ingestion**:
   ```bash
   python scripts/seed_database.py
   ```
   - Seeded zones (`EC-01` to `EC-04`), users, incidents, detections, evidence, assignments, inspections, and status history into PostgreSQL database.
4. **Backend Server Startup**:
   ```bash
   python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
   ```
5. **Backend Automated Pytest Suite**:
   ```bash
   python -m pytest
   ```
   - **Result**: `37 passed in 0.86s` (100% pass rate).
6. **Frontend Development Server**:
   ```bash
   cd dashboard/client
   npm run check
   ```
   - **Result**: `0 TypeScript compilation errors`.
7. **Frontend Ingest Studio Integration Verification**:
   ```bash
   npx tsx scratch/verify_qa_fixes.ts
   ```
   - **Result**: `5/5 verification steps passed` (verified `getIncidents` for `all`, `waterlogging`, `pothole`, and `createIncident` POST publishing to live backend DB).

---

## 7. Feature Implementation Status Matrix

### DONE (Fully Verified & Operational)
- ✅ Core FastAPI REST API service layer with CORS middleware.
- ✅ PostgreSQL 15 + PostGIS 3 schema with Alembic migration lifecycle (`20260821_001`).
- ✅ Pytest automated test suite (37/37 passing).
- ✅ YOLOv8-seg fine-tuned model inference (`civicpulse_best.pt`).
- ✅ MiDaS `DPT_Large` relative depth drop estimation for potholes.
- ✅ ByteTrack multi-object tracking & temporal deduplication.
- ✅ DJI SRT subtitle telemetry parser for real-time GPS coordinate extraction.
- ✅ Operational severity & priority scoring engine (0.0 to 10.0 scale $\rightarrow$ P1, P2, P3).
- ✅ Subresource REST APIs (Evidence, Detections, Assignments, Inspections, Status History).
- ✅ React Operations Dashboard (TypeScript/Vite/Tailwind CSS).
- ✅ Live Google Maps spatial center (`@vis.gl/react-google-maps`) with PostGIS points.
- ✅ AI Ingest Studio with backend incident publishing (`POST /api/v1/incidents/`).
- ✅ Operational state machine (`DETECTED`, `VERIFIED`, `REJECTED`, `ASSIGNED`, `IN_PROGRESS`, `RE_INSPECTION`, `CLOSED`).
- ✅ Real-time analytics engine (SQL database-side aggregations).
- ✅ Hard Dashboard QA bug fixes (camera jitter stabilization, ingest publishing, empty array type filter handling).

### WORKING BUT NEEDS FINE-TUNING
- 🟡 **Waterlogging Depth & Volume Estimation**: Currently computes 2D surface mask area and frame coverage ratio; physical liquid volume depth drop is not measured (defaults to `0.0`).
- 🟡 **Drone Telemetry Time Matching**: Telemetry lookup matches nearest second string (`00:00:02`); sub-second interpolation can be refined.
- 🟡 **Evidence Media Asset Serving**: Evidence file paths stored as relative strings (`outputs/evidence/...`); production requires an explicit FastAPI static file mount or S3 signed URLs.

### NOT IMPLEMENTED (Future Roadmap)
- ❌ **Live RTSP / RTMP Streaming Ingestion**: Real-time camera stream decoder.
- ❌ **Drone Trajectory `LINESTRING` Storage**: Database table for full flight paths.
- ❌ **Physical Rain Gauge Telemetry Integration**: Hardware weather station telemetry.

---

## 8. Known Issues & Limitations

1. **ML Detection Threshold Tradeoffs**: Lowering `conf_threshold` to `0.20` catches distant road hazards but can introduce low-confidence false positives on wet-road reflections during heavy rain.
2. **MiDaS Depth Latency**: MiDaS `DPT_Large` depth estimation runs on CPU per pothole detection frame, adding ~0.5s processing latency per pothole frame during offline processing.
3. **Evidence Binary File Serving**: Evidence file paths are saved as string filenames (`hazard_1_LOW.jpg`), requiring an explicit FastAPI static directory mount (`/static/evidence`) or object storage bucket for browser image rendering.
4. **Google Maps Key Requirement**: Google Maps rendering requires a valid browser API key (`VITE_GOOGLE_MAPS_API_KEY`). When unauthenticated, the component displays a clean map-unavailable card fallback.
5. **Physical Telemetry Limitations**:
   - `waterlogged_area_sqm`: Unavailable / N/A (physical area is not measured in the current schema).
   - `rainfall_mm`: Unavailable / N/A (rainfall telemetry is not stored).

---

## 9. Production Readiness Evaluation

| Component | Rating (1-5) | Status & Justification |
| :--- | :---: | :--- |
| **ML Pipeline** | **3.5 / 5** | Functional offline pipeline (YOLOv8-seg + MiDaS + ByteTrack). Requires TensorRT / ONNX export for edge GPU deployment. |
| **Backend API** | **4.2 / 5** | FastAPI async REST app with complete CRUD, subresources, and 37/37 passing tests. Needs OAuth2/JWT auth middleware. |
| **Database** | **4.7 / 5** | PostgreSQL 15 + PostGIS 3 spatial database with clean Alembic migrations and indexes. Highly robust. |
| **Frontend Dashboard** | **4.6 / 5** | React 18 + Vite + TypeScript, 0 compiler errors, reactive polling, state machine guards, spatial maps, Recharts analytics. |
| **Deployment Infrastructure** | **2.0 / 5** | Local development environment verified. Docker Compose and cloud k8s deployment configurations pending. |
| **Observability** | **3.0 / 5** | Structured Python logging active. Prometheus/Grafana operational metrics dashboard pending. |
| **Security** | **2.5 / 5** | CORS middleware configured, Pydantic input validation active. User authentication and SSL termination pending. |

---

## 10. Recommended Next Steps

### P0 — Immediate Blockers
1. **FastAPI Static Media Mount**: Configure `app.mount("/static", StaticFiles(directory="outputs"), name="static")` in `src/api/main.py` so evidence image files are served directly over HTTP.
2. **Environment Key Setup**: Provision production `VITE_GOOGLE_MAPS_API_KEY` with HTTP referrer restrictions.

### P1 — Before Final Demo
1. **Single-Command Demo Script**: Create a unified demo runner (`python scripts/demo_runner.py`) that processes a video clip and publishes resulting incidents to the live database.
2. **User Authentication & Role Guards**: Implement JWT login for `ADMIN`, `OPERATOR`, and `INSPECTOR` roles.

### P2 — Operational Improvements
1. **Docker Compose Packaging**: Create `docker-compose.yml` encapsulating FastAPI, PostgreSQL/PostGIS, and Vite frontend.
2. **Drone Flight Path `LINESTRING` Schema**: Migration to store drone telemetry trajectories in PostGIS.

### P3 — Future Enhancements
1. **RTSP Live Stream Decoder**: Real-time drone stream ingestion.
2. **Edge Hardware Acceleration**: Export YOLOv8 and MiDaS to TensorRT for Nvidia Jetson edge hardware.

---

## Appendix: Environment & File Reference

### Required Environment Variables

```env
# Backend Environment (.env)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=civicpulse
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/civicpulse

# Frontend Environment (dashboard/client/.env)
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Recently Modified Files
- `README.md`
- `dashboard/client/src/components/analytics/AnalyticsDashboard.tsx`
- `dashboard/client/src/components/map/IncidentMapView.tsx`
- `dashboard/client/src/components/overview/MiniMapWidget.tsx`
- `dashboard/client/src/services/incidentService.ts`
- `docs/frontend_backend_integration_log.md`
- `docs/dashboard_qa_bugfix_log.md`

### Mock / Demo-Only Files
- `dashboard/client/src/data/mockIncidents.ts` (Used strictly as fallback fixture state when backend API is unreachable).
