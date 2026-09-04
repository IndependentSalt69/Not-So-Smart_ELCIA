# CivicPulse — CURRENT CODEBASE STATE AUDIT (5-CLASS MIGRATION BASELINE)

- **Audit Timestamp**: 2026-09-04T13:21:00+05:30
- **Git Commit**: `c976eea3c365b203c181fc0991b230f59e8cc03b`
- **Audit Mode**: Read-Only / Non-Modifying Baseline Inspection
- **Target Contract**:
  - `0`: `damaged_footpath`
  - `1`: `drainage_overflow`
  - `2`: `open_manhole`
  - `3`: `pothole`
  - `4`: `waterlogging`

---

## SECTION 1 — GIT / REPOSITORY STATE

### 1.1 Git Snapshot
- **Current Branch**: `main`
- **Tracking Status**: `Your branch is up to date with 'origin/main'`
- **Working Tree State**: Clean (`nothing to commit, working tree clean`)
- **Latest Commit Hash**: `c976eea3c365b203c181fc0991b230f59e8cc03b`
- **Latest Commit Author**: `IndependentSalt69 <manavprasath03@gmail.com>`
- **Latest Commit Date**: `Fri Sep 4 11:32:03 2026 +0530`
- **Latest Commit Message**: `new 5 model script + updated gitignore`
- **Ahead / Behind**: 0 ahead, 0 behind origin

### 1.2 Tracked & Untracked Files
- **Modified Tracked Files**: None (`git status` reports clean working directory).
- **Untracked Files**: None.

### 1.3 Ignored-But-Present Relevant Files
The repository contains critical local assets that are git-ignored but active on disk:

| File / Directory Path | Size / Description | Relevance to 5-Class Migration |
|---|---|---|
| `.env` | 537 bytes | Contains live database connection strings (`POSTGRES_HOST`, `POSTGRES_PASSWORD`) pointing to Supabase pooler. |
| `dashboard/.env` | 31 bytes | Frontend environment configuration (`VITE_USE_MOCK_DATA=false`). |
| `models/production/best.pt` | 23,890,740 bytes | **CURRENT PRODUCTION WEIGHTS**: 4-class YOLOv8s-seg model (`waterlogging`, `pothole`, `drainage_overflow`, `damaged_footpath`). |
| `models/checkpoints/best.pt` | 23,890,740 bytes | Identical copy of 4-class model checkpoint. |
| `models/checkpoints/civicpulse_v1_5class/weights/best.pt` | 23,965,748 bytes | **NEW TRAINED 5-CLASS MODEL**: Weights from recent training on 5-class dataset. |
| `models/checkpoints/civicpulse_v1_5class/args.yaml` | 1,944 bytes | Training hyperparameters & metadata for 5-class run (trained on `civicpulse_yolo/data.yaml`). |
| `data_raw/` | Local directory | Training source datasets (ignored). |
| `outputs/evidence/*.jpg` | 15 JPEG images | Auto-captured evidence frames from test pipeline runs. |
| `outputs/jobs/` | Local directory | Asynchronous ML video processing job outputs. |
| `uploads/` | Local directory | User-uploaded video and SRT telemetry files. |
| `yolov8s-seg.pt` | 23,790,996 bytes | Pretrained base YOLOv8s segmentation checkpoint. |

### 1.4 Active Developer Context (Do Not Overwrite)
At the time of this audit, the developer's IDE active documents were:
- `scripts/train.py` (Line 67)
- `src/detection/runner.py`
- `requirements.txt`
- `.env`

---

## SECTION 2 — PROJECT STRUCTURE

Below is the verified inventory of all relevant source and configuration directories in `D:\Not-So-Smart_ELCIA`:

```text
D:\Not-So-Smart_ELCIA\
├── alembic\
│   ├── env.py
│   ├── README
│   ├── script.py.mako
│   └── versions\
│       ├── 20260821_001_initial_schema.py
│       └── 20260825_002_add_incident_types.py
├── alembic.ini
├── configs\
│   ├── config.yaml
│   └── custom_bytetrack.yaml
├── dashboard\
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── client\
│       ├── index.html
│       └── src\
│           ├── App.tsx
│           ├── const.ts
│           ├── main.tsx
│           ├── index.css
│           ├── components\
│           │   ├── CivicPulseDashboard.tsx
│           │   ├── Map.tsx
│           │   ├── analytics\AnalyticsDashboard.tsx
│           │   ├── common\ (PriorityBadge.tsx, StatusBadge.tsx, EmptyState.tsx)
│           │   ├── detail\ (IncidentDetailDrawer.tsx, EvidenceViewer.tsx, AssignmentSection.tsx, InspectionSection.tsx, SeverityExplainer.tsx, VerificationBar.tsx, IncidentStepper.tsx)
│           │   ├── incidents\ (IncidentCard.tsx, IncidentCardSkeleton.tsx, IncidentFilters.tsx, IncidentQueueView.tsx)
│           │   ├── ingestion\DroneIngestionStudio.tsx
│           │   ├── layout\Navbar.tsx
│           │   ├── map\IncidentMapView.tsx
│           │   ├── overview\ (KpiSummaryGrid.tsx, MiniMapWidget.tsx, OverviewTab.tsx, RecentAlertsFeed.tsx)
│           │   └── ui\ (43 Radix/Tailwind component primitives)
│           ├── contexts\ThemeContext.tsx
│           ├── data\mockIncidents.ts
│           ├── hooks\ (useAnalytics.ts, useIncidents.ts, useMobile.tsx, usePersistFn.ts, useComposition.ts)
│           ├── lib\ (stateMachine.ts, utils.ts)
│           ├── pages\ (Home.tsx, NotFound.tsx)
│           ├── services\
│           │   ├── analyticsService.ts
│           │   ├── api.ts
│           │   ├── incidentService.ts
│           │   ├── inferenceService.ts
│           │   └── processingService.ts
│           ├── types\
│           │   ├── analytics.ts
│           │   ├── incident.ts
│           │   └── ingestion.ts
│           └── __tests__\
│               ├── analyticsService.test.ts
│               ├── incidentFilters.test.ts
│               ├── incidentService.test.ts
│               ├── inferenceService.test.ts
│               └── stateMachine.test.ts
├── models\
│   ├── production\best.pt (4-class active)
│   ├── checkpoints\best.pt (4-class copy)
│   └── checkpoints\civicpulse_v1_5class\weights\best.pt (5-class new)
├── scripts\
│   ├── check_data.py
│   ├── generate_mock_srt.py
│   ├── gps_parser.py
│   ├── merge_all.py
│   ├── reset_db.py
│   ├── run_pipeline.py
│   ├── seed_database.py
│   ├── train.py
│   └── dev\ (test_depth.py, test_image.py, test_severity.py, test_video.py)
├── src\
│   ├── __init__.py
│   ├── api\
│   │   ├── dependencies.py
│   │   ├── main.py
│   │   └── routes\
│   │       ├── analytics.py
│   │       ├── health.py
│   │       ├── incidents.py
│   │       ├── processing.py
│   │       ├── users.py
│   │       └── zones.py
│   ├── core\
│   │   ├── classes.py
│   │   ├── config.py
│   │   └── spatial.py
│   ├── db\
│   │   ├── base.py
│   │   ├── session.py
│   │   └── models\
│   │       ├── assignment.py
│   │       ├── detection.py
│   │       ├── enums.py
│   │       ├── evidence.py
│   │       ├── history.py
│   │       ├── incident.py
│   │       ├── inspection.py
│   │       ├── user.py
│   │       └── zone.py
│   ├── detection\
│   │   ├── depth_estimator.py
│   │   ├── runner.py
│   │   ├── severity_analyzer.py
│   │   ├── video_tracker.py
│   │   └── yolo_segmentation.py
│   ├── repositories\
│   │   ├── analytics.py
│   │   ├── assignments.py
│   │   ├── detections.py
│   │   ├── evidence.py
│   │   ├── history.py
│   │   ├── incidents.py
│   │   ├── inspections.py
│   │   ├── users.py
│   │   └── zones.py
│   ├── schemas\
│   │   ├── analytics.py
│   │   ├── assignment.py
│   │   ├── detection.py
│   │   ├── evidence.py
│   │   ├── health.py
│   │   ├── history.py
│   │   ├── incident.py
│   │   ├── inspection.py
│   │   ├── processing.py
│   │   ├── user.py
│   │   └── zone.py
│   ├── services\
│   │   ├── ml_ingestion_service.py
│   │   └── processing_job_manager.py
│   ├── severity\
│   │   └── scoring_engine.py
│   └── tracking\
│       └── temporal_filter.py (0 bytes empty)
└── tests\
    ├── conftest.py
    ├── api\ (test_analytics.py, test_api.py, test_evidence_static.py, test_health.py, test_processing.py)
    ├── db\ (test_migrations.py, test_session.py)
    ├── detection\ (test_runner.py)
    ├── integration\ (test_e2e_suite.py, test_startup.py)
    ├── repositories\ (test_repositories.py)
    └── services\ (test_ml_ingestion.py)
```

