# CivicPulse Incident Class Contract Specification

**Phase**: 11A — Incident Class Contract Update  
**Status**: Production / Synchronized across ML, Backend, Database, API, and Frontend  
**Scope**: 4 Canonical Municipal Hazard Classes  

---

## 1. Executive Summary

The CivicPulse platform natively supports **four (4) canonical hazard classes** spanning the entire pipeline from drone computer vision inference down to frontend municipal dispatch and triage operations.

| Canonical Concept | ML Pipeline Identifier | Backend DB & API Enum | Frontend State Type | Human UI Label | Primary Lucide Icon | Theme Accent |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Waterlogging** | `waterlogging` | `WATERLOGGING` | `'waterlogging'` | `Waterlogging` | `<Droplets />` | Teal (`#0d9488`) |
| **Pothole** | `pothole` | `POTHOLE` | `'pothole'` | `Pothole` / `Potholes` | `<AlertTriangle />` | Amber (`#f59e0b`) |
| **Drainage Overflow** | `drainage_overflow` | `DRAINAGE_OVERFLOW` | `'drainage_overflow'` | `Drainage Overflow` | `<Waves />` | Cyan (`#06b6d4`) |
| **Damaged Footpath** | `damaged_footpath` | `DAMAGED_FOOTPATH` | `'damaged_footpath'` | `Damaged Footpath` | `<Footprints />` | Orange (`#f97316`) |

---

## 2. Layer-by-Layer Architecture & Mapping Contract

```
┌─────────────────────────────────────────────────────────────┐
│                 ML Drone Computer Vision                    │
│   YOLOv8 Segmentation / Bounding Box & Telemetry JSON       │
│   Classes: waterlogging | pothole | drainage_overflow |     │
│            damaged_footpath                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON Ingestion
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI REST Endpoints                     │
│   Pydantic Enums: WATERLOGGING | POTHOLE |                  │
│                   DRAINAGE_OVERFLOW | DAMAGED_FOOTPATH      │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLAlchemy 2.0 ORM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL 16 + PostGIS                      │
│   Table: incidents (column incident_type character varying) │
│   Enum Type: incident_type_enum                             │
│   Alembic Migration: 20260825_002_add_incident_types.py     │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST JSON API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             TypeScript Frontend Client Service              │
│   Types: 'waterlogging' | 'pothole' | 'drainage_overflow' | │
│          'damaged_footpath'                                 │
│   Mappers: mapBackendTypeToFrontend(),                      │
│            mapFrontendTypeToBackend()                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ React UI Components
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   CivicPulse Command Center                 │
│   - Sliding Filter Segmented Control with Lucide Icons      │
│   - Map View AdvancedMarker Pins & Custom InfoWindows       │
│   - Real-time Analytics Multi-Area Trend Chart              │
│   - Incident Cards & Detail Drawer Steppers                 │
│   - Drone Vision Ingestion Studio Preset Scenarios          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema & Alembic Migration

### Model Definition (`src/db/models/enums.py` & `src/db/models/incident.py`)
```python
class IncidentType(str, enum.Enum):
    WATERLOGGING = "WATERLOGGING"
    POTHOLE = "POTHOLE"
    DRAINAGE_OVERFLOW = "DRAINAGE_OVERFLOW"
    DAMAGED_FOOTPATH = "DAMAGED_FOOTPATH"
```

### Alembic Migration (`alembic/versions/20260825_002_add_incident_types.py`)
```python
"""add_incident_types

Revision ID: 20260825_002
Revises: 20260821_001
Create Date: 2026-08-25 00:00:00.000000
"""
from alembic import op

def upgrade() -> None:
    # Safely extends native enum if present in PostgreSQL
    with op.get_context().autocommit_block():
        conn = op.get_bind()
        if conn.dialect.name == "postgresql":
            conn.exec_driver_sql("ALTER TYPE incidenttype ADD VALUE IF NOT EXISTS 'DRAINAGE_OVERFLOW';")
            conn.exec_driver_sql("ALTER TYPE incidenttype ADD VALUE IF NOT EXISTS 'DAMAGED_FOOTPATH';")
```

---

## 4. API Endpoints & Contract

### 1. Incident Creation (`POST /api/v1/incidents/`)
```json
{
  "incident_code": "INC-2026-0042",
  "incident_type": "DRAINAGE_OVERFLOW",
  "confidence": 0.94,
  "severity_score": 8.2,
  "priority": "P1",
  "zone_id": "8e3b7944-1234-4567-890a-bcdef0123456",
  "status": "DETECTED",
  "location": {
    "type": "Point",
    "coordinates": [77.6631, 12.8452]
  }
}
```

### 2. Incident Filtering (`GET /api/v1/incidents/?incident_type=DAMAGED_FOOTPATH`)
Filters records matching the canonical uppercase enum. Invalid incident types return HTTP 422 Unprocessable Entity.

### 3. Analytics Trends (`GET /api/v1/analytics/trends?days=7`)
```json
[
  {
    "date": "2026-08-24",
    "waterlogging": 14,
    "potholes": 8,
    "drainage_overflow": 5,
    "damaged_footpath": 3,
    "rainfall_mm": 18.4
  }
]
```

---

## 5. Frontend TypeScript Types & Mapping Helpers

`dashboard/client/src/types/incident.ts`:
```typescript
export type IncidentType =
  | 'waterlogging'
  | 'pothole'
  | 'drainage_overflow'
  | 'damaged_footpath';

export type BackendIncidentType =
  | 'WATERLOGGING'
  | 'POTHOLE'
  | 'DRAINAGE_OVERFLOW'
  | 'DAMAGED_FOOTPATH';

export function mapBackendTypeToFrontend(backendType?: string | null): IncidentType {
  if (!backendType) return 'pothole';
  const upper = backendType.toUpperCase();
  switch (upper) {
    case 'WATERLOGGING':
      return 'waterlogging';
    case 'DRAINAGE_OVERFLOW':
      return 'drainage_overflow';
    case 'DAMAGED_FOOTPATH':
      return 'damaged_footpath';
    case 'POTHOLE':
    default:
      return 'pothole';
  }
}

export function mapFrontendTypeToBackend(frontendType?: string | null): BackendIncidentType {
  if (!frontendType) return 'POTHOLE';
  const lower = frontendType.toLowerCase();
  switch (lower) {
    case 'waterlogging':
      return 'WATERLOGGING';
    case 'drainage_overflow':
      return 'DRAINAGE_OVERFLOW';
    case 'damaged_footpath':
      return 'DAMAGED_FOOTPATH';
    case 'pothole':
    default:
      return 'POTHOLE';
  }
}
```

---

## 6. Verification & Quality Assurance

- **Automated Python Pytest Suite**: 43/43 tests passing (`tests/api/test_api.py`, `tests/repositories/test_repositories.py`, `tests/api/test_analytics.py`, `tests/db/test_migrations.py`).
- **Frontend TypeScript Build**: `npm run check` $\rightarrow$ 0 compile errors.
- **Round-Trip Live Script**: `scratch/verify_phase_11a.py` executes successfully validating end-to-end creation, filtering, and aggregation.
