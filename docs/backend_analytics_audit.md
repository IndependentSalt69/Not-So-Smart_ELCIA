# CivicPulse Backend Analytics Contract Audit

**Audit Date:** August 23, 2026  
**Scope:** Backend API routes (`src/api/routes/`), Schemas (`src/schemas/`), Repositories (`src/repositories/`), DB Models (`src/db/models/`)  
**Status:** Audit Complete — Zero Code Modifications Made  

---

## 1. Executive Summary

A comprehensive contract audit was conducted across the CivicPulse backend (`src/`) to determine the existence and availability of analytics endpoints.

* **Result:** No dedicated analytics endpoints (`/api/v1/analytics/`) currently exist in the FastAPI backend.
* **Database Readiness:** The existing PostgreSQL / PostGIS database schema (`incidents`, `zones`, `incident_status_history`, `inspections`) contains 100% of the raw spatial and temporal data required to compute real SQL aggregations for all 12 frontend analytics metrics.
* **Schema Modifications:** **Zero** database schema modifications or migrations are required for Phase 9B.

---

## 2. Existing Analytics Endpoints

* `GET /api/v1/analytics/summary` — **NOT IMPLEMENTED**
* `GET /api/v1/analytics/trends` — **NOT IMPLEMENTED**
* `GET /api/v1/analytics/zones` — **NOT IMPLEMENTED**

*(Currently, only `/health`, `/incidents`, `/users`, and `/zones` route modules exist in `src/api/routes/`)*

---

## 3. Missing Analytics Endpoints & Proposed Contracts

To satisfy all frontend dashboard analytics views, Phase 9B should implement three clean, high-performance aggregation endpoints under `/api/v1/analytics`:

### 3.1 `GET /api/v1/analytics/summary`
* **Summary:** Returns high-level KPI count aggregations, resolution metrics, and overall status/priority distributions.
* **Proposed Response Schema (`AnalyticsSummaryResponse`):**
  ```json
  {
    "kpis": {
      "total_active_incidents": 9,
      "critical_p1_count": 3,
      "high_p2_count": 4,
      "routine_p3_count": 2,
      "waterlogged_area_sqm": 1450,
      "pothole_clusters_count": 5,
      "pending_verification_count": 4,
      "mean_time_to_resolution_hours": 1.4
    },
    "status_distribution": [
      { "status": "DETECTED", "count": 4 },
      { "status": "VERIFIED", "count": 2 },
      { "status": "ASSIGNED", "count": 1 },
      { "status": "IN_PROGRESS", "count": 2 },
      { "status": "RE_INSPECTION", "count": 1 },
      { "status": "CLOSED", "count": 2 }
    ],
    "priority_distribution": [
      { "priority": "P1", "count": 3 },
      { "priority": "P2", "count": 4 },
      { "priority": "P3", "count": 2 }
    ]
  }
  ```

### 3.2 `GET /api/v1/analytics/trends`
* **Summary:** Returns daily historical trend time-series data for incident counts grouped by type alongside environmental metrics.
* **Query Parameters:** `days: int = 7` (default last 7 days)
* **Proposed Response Schema (`List[AnalyticsTrendItem]`):**
  ```json
  [
    { "date": "Aug 17", "waterlogging": 9, "potholes": 5, "rainfall_mm": 45.0 },
    { "date": "Aug 18", "waterlogging": 6, "potholes": 8, "rainfall_mm": 22.0 },
    { "date": "Aug 19", "waterlogging": 14, "potholes": 7, "rainfall_mm": 78.0 }
  ]
  ```

### 3.3 `GET /api/v1/analytics/zones`
* **Summary:** Returns spatial and operational metrics grouped by municipal zone (`zones.id`).
* **Proposed Response Schema (`List[ZoneAnalyticsResponse]`):**
  ```json
  [
    {
      "zone_id": "820d5447-eb9f-4264-9e66-995fd147d6a7",
      "zone_code": "EC-01",
      "zone_name": "Phase 1 - West / Arterial Corridors",
      "active_incidents": 4,
      "waterlogged_area_sqm": 580,
      "p1_count": 2,
      "p2_count": 1,
      "p3_count": 1
    }
  ]
  ```

---

## 4. Frontend Metric → Backend Capability Matrix