---

## SECTION 3 — CURRENT ML CLASS CONTRACT

### 3.1 Component-by-Component Contract Comparison

#### A. Config Class Order (`configs/config.yaml`)
`configs/config.yaml` lines 18–44 define **5 classes**:
```yaml
classes:
  0:
    name: "damaged_footpath"
    conf: 0.20
    color: [0, 255, 0]
  1:
    name: "drainage_overflow"
    conf: 0.45
    color: [0, 255, 255]
  2:
    name: "open_manhole"
    conf: 0.35
    color: [200, 0, 200]
    min_hits: 3
    severity_multiplier: 1.3
  3:
    name: "pothole"
    conf: 0.20
    color: [40, 50, 230]
    needs_depth: true
    severity_multiplier: 1.1
  4:
    name: "waterlogging"
    conf: 0.52
    color: [235, 150, 50]
    min_hits: 5
    requires_smooth_surface: true
```
*Source: Config file.*

#### B. Actual Model Metadata
Model weights files were inspected directly via PyTorch checkpoint inspection:
1. `models/production/best.pt`:
   - `nc`: `4`
   - `names`: `{0: 'waterlogging', 1: 'pothole', 2: 'drainage_overflow', 3: 'damaged_footpath'}`
2. `models/checkpoints/best.pt`:
   - `nc`: `4`
   - `names`: `{0: 'waterlogging', 1: 'pothole', 2: 'drainage_overflow', 3: 'damaged_footpath'}`
3. `models/checkpoints/civicpulse_v1_5class/weights/best.pt`:
   - `nc`: `5`
   - `names`: `{0: 'damaged_footpath', 1: 'drainage_overflow', 2: 'open_manhole', 3: 'pothole', 4: 'waterlogging'}`

*Source: Model checkpoint binary metadata.*

#### C. Hardcoded Class Mappings in Source Code
1. `src/services/ml_ingestion_service.py` (lines 26–31):
   ```python
   CLASS_MAPPING: Dict[str, IncidentType] = {
       "waterlogging": IncidentType.WATERLOGGING,
       "pothole": IncidentType.POTHOLE,
       "drainage_overflow": IncidentType.DRAINAGE_OVERFLOW,
       "damaged_footpath": IncidentType.DAMAGED_FOOTPATH,
   }
   ```
2. `src/services/ml_ingestion_service.py` (lines 34–39):
   ```python
   RECOMMENDED_ACTIONS: Dict[IncidentType, str] = {
       IncidentType.WATERLOGGING: "Deploy high-capacity mobile dewatering pump to clear water accumulation.",
       IncidentType.POTHOLE: "Apply cold mix asphalt patch and set up warning cones.",
       IncidentType.DRAINAGE_OVERFLOW: "Deploy excavator to clear culvert silt and trash blockage.",
       IncidentType.DAMAGED_FOOTPATH: "Inspect footpath slab damage and install barrier tape.",
   }
   ```
3. `scripts/seed_database.py` (lines 491–496):
   ```python
   type_map = {
       "pothole": IncidentType.POTHOLE,
       "waterlogging": IncidentType.WATERLOGGING,
       "drainage_overflow": IncidentType.DRAINAGE_OVERFLOW,
       "damaged_footpath": IncidentType.DAMAGED_FOOTPATH
   }
   ```
4. `scripts/check_data.py` (lines 12–17):
   ```python
   classes = {
       0: ("Waterlogging", (255, 0, 0)),
       1: ("Pothole", (0, 0, 255)),
       2: ("Drainage", (0, 255, 255)),
       3: ("Footpath", (0, 255, 0))
   }
   ```
5. `scripts/merge_all.py` (lines 170–172):
   ```python
   nc: 4
   names: ['waterlogging', 'pothole', 'drainage_overflow', 'damaged_footpath']
   ```

*Source: Source code & scripts.*

#### D. Numeric ID Mappings
1. `src/core/classes.py` dynamically builds `CLASSES` and `BY_NAME` by reading `configs/config.yaml` (0 to 4).
2. `src/detection/yolo_segmentation.py`:
   - Line 34–36: `self.target_classes = target_classes if target_classes is not None else hazard_classes.names()`
   - Line 73–75:
     ```python
     cls_name = self.target_classes.get(
         cls_id, res.names.get(cls_id, f"class_{cls_id}")
     ).lower()
     ```

