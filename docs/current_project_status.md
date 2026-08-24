# CivicPulse — Current Project Status

**Last Updated:** August 25, 2026  
**System Status:** Operational & Production Ready  

---

## 1. Executive Summary

CivicPulse is an end-to-end municipal incident detection and management platform for Electronics City (ELCIA). It ingests drone camera feeds and spatial telemetry, detects and segments infrastructure hazards via computer vision (YOLOv8 + SAM 2.1), persists incidents to a PostgreSQL/PostGIS spatial database, and orchestrates response operations through a modern municipal command dashboard.

---

## 2. Platform Architecture & Layer Contract

```
[ Aerial Drone Feeds / Video Streams ]
                ↓
[ ML Pipeline / Sensor Fusion ]
  - YOLOv8 (Bounding Boxes & Detections)
  - SAM 2.1 (Segmented Water / Crack Masks)
  - 4-Vector Severity Engine
                ↓
[ FastAPI Backend (v1) ]
  - /api/v1/incidents/ (CRUD, Filters, Spatial PostGIS Queries)
  - /api/v1/incidents/{id}/[evidence, detections, assignments, inspections, history]
  - /api/v1/analytics/ (Summary, Trends, Hotspot Zones)
  - /api/v1/zones/ & /api/v1/users/
  - /static/evidence/ (Media File Streaming)
                ↓
[ PostgreSQL 16 + PostGIS Database ]
  - Tables: incidents, evidence, detections, assignments, inspections, incident_status_history, zones, users
  - Canonical Enum Types: IncidentType, IncidentStatus, PriorityLevel, EvidenceType, InspectionResult
                ↓
[ React + TypeScript Command Center ]
  - Overview: Real-time KPIs, live detection feeds, mini spatial preview
  - Incident Queue: Multi-criteria filtering, search, grid/list layouts, evidence preloading
  - Spatial Map View: Google Maps Platform Advanced Markers, hotspot clusters, telemetry HUD
  - Incident Detail Drawer: Full verification triage, dispatch assignments, field inspections, AI explainability
  - Analytics Dashboard: 7-day multi-hazard trends, zonal distribution, severity breakdowns
  - Drone Vision Ingestion Studio: Live footage analysis, overlay generation, direct queue publishing
```

---

## 3. Canonical Hazard Classes (Phase 11A)

All layers strictly conform to the 4 canonical hazard classes:

| Canonical Enum (`PostgreSQL` / Backend) | Frontend State (`IncidentType`) | User-Facing Label | Lucide Icon | Theme Color |
| :--- | :--- | :--- | :--- | :--- |
| `WATERLOGGING` | `'waterlogging'` | Waterlogging | `<Droplets />` | Teal (`#0d9488`) |
| `POTHOLE` | `'pothole'` | Pothole | `<AlertTriangle />` | Amber (`#f59e0b`) |
| `DRAINAGE_OVERFLOW` | `'drainage_overflow'` | Drainage Overflow | `<Waves />` | Cyan (`#06b6d4`) |
| `DAMAGED_FOOTPATH` | `'damaged_footpath'` | Damaged Footpath | `<Footprints />` | Orange (`#f97316`) |

---

## 4. Key Incident Lifecycle Invariants (Golden E2E QA)

1. **Identity Invariant**:
   - `incident.id`: Backend database UUID (e.g. `eb8d083d-d028-4e44-be3c-9b41b4057bf0`). Used for all API requests and mutations.
   - `incident.code`: Human-facing tracking code (e.g. `INC-AI-2004`). Displayed on all UI badges, cards, toasts, and headers.
2. **State & Cache Synchronization**:
   - In-memory cache `incidentsState` is proactively synchronized via `upsertIncidentsState` and `upsertSingleIncidentState` on every backend read/write.
   - Operation mutations (`verifyIncident`, `rejectIncident`, `assignIncident`, `updateIncidentStatus`) directly invoke backend REST endpoints and update the authoritative local state without race conditions.

---

## 5. Test & Quality Assurance Status

- **Automated Python Test Suite (`pytest`):** 43 / 43 tests passing (100%).
- **TypeScript Static Verification (`tsc --noEmit`):** 0 compile errors.
- **Golden E2E Test Suite (`verify_golden_e2e_id_mapping.ts`):** 11 / 11 lifecycle steps verified.
