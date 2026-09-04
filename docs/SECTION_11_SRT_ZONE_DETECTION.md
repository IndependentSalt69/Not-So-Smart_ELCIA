# Section 11: SRT-Based Automatic Surveillance Zone Detection

## 1. Overview & Architecture

CivicPulse Section 11 introduces **SRT-Based Automatic Surveillance Zone Detection** for the Drone Ingestion workflow. When an operator uploads drone footage (`video.mp4`) along with DJI flight telemetry (`flight.srt`), the system parses GPS coordinates from the telemetry track and performs spatial containment checks against all configured surveillance zone polygons.

### Key Objectives Achieved:
1. **Automatic Detection**: Telemetry points are extracted and matched against PostGIS zone polygons using Shapely spatial containment (`covers` / `contains`).
2. **Multi-Zone Dominance**: When flight paths cross multiple surveillance boundaries, the system calculates point distribution percentages, selects the dominant zone, and alerts the operator.
3. **Operator Override First**: Operators can manually select or change any zone at any point. Manual selection takes absolute priority and is never overwritten.
4. **Graceful Fallbacks**: If SRT is absent, malformed, or out of bounds, the workflow falls back cleanly to manual selection without interrupting video processing.
5. **Full Pipeline Integration**: The effective `zone_id` is passed seamlessly into `POST /api/v1/process` for real ML execution and database ingestion.

---

## 2. Backend Implementation

### A. Telemetry Parsing (`src/core/spatial.py`)
- Added `parse_srt_gps_points(srt_content: str) -> List[Tuple[float, float]]`.
- Supports standard DJI modern bracketed format:
  ```text
  [latitude: 12.845600] [longitude: 77.663200] [altitude: 45.200]
  ```
  as well as legacy DJI formats:
  ```text
  GPS(12.845600, 77.663200, 45.2)
  ```
- Coordinates are validated and returned as `(longitude, latitude)` tuples for standard GeoJSON / PostGIS SRID 4326 compliance.

### B. Spatial Zone Matching (`src/repositories/zones.py`)
- Implemented `resolve_zone_from_telemetry(db: Session, srt_content: Optional[str] = None, points: Optional[List[Tuple[float, float]]] = None) -> Dict[str, Any]`.
- Converts GeoAlchemy2 zone geometry to Shapely `Polygon` / `MultiPolygon`.
- Evaluates point containment:
  - If single zone matched $\rightarrow$ `status: "AUTO_DETECTED"`, confidence calculated as `matched_points / total_points`.
  - If multiple zones matched $\rightarrow$ `status: "MULTI_ZONE"`, dominant zone selected with distribution percentages.
  - If no zones matched $\rightarrow$ `status: "NO_MATCH"`.
  - If no GPS points found $\rightarrow$ `status: "NO_GPS"`.

### C. Zone Detection Endpoint & Schemas (`src/schemas/zone.py`, `src/api/routes/zones.py`)
- Added schemas:
  - `ZoneMatchItem`: `zone_id`, `code`, `name`, `count`, `percentage`.
  - `ZoneDetectionResponse`: `status`, `detected_zone_id`, `detected_zone_code`, `detected_zone_name`, `confidence`, `total_points`, `matched_points`, `breakdown`, `message`.
- Endpoint: `POST /api/v1/zones/detect`
  - Accepts multipart form data with `srt` file upload or raw `srt_text`.
  - Returns structured `ZoneDetectionResponse`.

### D. Processing Job Fallback (`src/services/processing_job_manager.py`)
- In `submit_job()`, if `zone_id` is omitted by the caller but `srt_path` is provided, the backend automatically calls `resolve_zone_from_telemetry()` on the uploaded SRT before falling back to default EC-01.

---

## 3. Frontend Implementation

### A. Data Types (`dashboard/client/src/types/ingestion.ts`)
- Added `ZoneDetectionStatus = 'AUTO_DETECTED' | 'MULTI_ZONE' | 'NO_MATCH' | 'NO_GPS' | 'MANUAL'`.
- Added `ZoneMatchItem` and `ZoneDetectionResponse` interfaces.

### B. Service Client (`dashboard/client/src/services/processingService.ts`)
- Added `detectZoneFromSrt(srtFile: File): Promise<ZoneDetectionResponse>`.
- Sends multipart request to `POST /api/v1/zones/detect`.
- Includes resilient client-side regex and spatial fallback in case of offline testing or mock environments.

### C. Drone Ingestion Studio (`dashboard/client/src/components/ingestion/DroneIngestionStudio.tsx`)
- State management:
  - `zoneDetection`: tracks `status`, `detectedZoneCode`, `confidence`, `breakdown`, and `isManualOverride`.
- Upload trigger:
  - Uploading `.srt` file automatically triggers `detectZoneFromSrt`.
  - On match, updates `telemetry.zoneId` and displays informative toasts.
- Visual Feedback & Status Badges:
  - **Auto-Detected**: Green check banner showing confidence percentage.
  - **Multi-Zone**: Amber warning banner detailing distribution across zones.
  - **No Match**: Amber warning banner indicating manual selection is needed.
  - **No GPS**: Zinc notification that GPS is absent in the SRT.
  - **Manual Override**: Indicates operator has explicitly chosen a zone.
- Manual Override Precedence:
  - Changing the dropdown sets `isManualOverride: true` and preserves user choice.

---

## 4. Automated Verification & Test Results

### A. Backend Pytest Suite (`tests/api/test_zones_detection.py`)
Covered all detection scenarios:
1. `test_detect_zone_auto_detected`: Single-zone GPS telemetry returns `AUTO_DETECTED` with correct zone ID and code.
2. `test_detect_zone_multi_zone`: Multi-zone telemetry identifies dominant zone and full percentage breakdown.
3. `test_detect_zone_no_match`: Coordinates outside Bangalore boundaries return `NO_MATCH`.
4. `test_detect_zone_no_gps`: Text without GPS returns `NO_GPS`.
5. `test_detect_zone_empty_input`: Empty SRT returns `NO_GPS`.
6. `test_zones_detect_api_endpoint`: Tests FastAPI route directly with file upload.

**Result**: **72 passed, 0 failures** across entire backend test suite.

### B. Frontend Vitest Suite (`dashboard/client/src/__tests__/srtZoneDetection.test.ts`)
Covered client-side and API interactions:
1. `correctly auto-detects EC-01 from SRT telemetry with valid coordinates`
2. `correctly detects dominant zone when flight spans MULTI_ZONE`
3. `returns NO_MATCH when telemetry coordinates are outside all zones`
4. `returns NO_GPS when SRT contains no GPS coordinates`
5. `uses backend API response when available`
6. `submits zone_id to processing endpoint when provided`

**Result**: **7 test files, 51 passed, 0 failures** in Vitest.

### C. Type Safety & Production Build
- `npm run check`: **0 TypeScript errors**.
- `npm run build`: **Successful Vite + Node bundle build** in 5.87s.

---

## 5. Constraint Compliance Audit
- **Database**: No schema changes, no migrations needed, no table drops or resets.
- **ML Models**: 5-class production weights (`models/production/best.pt`) untouched.
- **5-Class Contracts**: All 5 hazard classes preserved throughout backend and frontend.
- **Section 10 Notification Center**: Fully intact and passing all tests.