#### E. Class-Name Mappings
1. `dashboard/client/src/types/incident.ts`:
   - `mapBackendTypeToFrontend` (lines 20–33):
     `'WATERLOGGING' -> 'waterlogging'`, `'POTHOLE' -> 'pothole'`, `'DRAINAGE_OVERFLOW' -> 'drainage_overflow'`, `'DAMAGED_FOOTPATH' -> 'damaged_footpath'`, default `'pothole'`.
   - `mapFrontendTypeToBackend` (lines 35–48):
     `'waterlogging' -> 'WATERLOGGING'`, `'pothole' -> 'POTHOLE'`, `'drainage_overflow' -> 'DRAINAGE_OVERFLOW'`, `'damaged_footpath' -> 'DAMAGED_FOOTPATH'`, default `'POTHOLE'`.

### 3.2 CRITICAL DISAGREEMENT DISCOVERED (Silent Desynchronization Bug)
There is a severe divergence between `configs/config.yaml` and `models/production/best.pt`:
- In `configs/config.yaml`, ID `0` is `"damaged_footpath"`.
- In `models/production/best.pt`, ID `0` is `"waterlogging"`.
- In `src/detection/yolo_segmentation.py` line 73:
  `self.target_classes.get(cls_id, ...)` uses `self.target_classes`, which comes from `config.yaml`.
  Because `self.target_classes` has a key for `0`, it returns `"damaged_footpath"`.
- **Consequence**: Whenever the production model detects `waterlogging` (class 0), the detection pipeline silently relabels it as `"damaged_footpath"`! When it detects `pothole` (class 1), it relabels it as `"drainage_overflow"`. When it detects `drainage_overflow` (class 2), it relabels it as `"open_manhole"`. When it detects `damaged_footpath` (class 3), it relabels it as `"pothole"`.
- This occurred because `configs/config.yaml` was edited to 5 classes ahead of replacing `models/production/best.pt`.

---

## SECTION 4 — DATABASE MODEL CONTRACT

### 4.1 Python ORM Enum Definition
- **File**: `src/db/models/enums.py` (lines 15–19)
- **Code**:
  ```python
  class IncidentType(str, enum.Enum):
      WATERLOGGING = "WATERLOGGING"
      POTHOLE = "POTHOLE"
      DRAINAGE_OVERFLOW = "DRAINAGE_OVERFLOW"
      DAMAGED_FOOTPATH = "DAMAGED_FOOTPATH"
  ```
- **Values (Order)**:
  1. `WATERLOGGING`
  2. `POTHOLE`
  3. `DRAINAGE_OVERFLOW`
  4. `DAMAGED_FOOTPATH`
- `OPEN_MANHOLE` is **not present** in `IncidentType`.

### 4.2 SQLAlchemy Model Specification
- **File**: `src/db/models/incident.py` (lines 58–62)
- **Column Definition**:
  ```python
  incident_type: Mapped[IncidentType] = mapped_column(
      SQLEnum(IncidentType, native_enum=False, length=32),
      nullable=False,
      index=True,
  )
  ```
- **Type**: `SQLEnum(..., native_enum=False, length=32)`.
- **Underlying PostgreSQL Data Type**: `VARCHAR(32)` (`character varying`).

### 4.3 Database Schema & Columns Table
| Table Name | Column Name | Column Type | Nullable | Index | Foreign Key | Check Constraint |
|---|---|---|---|---|---|---|
| `incidents` | `incident_type` | `VARCHAR(32)` | `NO` | `ix_incidents_incident_type` | None | None in live DB |
| `detections` | `detection_type` | `VARCHAR(64)` | `NO` | `ix_detections_detection_type` | None | None |

*Note: `evidence.ix_evidence_incident_type` indexes `(incident_id, evidence_type)`, not incident hazard type.*

### 4.4 Live Database Table Verification (Supabase)
Direct query to the live PostgreSQL instance:
- `information_schema.columns`: Column `incidents.incident_type` is `character varying(32)`.
- `pg_type` check: Query `SELECT 1 FROM pg_type WHERE typname = 'incidenttype'` returned **0 rows** (no native PostgreSQL ENUM exists).
- `pg_constraint` check: Table `incidents` has constraints:
  - `chk_incident_confidence_range`: `confidence >= 0.0 AND confidence <= 1.0`
  - `chk_incident_severity_range`: `severity_score >= 0.0 AND severity_score <= 10.0`
  - `incidents_incident_code_key`: Unique `incident_code`
  - `incidents_pkey`: Primary key `id`
  - `incidents_zone_id_fkey`: Foreign key to `zones.id`
  - *No check constraint restricts the values of `incident_type` at the SQL level in the active database.*
- Existing row counts:
  - `WATERLOGGING`: 9
  - `POTHOLE`: 6
  - `DAMAGED_FOOTPATH`: 2
  - `DRAINAGE_OVERFLOW`: 2
  - **Total**: 19 active records.

---

## SECTION 5 — CURRENT ALEMBIC / DATABASE MIGRATION STATE

### 5.1 Configuration & Head
- **Configuration File**: `alembic.ini`
- **Environment Loader**: `alembic/env.py` (reads `src.core.config.settings.DATABASE_URL`)
- **Current Head**: `20260825_002`
- **Database `alembic_version` Table**: `[('20260825_002',)]`

### 5.2 Existing Migrations
1. `alembic/versions/20260821_001_initial_schema.py`:
   - Line 70: Created `incidents` table with `sa.Column("incident_type", sa.Enum("WATERLOGGING", "POTHOLE", "DRAINAGE_OVERFLOW", name="incidenttype", native_enum=False, length=32), nullable=False)`.
2. `alembic/versions/20260825_002_add_incident_types.py`:
   - Lines 28–46: Executed anonymous PL/pgSQL block:
     ```sql
     DO $$
     BEGIN
         IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incidenttype') THEN
             BEGIN
                 ALTER TYPE incidenttype ADD VALUE IF NOT EXISTS 'DRAINAGE_OVERFLOW';
             EXCEPTION WHEN duplicate_object THEN NULL; END;
             BEGIN
                 ALTER TYPE incidenttype ADD VALUE IF NOT EXISTS 'DAMAGED_FOOTPATH';
             EXCEPTION WHEN duplicate_object THEN NULL; END;
         END IF;
     END$$;
     ```

### 5.3 Migration Risks for Adding `OPEN_MANHOLE`
- **Risk Level**: **LOW**.
- Because the column was created with `native_enum=False`, PostgreSQL stores it as `VARCHAR(32)` without a native enum type in Supabase.
- An Alembic migration (`20260904_003_add_open_manhole.py`) must still be created to:
  1. Maintain version chain consistency (`down_revision = "20260825_002"`).
  2. Execute the defensive `ALTER TYPE incidenttype ADD VALUE IF NOT EXISTS 'OPEN_MANHOLE'` in case local development or staging instances use native enums.
  3. Keep the migration test (`tests/db/test_migrations.py`) passing.

---

## SECTION 6 — BACKEND INGESTION CONTRACT

### 6.1 Ingestion Pipeline Class Handling Table

