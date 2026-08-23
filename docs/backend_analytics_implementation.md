# CivicPulse Backend Analytics Implementation Documentation (Phase 9B)

---

## 1. Executive Summary

Phase 9B implements three backend analytics REST API endpoints (`GET /api/v1/analytics/summary`, `GET /api/v1/analytics/trends`, `GET /api/v1/analytics/zones`) in the CivicPulse FastAPI application using database-side SQL aggregation through SQLAlchemy 2.0.

No mock data or hardcoded statistics are used. All metrics are calculated dynamically using PostgreSQL / SQLite database queries with `COUNT`, `AVG`, `GROUP BY`, `JOIN`, `CASE`, and date filtering.

---

## 2. API Endpoint Contracts

### 2.1 GET `/api/v1/analytics/summary`

**Summary:** Retrieves high-level operational KPIs, incident status breakdown, and priority breakdown.

**Response Schema (`AnalyticsSummaryResponse`):**
```json
{
  "kpis": {
    "total_active_incidents": 10,
    "critical_p1_count": 3,
    "high_p2_count": 5,
    "routine_p3_count": 2,
    "waterlogged_area_sqm": null,
    "pothole_clusters_count": 4,
    "pending_verification_count": 4,
    "mean_time_to_resolution_hours": 2.5
  },
  "status_distribution": [
    {
      "status": "DETECTED",
      "count": 4
    },
    {
      "status": "VERIFIED",
      "count": 3
    },
    {
      "status": "CLOSED",
      "count": 3
    }
  ],
  "priority_distribution": [
    {
      "priority": "P1",
      "count": 4
    },
    {
      "priority": "P2",
      "count": 5
    },
    {
      "priority": "P3",
      "count": 2
    }
  ]
}
```

---

### 2.2 GET `/api/v1/analytics/trends`

**Summary:** Retrieves daily incident trend counts (waterlogging vs. potholes) over a sliding calendar date window.

**Query Parameters:**
- `days` (`int`, optional, default: 7): Days window to retrieve. Valid range: `1 <= days <= 90`. Values outside this range return HTTP 400 Bad Request.

**Response Schema (`List[AnalyticsTrendItem]`):**
```json
[
  {
    "date": "2026-08-17",
    "waterlogging": 2,
    "potholes": 1,
    "rainfall_mm": null
  },
  {
    "date": "2026-08-18",
    "waterlogging": 5,
    "potholes": 3,
    "rainfall_mm": null
  }
]
```

---

### 2.3 GET `/api/v1/analytics/zones`

**Summary:** Retrieves operational risk metrics and priority breakdown grouped by municipal operational sector (zone).

**Response Schema (`List[ZoneAnalyticsResponse]`):**
```json
[
  {
    "zone_id": "b8724027-f61b-40ab-bff9-cd29e09b424c",
    "zone_code": "EC-01",
    "zone_name": "Electronic City Phase 1",
    "active_incidents": 5,
    "waterlogged_area_sqm": null,
    "p1_count": 2,
    "p2_count": 2,
    "p3_count": 1
  }
]
```

---

## 3. Metric Aggregation Methodology

| Metric | SQL Aggregation Strategy | Filter / Condition |
| :--- | :--- | :--- |
| `total_active_incidents` | `COUNT(*)` | `status NOT IN ('CLOSED', 'REJECTED')` |
| `critical_p1_count` | `COUNT(*)` | `priority = 'P1'` |
| `high_p2_count` | `COUNT(*)` | `priority = 'P2'` |
| `routine_p3_count` | `COUNT(*)` | `priority = 'P3'` |
| `pending_verification_count` | `COUNT(*)` | `status = 'DETECTED'` |
| `pothole_clusters_count` | `COUNT(*)` | `incident_type = 'POTHOLE'` |
| `mean_time_to_resolution_hours` | `AVG(duration_seconds) / 3600.0` | `duration_seconds IS NOT NULL AND duration_seconds > 0` |
| `waterlogged_area_sqm` | Set to `null` | Physical area is not directly stored in the current DB schema. |
| `status_distribution` | `GROUP BY status` | Real database counts for each status enum value present. |
| `priority_distribution` | `GROUP BY priority` | Real database counts for each priority level present. |
| `trends` | `GROUP BY func.date(created_at)` | Sliding `days` window, conditional counts for `WATERLOGGING` and `POTHOLE`. |
| `rainfall_mm` | Set to `null` | Weather/rainfall data is not stored in the database schema. |
| `zones` | `JOIN zones ON incidents.zone_id = zones.id GROUP BY zone.id` | Count of active incidents and P1/P2/P3 priority breakdown per zone. |

---

## 4. Documentation of Data Limitations

1. **Waterlogged Area (`waterlogged_area_sqm`)**:
   - The PostgreSQL ORM model `Incident` contains `severity_score` (0-10) and PostGIS `location` (Point geometry), but does not store physical flood polygon area measurements in square meters.
   - Per project guidelines, physical measurements are not fabricated. `waterlogged_area_sqm` is explicitly set to `null` in API schemas and docstrings.

2. **Rainfall Data (`rainfall_mm`)**:
   - The database schema does not currently record weather radar or rain gauge telemetry.
   - `rainfall_mm` is returned as `null` in trend models to clearly communicate absence of weather telemetry without inventing fake numbers.

---

## 5. Verification & Testing Summary

- **Automated Pytest Suite:** 37 / 37 passed (`.\venv\Scripts\python.exe -m pytest -v`) including 6 comprehensive unit/integration tests in `tests/api/test_analytics.py`.
- **Manual HTTP API Verification:** Verified live responses via `Invoke-WebRequest` against running FastAPI app (`http://127.0.0.1:8000/api/v1/analytics/...`).
- **OpenAPI Verification:** Verified auto-generated schema specs at `/openapi.json` and `/docs`.