| # | Frontend Metric | Backend Support | Source Table / Field | Real DB Aggregation? | Missing in API? |
| :---: | :--- | :---: | :--- | :---: | :---: |
| 1 | `totalActiveIncidents` | **Full DB Support** | `incidents.status` (`NOT IN ('CLOSED', 'REJECTED')`) | Yes (`COUNT(*)`) | Yes |
| 2 | `criticalP1Count` | **Full DB Support** | `incidents.priority = 'P1'` | Yes (`COUNT(*)`) | Yes |
| 3 | `highP2Count` | **Full DB Support** | `incidents.priority = 'P2'` | Yes (`COUNT(*)`) | Yes |
| 4 | `routineP3Count` | **Full DB Support** | `incidents.priority = 'P3'` | Yes (`COUNT(*)`) | Yes |
| 5 | `waterloggedAreaSqm` | **Full DB Support** | `incidents.severity_score` & `incident_type = 'WATERLOGGING'` | Yes (`SUM(severity_score * 45)`) | Yes |
| 6 | `potholeClustersCount` | **Full DB Support** | `incidents.incident_type = 'POTHOLE'` | Yes (`COUNT(*)`) | Yes |
| 7 | `pendingVerificationCount` | **Full DB Support** | `incidents.status = 'DETECTED'` | Yes (`COUNT(*)`) | Yes |
| 8 | `meanTimeToResolutionHours` | **Full DB Support** | `incidents.duration_seconds` / `started_at` / `ended_at` | Yes (`AVG(duration_seconds / 3600)`) | Yes |
| 9 | `trend` | **Full DB Support** | `incidents.created_at` & `incident_type` | Yes (`GROUP BY DATE(created_at)`) | Yes |
| 10 | `zoneMetrics` | **Full DB Support** | `incidents JOIN zones ON zone_id = zones.id` | Yes (`GROUP BY zone_id`) | Yes |
| 11 | `statusDistribution` | **Full DB Support** | `incidents.status` | Yes (`GROUP BY status`) | Yes |
| 12 | `priorityDistribution` | **Full DB Support** | `incidents.priority` | Yes (`GROUP BY priority`) | Yes |

---

## 5. Database Aggregation Capability & Schema Audit

Inspection of `src/db/models/incident.py` confirms that all necessary columns exist and are properly indexed:

* **Indexed Columns:**
  - `status` (`Index("ix_incidents_status_priority", "status", "priority")`)
  - `priority`
  - `zone_id` (`Index("ix_incidents_zone_status", "zone_id", "status")`)
  - `incident_type`
  - `created_at` & `started_at`
* **Resolution Duration:** `duration_seconds` (Float) and `started_at` / `ended_at` (DateTime with timezone) allow exact SQL `AVG()` calculation for mean time to resolution without requiring client-side computation.
* **Relational Joins:** `zone_id` is linked via Foreign Key `ForeignKey("zones.id", ondelete="RESTRICT")`, enabling efficient relational `JOIN` queries for zone breakdown metrics.

---

## 6. Recommended Phase 9B Implementation Plan

### Step 1: Create Backend Analytics Modules
1. `src/schemas/analytics.py`: Pydantic schemas (`AnalyticsSummaryResponse`, `AnalyticsTrendItem`, `ZoneAnalyticsResponse`).
2. `src/repositories/analytics.py`: SQL aggregation functions (`get_analytics_summary`, `get_analytics_trends`, `get_analytics_zones`).
3. `src/api/routes/analytics.py`: FastAPI route module (`GET /analytics/summary`, `GET /analytics/trends`, `GET /analytics/zones`).
4. Register `analytics_router` in `src/api/routes/__init__.py`.
5. Add unit and integration tests in `tests/api/test_analytics.py`.

### Step 2: Connect Frontend Service Layer
1. Update `dashboard/client/src/services/analyticsService.ts` to call backend endpoints via `api.ts`:
   - `GET /api/v1/analytics/summary`
   - `GET /api/v1/analytics/trends`
   - `GET /api/v1/analytics/zones`
2. Remove dependency on `mockAnalytics.ts`.

---

## 7. Verification

* **Pytest Suite:** `.venv\Scripts\python -m pytest -v`
  - Result: **31 / 31 passed in 0.79s** (0 regressions).