| Location | Current Behavior | Current Class Assumptions | Relevant Lines |
|---|---|---|---|
| `src/services/ml_ingestion_service.py` | Defines canonical dictionary mapping raw ML class string to `IncidentType` enum | Exactly 4 classes: `waterlogging`, `pothole`, `drainage_overflow`, `damaged_footpath` | Lines 26–31 |
| `src/services/ml_ingestion_service.py` | Defines recommended action templates per incident type | Exactly 4 templates for 4 enum keys | Lines 34–39 |
| `src/services/ml_ingestion_service.py` | Validates `raw_class in CLASS_MAPPING`. Raises `ValueError` if unknown | Rejects any class outside the 4 canonical keys. **Throws error on `open_manhole`** | Lines 144–148 |
| `src/services/ml_ingestion_service.py` | Creates `Incident` record | Assigns `incident_type = CLASS_MAPPING[raw_class]` | Lines 174–186 |
| `src/services/ml_ingestion_service.py` | Creates `Detection` record | Stores `detection_type = raw_class` (as `str`) | Lines 190–207 |
| `src/services/processing_job_manager.py` | Subprocess ML execution | Launches `src.detection.runner` via `sys.executable` | Lines 195–205 |
| `src/services/processing_job_manager.py` | Post-ML database ingestion trigger | Calls `ingest_job_results(...)` within session | Lines 298–332 |
| `src/schemas/processing.py` | Pydantic response models | Agnostic to specific class names (uses `class_counts: Dict[str, int]`) | Lines 12–38 |
| `src/schemas/detection.py` | Detection serialization schema | `detection_type: str = Field(..., max_length=64)` | Lines 15–20 |
| `src/schemas/incident.py` | Incident serialization schema | `incident_type: IncidentType` validated against enum | Lines 17, 35 |

---

## SECTION 7 — BACKEND ANALYTICS CONTRACT

### 7.1 Analytics Schemas (`src/schemas/analytics.py`)
- `AnalyticsTrendItem` (lines 55–67):
  ```python
  class AnalyticsTrendItem(BaseModel):
      date: str
      waterlogging: int = Field(default=0, ge=0)
      potholes: int = Field(default=0, ge=0)
      drainage_overflow: int = Field(default=0, ge=0)
      damaged_footpath: int = Field(default=0, ge=0)
      rainfall_mm: Optional[float] = None
  ```
  *Notice: `open_manhole` is absent.*
- `AnalyticsKPI` (lines 27–45):
  - `pothole_clusters_count: int`: Specific hardcoded KPI for pothole incidents.
  - `waterlogged_area_sqm: Optional[float]`: Specific KPI placeholder for waterlogging.

### 7.2 Analytics Repository (`src/repositories/analytics.py`)
- `get_analytics_summary` (line 36):
  ```python
  func.count(case((Incident.incident_type == IncidentType.POTHOLE, 1))).label("pothole_clusters_count")
  ```
- `get_analytics_trends` (lines 97–100):
  ```python
  func.count(case((Incident.incident_type == IncidentType.WATERLOGGING, 1))).label("waterlogging"),
  func.count(case((Incident.incident_type == IncidentType.POTHOLE, 1))).label("potholes"),
  func.count(case((Incident.incident_type == IncidentType.DRAINAGE_OVERFLOW, 1))).label("drainage_overflow"),
  func.count(case((Incident.incident_type == IncidentType.DAMAGED_FOOTPATH, 1))).label("damaged_footpath"),
  ```
- Trend dictionary assembly (lines 112–117 & 125–129 & 134–137):
  Hardcodes dictionary keys for `waterlogging`, `potholes`, `drainage_overflow`, `damaged_footpath`.
- **Requirement for 5-class migration**:
  - Add `open_manhole: int = Field(default=0, ge=0)` to `AnalyticsTrendItem`.
  - Add `func.count(case((Incident.incident_type == IncidentType.OPEN_MANHOLE, 1))).label("open_manhole")` to `get_analytics_trends`.
  - Update dictionary packing in `get_analytics_trends`.

---

## SECTION 8 — BACKEND API CONTRACT

### 8.1 Routes & Serialization
- **Route Definitions**: `src/api/routes/incidents.py`
  - `POST /api/v1/incidents/`: Accepts `IncidentCreate` (line 62).
  - `GET /api/v1/incidents/`: Accepts filter `incident_type: Optional[IncidentType] = Query(None)` (line 108).
  - `PATCH /api/v1/incidents/{incident_id}`: Accepts `IncidentUpdate` (line 34 in schema).
- **FastAPI / Pydantic Validation**:
  Because `incident_type` uses `IncidentType(str, Enum)`, FastAPI automatically restricts input to:
  `["WATERLOGGING", "POTHOLE", "DRAINAGE_OVERFLOW", "DAMAGED_FOOTPATH"]`.
- Sending `incident_type="OPEN_MANHOLE"` currently returns:
  **HTTP 422 Unprocessable Entity**.

### 8.2 Current Example API Payloads

#### Creation Request (`POST /api/v1/incidents/`)
```json
{
  "incident_code": "INC-TEST-001",
  "incident_type": "WATERLOGGING",
  "confidence": 0.95,
  "severity_score": 8.5,
  "priority": "P1",
  "zone_id": "820d5447-eb9f-4264-9e66-995fd147d6a7",
  "status": "DETECTED",
  "recommended_action": "Deploy dewatering pump"
}
```

#### Incident Item Response (`GET /api/v1/incidents/{id}`)
```json
{
  "id": "820d5447-eb9f-4264-9e66-995fd147d6a7",
  "incident_code": "INC-TEST-001",
  "incident_type": "WATERLOGGING",
  "confidence": 0.95,
  "severity_score": 8.5,
  "priority": "P1",
  "zone_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "DETECTED",
  "recommended_action": "Deploy dewatering pump",
  "created_at": "2026-09-04T07:00:00Z",
  "updated_at": "2026-09-04T07:00:00Z"
}
```

---

## SECTION 9 — FRONTEND TYPE CONTRACT

### 9.1 `dashboard/client/src/types/incident.ts`
- **Frontend Union** (lines 1–5):
  ```typescript
  export type IncidentType =
    | 'waterlogging'
    | 'pothole'
    | 'drainage_overflow'
    | 'damaged_footpath';
  ```
- **Backend Union** (lines 7–11):
  ```typescript
  export type BackendIncidentType =
    | 'WATERLOGGING'
    | 'POTHOLE'
    | 'DRAINAGE_OVERFLOW'
    | 'DAMAGED_FOOTPATH';
  ```
- **Labels Mapping** (lines 13–18):
  ```typescript
  export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
    waterlogging: 'Waterlogging',
    pothole: 'Pothole',
    drainage_overflow: 'Drainage Overflow',
    damaged_footpath: 'Damaged Footpath',
  };
  ```
- **Mapping Functions & Fallbacks** (lines 20–48):
  - `mapBackendTypeToFrontend`: Converts backend string to frontend lowercase. If unmapped, defaults to `'pothole'`.
  - `mapFrontendTypeToBackend`: Converts frontend string to backend uppercase. If unmapped, defaults to `'POTHOLE'`.

### 9.2 `dashboard/client/src/types/analytics.ts`
- **Trend Points** (lines 14–21 & 90–97):
  Both `TrendDataPoint` and `BackendAnalyticsTrendItem` define:
  ```typescript
  waterlogging: number;
  potholes: number;
  drainage_overflow: number;
  damaged_footpath: number;
  ```
  Neither interface contains `open_manhole`.

### 9.3 `dashboard/client/src/types/ingestion.ts`
- Line 19: `DetectedBoundingBox.label`: `IncidentType | 'clear'`
- Line 36: `InferenceResult.type`: `IncidentType | 'clear'`
- Line 55: `SampleFootagePreset.type`: `IncidentType | 'clear'`

---

## SECTION 10 — FRONTEND SERVICE CONTRACT

### 10.1 `incidentService.ts`
- Line 249–255: Fallback recommendation logic:
  ```typescript
  recommendedAction:
    item.recommended_action ||
    (type === 'waterlogging'
      ? 'Deploy high-capacity mobile de-watering sump pumps & unblock storm drain grates'
      : type === 'drainage_overflow'
        ? 'Dispatch high-pressure drain jetting team & clear storm culvert obstruction'
        : type === 'damaged_footpath'
          ? 'Dispatch civil masonry repair crew & install temporary pedestrian safety barriers'
          : 'Deploy Cold-Mix Bitumen Patching & Place High-Visibility Hazard Barricades')
  ```
  *Fallback assumes anything not waterlogging/drainage/footpath is a pothole.*
- Lines 338–339: Check for seeding:
  `const hasPothole = items.some((i) => i.incident_type?.toUpperCase() === 'POTHOLE');`

### 10.2 `analyticsService.ts`
- Lines 93–100: Maps raw backend trends response into frontend `TrendDataPoint[]`.
- Lines 113–123: Computes `typeDistribution` by reducing trend counts for only the 4 classes:
  ```typescript
  const typeDistribution = [
    { type: 'waterlogging' as const, name: 'Waterlogging', count: waterloggingCount, color: '#0d9488' },
    { type: 'pothole' as const, name: 'Potholes', count: potholesCount, color: '#f59e0b' },
    { type: 'damaged_footpath' as const, name: 'Damaged Footpath', count: damagedFootpathCount, color: '#f97316' },
    { type: 'drainage_overflow' as const, name: 'Drainage Overflow', count: drainageOverflowCount, color: '#06b6d4' },
  ];
  ```

### 10.3 `inferenceService.ts`
- Lines 11–36: Defines simulated SVG overlays for only 4 classes:
  `isWater`, `isPothole`, `isDrainage`, `isFootpath`.
- Lines 78–210: 4 presets:
  1. `preset-water-1` (`type: 'waterlogging'`)
  2. `preset-pothole-1` (`type: 'pothole'`)
  3. `preset-drainage-1` (`type: 'drainage_overflow'`)
  4. `preset-footpath-1` (`type: 'damaged_footpath'`)
- Lines 304–395: Multi-stage simulated inference branching on the 4 classes.

---

## SECTION 11 — FRONTEND UI CLASS REFERENCES

Below is the exhaustive table of all class references found across UI components in `dashboard/client/src/`:

| File | Line | Class Reference | Purpose |
|---|---|---|---|
| `components/analytics/AnalyticsDashboard.tsx` | 237–240 | `Waterlogging`, `Potholes` | Legend text labels in trend chart |
| `components/analytics/AnalyticsDashboard.tsx` | 276–279 | `waterlogging`, `potholes`, `drainage_overflow`, `damaged_footpath` | Recharts `<Area>` data keys and gradients |
| `components/detail/AssignmentSection.tsx` | 16 | `incident.type === 'waterlogging'` | Conditional selection of emergency dewatering vs road crew |
| `components/detail/EvidenceViewer.tsx` | 148, 391–401 | `waterlogging`, `drainage_overflow`, `damaged_footpath` | Optical overlay rendering & class-specific icon selection |
| `components/detail/IncidentDetailDrawer.tsx` | 52–56 | `waterlogging`, `drainage_overflow`, `damaged_footpath` | Drawer header badge icon & color coding |
| `components/incidents/IncidentCard.tsx` | 19–25 | Switch on `waterlogging`, `drainage_overflow`, `damaged_footpath`, `pothole` | Card icon rendering & border accent colors |
| `components/incidents/IncidentFilters.tsx` | 149–152 | Filter items for `waterlogging`, `pothole`, `drainage_overflow`, `damaged_footpath` | Category filter bar chips |
| `components/ingestion/DroneIngestionStudio.tsx` | 243 | `default = 'waterlogging'` | Default preset type |
| `components/ingestion/DroneIngestionStudio.tsx` | 313 | Text description of detectable hazards | Subtitle text explaining supported hazards |
| `components/ingestion/DroneIngestionStudio.tsx` | 356–373 | `preset.type === 'waterlogging'` / `drainage_overflow` / `damaged_footpath` / `pothole` | Preset selection button styling & badge icons |
| `components/ingestion/DroneIngestionStudio.tsx` | 745–765 | Summary cards: `waterlogging`, `pothole`, `drainage_overflow`, `damaged_footpath` | Ingestion job completion result breakdown grid |
| `components/ingestion/DroneIngestionStudio.tsx` | 872–905 | Post-analysis result badge and title | Live preview hazard title display |
| `components/map/IncidentMapView.tsx` | 420–424 | `incident.type === 'waterlogging'` / `drainage_overflow` / `damaged_footpath` | Map infowindow header icon selection |
| `components/overview/KpiSummaryGrid.tsx` | 42, 63, 75 | `waterlogging`, `potholes` | Quick-filter KPI card triggers |
| `components/overview/OverviewTab.tsx` | 57 | Text mentioning waterlogging and potholes | Operational narrative hero text |
| `components/overview/RecentAlertsFeed.tsx` | 37–55 | Switch on `waterlogging`, `drainage_overflow`, `damaged_footpath`, `pothole` | Feed alert item icon rendering |
| `data/mockIncidents.ts` | 8–37, 71–600 | 4 classes across all 10 mock incidents | Development and demonstration fixture data |

---

## SECTION 12 — TEST CONTRACT

### 12.1 Backend Tests (`tests/`)

| Test File | Current Status | Current Class Assumptions | Needs Change for 5-Class? |
|---|---|---|---|
| `tests/api/test_analytics.py` | PASS (64/64) | Line 36: verifies `pothole_clusters_count`. Line 84: tests `IncidentType.WATERLOGGING` and `POTHOLE`. | YES: Add tests for `open_manhole` trend counts |
| `tests/api/test_api.py` | PASS | Line 104: tests incident filtering with enum validation | NO (general) |
| `tests/api/test_processing.py` | PASS | Tests ML job runner lifecycle | NO |
| `tests/db/test_migrations.py` | PASS | Tests migrations `20260821_001` and `20260825_002` | YES: Update expected migration head to `20260904_003` |
| `tests/detection/test_runner.py` | PASS | Tests CLI validation for `src.detection.runner` | NO |
| `tests/integration/test_e2e_suite.py` | PASS | Lines 172, 204, 378: tests CRUD for `WATERLOGGING` and `POTHOLE` | NO (can add `OPEN_MANHOLE`) |
| `tests/repositories/test_repositories.py` | PASS | Lines 413–416: iterates over 4 `IncidentType` values: `WATERLOGGING`, `POTHOLE`, `DRAINAGE_OVERFLOW`, `DAMAGED_FOOTPATH` | YES: Add `IncidentType.OPEN_MANHOLE` to mapping test |
| `tests/services/test_ml_ingestion.py` | PASS | Lines 77–157: explicitly tests 4 hazards and asserts `total_hazards == 4` | YES: Add 5th hazard `open_manhole` and assert 5 |

### 12.2 Frontend Tests (`dashboard/client/src/__tests__/`)

| Test File | Current Status | Current Class Assumptions | Needs Change for 5-Class? |
|---|---|---|---|
| `__tests__/analyticsService.test.ts` | PASS (31/31) | Lines 40–51: mock trends with 4 classes. Lines 81–91: asserts `typeDistribution` has 4 entries | YES: Update mock & assert 5th category |
| `__tests__/incidentFilters.test.ts` | PASS | Lines 10–17: tests filter by `waterlogging` and `pothole` | NO |
| `__tests__/incidentService.test.ts` | PASS | Lines 17–21: tests fetching `waterlogging` and `pothole` | NO |
| `__tests__/inferenceService.test.ts` | PASS | Lines 14–19: finds presets for `waterlogging` and `pothole` | NO (optional: test manhole preset) |
| `__tests__/stateMachine.test.ts` | PASS | Tests status transitions (`DETECTED` -> `VERIFIED`) | NO |

---

## SECTION 13 — SCRIPTS / UTILITIES

| Script File | Purpose | Class Assumptions | Migration Impact |
|---|---|---|---|
| `scripts/train.py` | Trains YOLOv8-seg model | Line 13: Points to 5-class `data.yaml`. Line 36: `name="civicpulse_v1_5class"`. Commented block has old 4-class path. | Already configured for 5 classes |
| `scripts/check_data.py` | Visual inspection of dataset | Lines 12–17: Hardcodes 4 classes (`Waterlogging`, `Pothole`, `Drainage`, `Footpath`). | Needs update to 5 classes if used |
| `scripts/seed_database.py` | Development database seeder | Lines 491–496: `type_map` only maps 4 classes. | Must add `"open_manhole": IncidentType.OPEN_MANHOLE` |
| `scripts/merge_all.py` | Merges raw datasets into YOLO format | Lines 170–172: Exports `nc: 4`, `names: ['waterlogging', 'pothole', 'drainage_overflow', 'damaged_footpath']`. | Historical 4-class merge script |
| `scripts/run_pipeline.py` | Local pipeline runner | Line 27: Loads `models/production/best.pt`. | None (runs whatever weights are at path) |
| `scripts/reset_db.py` | Drops public schema & recreates PostGIS | Destructive reset script. | **DO NOT RUN** |

---

## SECTION 14 — DOCUMENTATION DRIFT

### 14.1 Documentation Reality vs Code Reality
- **Root `README.md`**:
  - Line 52–56 states:
    > "4 Canonical Civic Hazard Classes: 1. Waterlogging, 2. Potholes, 3. Damaged Footpath, 4. Drainage Overflow"
  - Line 230 states:
    > "7-day daily issue counts for Waterlogging, Potholes, Damaged Footpath, and Drainage Overflow."
- **`docs/README.md`**:
  - Mentions `archive/` logs from hackathon build.
- **Code Reality**:
  - `configs/config.yaml` already has **5 classes** (`damaged_footpath`, `drainage_overflow`, `open_manhole`, `pothole`, `waterlogging`).
  - `models/checkpoints/civicpulse_v1_5class/weights/best.pt` has **5 classes**.
  - But `src/db/models/enums.py`, `src/services/ml_ingestion_service.py`, `dashboard/client/src/types/`, and `models/production/best.pt` remain on **4 classes**.

---

## SECTION 15 — CURRENT DATABASE / SUPABASE STATE

- **Connection Verification**: Successfully connected via `postgresql+psycopg` to `aws-0-ap-south-1.pooler.supabase.com:5432/postgres`.
- **Active Alembic Revision**: `20260825_002`.
- **Native Enum Check**: `SELECT t.typname FROM pg_type t WHERE t.typname = 'incidenttype'` returns **0 rows**.
- **Column Definition**: `incidents.incident_type` is PostgreSQL `character varying(32)` (`VARCHAR(32)`).
- **PostGIS Version**: `3.3 USE_GEOS=1 USE_PROJ=1 USE_STATS=1`.
- **Existing Incidents Data Count**:
  - `WATERLOGGING`: 9 rows
  - `POTHOLE`: 6 rows
  - `DAMAGED_FOOTPATH`: 2 rows
  - `DRAINAGE_OVERFLOW`: 2 rows
  - **Total**: 19 records currently stored in Supabase.
- **Data Integrity Safety**: All existing records use string values that map directly to the canonical uppercase incident types. Adding `OPEN_MANHOLE` will not invalidate or require rewriting existing rows.

---

## SECTION 16 — CLASS CONTRACT MASTER MATRIX

| Layer | Class Source | Current Order / Values | 0 | 1 | 2 | 3 | 4 | Needs Change? |
|---|---|---|---|---|---|---|---|---|
| **ML Config** | `configs/config.yaml` | 5 classes | `damaged_footpath` | `drainage_overflow` | `open_manhole` | `pothole` | `waterlogging` | **NO** (already 5-class target) |
| **Active Prod Model** | `models/production/best.pt` | 4 classes | `waterlogging` | `pothole` | `drainage_overflow` | `damaged_footpath` | *(none)* | **YES** (replace with 5-class weights) |
| **New Checkpoint** | `models/checkpoints/civicpulse_v1_5class/` | 5 classes | `damaged_footpath` | `drainage_overflow` | `open_manhole` | `pothole` | `waterlogging` | **NO** (is the new weights source) |
| **Core Classes** | `src/core/classes.py` | Dynamic from config | `damaged_footpath` | `drainage_overflow` | `open_manhole` | `pothole` | `waterlogging` | **NO** (reads config.yaml) |
| **Detection Pipeline** | `src/detection/yolo_segmentation.py` | Uses `classes.names()` | *(maps via config.yaml)* | *(maps via config.yaml)* | *(maps via config.yaml)* | *(maps via config.yaml)* | *(maps via config.yaml)* | **NO** (will work once weights are updated) |
| **Scoring Engine** | `src/severity/scoring_engine.py` | Uses `classes.get()` | Has `severity_multiplier` for `open_manhole` (1.3) | — | — | — | — | **NO** (already supports open_manhole) |
| **DB Enum** | `src/db/models/enums.py` | 4 enum members | `WATERLOGGING` | `POTHOLE` | `DRAINAGE_OVERFLOW` | `DAMAGED_FOOTPATH` | *(missing)* | **YES** (add `OPEN_MANHOLE = "OPEN_MANHOLE"`) |
| **Alembic Migrations** | `alembic/versions/` | Head: `20260825_002` | 4 classes | — | — | — | — | **YES** (add migration `20260904_003`) |
| **Ingestion Mapping** | `src/services/ml_ingestion_service.py` | 4 classes in dict | `waterlogging` | `pothole` | `drainage_overflow` | `damaged_footpath` | *(missing)* | **YES** (add `open_manhole` & action template) |
| **Backend Analytics** | `src/schemas/analytics.py` & repo | 4 trend fields | `waterlogging` | `potholes` | `drainage_overflow` | `damaged_footpath` | *(missing)* | **YES** (add `open_manhole` field & SQL count) |
| **Backend API** | `src/api/routes/incidents.py` | Enforces `IncidentType` | Rejects `OPEN_MANHOLE` | — | — | — | — | **NO** (auto-updates with `enums.py`) |
| **Frontend Types** | `dashboard/client/src/types/incident.ts` | 4 string union | `waterlogging` | `pothole` | `drainage_overflow` | `damaged_footpath` | *(missing)* | **YES** (add `open_manhole` & mappings) |
| **Frontend Analytics Types** | `dashboard/client/src/types/analytics.ts` | 4 trend fields | `waterlogging` | `potholes` | `drainage_overflow` | `damaged_footpath` | *(missing)* | **YES** (add `open_manhole: number`) |
| **Frontend Services** | `dashboard/client/src/services/*.ts` | 4-class assumptions | 4 classes in `analyticsService` & `inferenceService` | — | — | — | — | **YES** (add manhole handling & preset) |
| **Frontend UI** | `dashboard/client/src/components/` | 4 classes in cards/filters | 4 filter chips, 4 badge switches | — | — | — | — | **YES** (add icon, filter chip, badge, colors) |
| **Backend Tests** | `tests/services/test_ml_ingestion.py` | 4-hazard fixture | Asserts 4 hazards | — | — | — | — | **YES** (update fixtures to 5 classes) |
| **Frontend Tests** | `dashboard/client/src/__tests__/` | 4-class mocks | Asserts 4 typeDistribution entries | — | — | — | — | **YES** (update mocks to 5 classes) |
| **Documentation** | `README.md` | 4 canonical classes | Documented 4 classes | — | — | — | — | **YES** (update docs to 5 classes) |

---

## SECTION 17 — MIGRATION RISK ANALYSIS

1. **Highest-Risk File**:
   - `src/services/ml_ingestion_service.py`: Line 146 throws a fatal `ValueError` if a hazard class is not in `CLASS_MAPPING`. If a 5-class model emits `open_manhole` before this file is updated, all video ingestion jobs will immediately fail!
2. **Files Where Numeric Class IDs Matter**:
   - `configs/config.yaml`
   - `src/core/classes.py`
   - `models/production/best.pt`
   - `models/checkpoints/civicpulse_v1_5class/weights/best.pt`
   - `scripts/train.py`
   *(Nowhere in the database or REST API do numeric IDs exist; the API and database are strictly string-based).*
3. **Files Where Semantic Names Matter**:
   - `src/services/ml_ingestion_service.py` (`CLASS_MAPPING`)
   - `dashboard/client/src/types/incident.ts` (`IncidentType`, `BackendIncidentType`)
   - `src/schemas/analytics.py` (`AnalyticsTrendItem`)
   - `src/repositories/analytics.py` (`counts_by_date`)
   - `dashboard/client/src/services/analyticsService.ts` (`TrendDataPoint`)
4. **Files Where Enum Values Matter**:
   - `src/db/models/enums.py` (`IncidentType`)
   - `src/db/models/incident.py`
   - `alembic/versions/`
5. **Files Where Analytics Field Additions Are Needed**:
   - `src/schemas/analytics.py`: Add `open_manhole: int = Field(default=0, ge=0)`.
   - `src/repositories/analytics.py`: Add SQL case expression and dictionary field.
   - `dashboard/client/src/types/analytics.ts`: Add `open_manhole: number`.
   - `dashboard/client/src/services/analyticsService.ts`: Add `open_manhole` to trend mapping and `typeDistribution`.
   - `dashboard/client/src/components/analytics/AnalyticsDashboard.tsx`: Add Recharts `<Area>` for Open Manhole.
6. **Files Where `OPEN_MANHOLE` Needs New Behavior/Action**:
   - `src/services/ml_ingestion_service.py`: `RECOMMENDED_ACTIONS[IncidentType.OPEN_MANHOLE] = "Install immediate high-visibility barricade and dispatch sewer maintenance crew to replace manhole lid."`
   - `dashboard/client/src/services/incidentService.ts`: Add recommended action fallback branch.
   - `src/severity/scoring_engine.py`: Already has `severity_multiplier: 1.3` for `open_manhole` in `config.yaml`.
7. **Places Where Changing Class Order Could Silently Break Existing Behavior**:
   - Currently already broken between `models/production/best.pt` (where 0 is waterlogging) and `configs/config.yaml` (where 0 is damaged_footpath). Promoting the newly trained 5-class model to `models/production/best.pt` will restore perfect alignment with `configs/config.yaml`.
8. **Places Where Old Data Could Be Incompatible**:
   - Old DB records have `WATERLOGGING`, `POTHOLE`, `DRAINAGE_OVERFLOW`, `DAMAGED_FOOTPATH`. Because `OPEN_MANHOLE` is an additive enum member, 0 existing rows will be corrupted or invalidated.
9. **Places Where Model / Config Mismatch Could Occur**:
   - If `models/production/best.pt` is updated WITHOUT updating `ml_ingestion_service.py`, ingestion crashes on manhole detections.
   - If `src/db/models/enums.py` is updated WITHOUT updating `dashboard/client/src/types/incident.ts`, the frontend maps `OPEN_MANHOLE` to `'pothole'` via fallback.

---

## SECTION 18 — RECOMMENDED CHANGE ORDER

When migrating the codebase from 4 to 5 classes, follow this strict dependency-ordered sequence:

1. **Step 1: Backend Database Enum & ORM Model**
   - File: `src/db/models/enums.py`
   - Add `OPEN_MANHOLE = "OPEN_MANHOLE"`.
2. **Step 2: Alembic Database Migration**
   - File: `alembic/versions/20260904_003_add_open_manhole.py`
   - Down revision: `20260825_002`.
   - Adds `OPEN_MANHOLE` to `pg_type incidenttype` if native enum is present.
3. **Step 3: Backend Ingestion Contract**
   - File: `src/services/ml_ingestion_service.py`
   - Add `"open_manhole": IncidentType.OPEN_MANHOLE` to `CLASS_MAPPING`.
   - Add action template for `IncidentType.OPEN_MANHOLE` in `RECOMMENDED_ACTIONS`.
4. **Step 4: Backend Analytics Contract**
   - File: `src/schemas/analytics.py` (add `open_manhole` to `AnalyticsTrendItem`).
   - File: `src/repositories/analytics.py` (add SQL aggregation and dictionary packing for `open_manhole`).
5. **Step 5: Production Model Weights Replacement**
   - Copy `models/checkpoints/civicpulse_v1_5class/weights/best.pt` $\rightarrow$ `models/production/best.pt`.
   - Resolves the index desynchronization between model and `configs/config.yaml`.
6. **Step 6: Backend Tests**
   - Files: `tests/services/test_ml_ingestion.py`, `tests/api/test_analytics.py`, `tests/repositories/test_repositories.py`, `tests/db/test_migrations.py`.
   - Add 5-class assertions and verify 64/64+ tests pass.
7. **Step 7: Frontend Types Contract**
   - File: `dashboard/client/src/types/incident.ts` (add `'open_manhole'` and `'OPEN_MANHOLE'`, update mapping functions and labels).
   - File: `dashboard/client/src/types/analytics.ts` (add `open_manhole: number`).
8. **Step 8: Frontend Services**
   - File: `dashboard/client/src/services/incidentService.ts` (add fallback recommended action).
   - File: `dashboard/client/src/services/analyticsService.ts` (add `open_manhole` to trends and `typeDistribution`).
   - File: `dashboard/client/src/services/inferenceService.ts` (add SVG overlay preset for Open Manhole).
9. **Step 9: Frontend UI Components**
   - Files: `IncidentCard.tsx`, `IncidentFilters.tsx`, `IncidentDetailDrawer.tsx`, `EvidenceViewer.tsx`, `DroneIngestionStudio.tsx`, `IncidentMapView.tsx`, `AnalyticsDashboard.tsx`, `mockIncidents.ts`.
   - Add Open Manhole icon, color palette (Purple/Violet `#a855f7`), filter chip, and chart series.
10. **Step 10: Frontend Tests & Typecheck**
    - Run `npm run check` and `npx vitest run` in `dashboard/`.
11. **Step 11: Scripts & Documentation**
    - Files: `scripts/seed_database.py`, `scripts/check_data.py`, `README.md`.
    - Update documentation to reflect the 5 canonical classes.

---

## SECTION 19 — DO NOT TOUCH LIST

The following files should not be modified or overwritten carelessly:

1. **`configs/config.yaml`**: Already contains the exact target 5-class contract (`0: damaged_footpath`, `1: drainage_overflow`, `2: open_manhole`, `3: pothole`, `4: waterlogging`). Do not modify or revert.
2. **`scripts/train.py`**: Active in developer's IDE with specific training parameters for the 5-class dataset.
3. **`scripts/reset_db.py`**: Destructive script that drops PostgreSQL public schema. Never execute during migration.
4. **`.env` and `dashboard/.env`**: Contain live operational secrets and Supabase connection credentials.
5. **Existing Incidents Data in Supabase**: 19 active incidents (`WATERLOGGING`, `POTHOLE`, `DRAINAGE_OVERFLOW`, `DAMAGED_FOOTPATH`) must remain untouched and intact.

---

## SECTION 20 — FINAL EXECUTIVE SUMMARY

### CURRENT REAL STATE
The CivicPulse codebase is currently in a **partially transitioned, split contract state**:
- **ML Configuration**: `configs/config.yaml` and `src/core/classes.py` already define **5 classes** (`0: damaged_footpath`, `1: drainage_overflow`, `2: open_manhole`, `3: pothole`, `4: waterlogging`).
- **Trained Model Checkpoint**: A newly trained 5-class model exists at `models/checkpoints/civicpulse_v1_5class/weights/best.pt`.
- **Active Production Model**: `models/production/best.pt` is still the legacy **4-class model** (`0: waterlogging`, `1: pothole`, `2: drainage_overflow`, `3: damaged_footpath`).
- **Database & Backend API**: `src/db/models/enums.py`, `src/services/ml_ingestion_service.py`, and `src/schemas/analytics.py` only recognize **4 classes** and will reject `OPEN_MANHOLE`.
- **Frontend Dashboard**: All TypeScript types, services, filters, cards, and analytics charts only support **4 classes**, with fallbacks defaulting unmapped types to `'pothole'`.

### TARGET STATE
A unified, end-to-end 5-class contract across ML, backend, database, API, frontend, and tests:
- `0`: `damaged_footpath`
- `1`: `drainage_overflow`
- `2`: `open_manhole`
- `3`: `pothole`
- `4`: `waterlogging`

### GAP
1. **Model Weights**: `models/production/best.pt` is 4-class and misaligned with `configs/config.yaml`.
2. **Backend Enum**: `IncidentType` in `src/db/models/enums.py` lacks `OPEN_MANHOLE`.
3. **Alembic**: Migration chain lacks revision `20260904_003` for `OPEN_MANHOLE`.
4. **Ingestion Service**: `CLASS_MAPPING` and `RECOMMENDED_ACTIONS` in `ml_ingestion_service.py` lack `open_manhole`.
5. **Analytics**: `AnalyticsTrendItem` schema, SQL aggregation in `repositories/analytics.py`, and Recharts frontend lack `open_manhole`.
6. **Frontend Types & UI**: `IncidentType`, mapping helpers, filter chips, cards, drawer, and SVG overlays in `dashboard/client/src/` lack `open_manhole`.
7. **Test Fixtures**: Both backend `test_ml_ingestion.py` and frontend `analyticsService.test.ts` assert 4 hazards.

### FIRST FILE TO MODIFY
**`src/db/models/enums.py`**
- **Why**: `IncidentType` is the foundational root type for the backend. Updating `IncidentType` to include `OPEN_MANHOLE = "OPEN_MANHOLE"` immediately unblocks the Alembic migration script, allows Pydantic schemas in `incident.py` and `analytics.py` to validate `OPEN_MANHOLE`, and enables `ml_ingestion_service.py` to map the new class safely without type errors.
