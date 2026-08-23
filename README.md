# CivicPulse

### AI-Assisted Monsoon Civic Risk Intelligence and Response System

**ELCIA Smart City Drone-AI Challenge 2026**  
*Track: Monsoon, Roads & Civic Infrastructure Intelligence*  
*Context: Electronics City, Bengaluru*

---

## Executive Summary

CivicPulse's core backend, database, frontend integration, and analytics workflows are implemented and locally verified.

The platform addresses severe monsoon-related urban challenges—specifically **waterlogging inundation** and **pothole road degradation**—by automating the operational response workflow: visual observation, spatial coordinate mapping, temporal deduplication, severity scoring, operational priority triage, human-in-the-loop verification, and resolution tracking.

---

## Current Status

### Verified
- ✅ **Core FastAPI Backend**: REST API endpoints for incident management, zone telemetry, and analytics workflows.
- ✅ **PostgreSQL + PostGIS Database**: Spatial database schema with Alembic migration lifecycle management.
- ✅ **Incident Lifecycle Workflow**: Full state machine (`DETECTED`, `VERIFIED`, `REJECTED`, `ASSIGNED`, `IN_PROGRESS`, `RE_INSPECTION`, `CLOSED`).
- ✅ **Complete Subresource APIs**: Full CRUD and lookup endpoints for Evidence, Detections, Assignments, Inspections, and History audit trails.
- ✅ **Frontend ↔ Backend Integration**: Centralized TypeScript API service layer (`api.ts`) connecting React components to live backend endpoints.
- ✅ **Real-Time Analytics Engine**: Database-side SQL aggregations for summary KPIs, 7-day surge trends, and zone priority breakdowns.
- ✅ **Automated Test Suite**: 37/37 backend pytest tests passing across API, database, migration, and repository layers.
- ✅ **Frontend Static Analysis**: 0 TypeScript compilation errors (`npm run check`).
- ✅ **Hard Dashboard QA**: Validated camera jitter fixes, incident publishing flows, and type filter behavior.

### Remaining Work
- 🟡 **Google Maps Production Configuration**: Browser API key, billing, and referrer restriction setup.
- 🟡 **Dedicated Media File Serving**: Binary file storage and streaming for raw video clips and evidence images.
- 🟡 **Drone Trajectory & Telemetry Storage**: `LINESTRING` schema extension for full flight path tracking.
- 🟡 **Production Deployment**: Cloud infrastructure provisioning and domain deployment.
- 🟡 **Final End-to-End Live Validation**: Field demo validation under live monsoon footage.

---

## Operational Workflow

CivicPulse moves beyond simple object detection to provide a closed-loop civic response pipeline:

```text
  Video / AI Observation
            │
            ▼
        Detection
            │
            ▼
    Incident Generated
            │
            ▼
    Human Verification  ────────► [ REJECTED ]
            │
            ▼
       Assignment
            │
            ▼
     Field Inspection
            │
            ▼
    Status Progression  ( IN_PROGRESS → RE_INSPECTION )
            │
            ▼
         Closure
            │
            ▼
        Analytics
```

---

## Geospatial Data Model

CivicPulse uses PostGIS geometries to model spatial infrastructure data accurately:

- **Incident $\rightarrow$ Representative `POINT`**: Each civic incident is stored with a single representative geospatial coordinate (`EPSG:4326` latitude/longitude) indicating the primary location of interest.
- **Detection $\rightarrow$ Frame-level `POINT` + Timestamp**: Individual AI detection observations record frame-specific bounding centroids and timestamps.
- **Zone $\rightarrow$ `POLYGON`**: Municipal operational boundaries (e.g., `EC-01`, `EC-02`, `EC-03`, `EC-04`) are defined as spatial polygon enclosures.
- **Drone Flight $\rightarrow$ Future `LINESTRING`**: Planned trajectory storage for drone flight telemetry paths.

*Note: Because a surveillance drone passes through many coordinates during a flight, individual incidents hold a representative point location rather than a full trajectory path.*

---

## Incident Lifecycle State Machine

Incidents transition through a strict state machine with full audit trail history:

```text
          DETECTED
          /      \
  VERIFIED        REJECTED
     │
  ASSIGNED
     │
IN_PROGRESS
     │
RE_INSPECTION
     │
  CLOSED
```

- **`DETECTED`**: Initial AI pipeline observation.
- **`VERIFIED`**: Confirmed by human operator.
- **`REJECTED`**: Marked invalid or duplicate by operator (supported and tested in backend DB).
- **`ASSIGNED`**: Dispatched to municipal field response team.
- **`IN_PROGRESS`**: On-site mitigation active.
- **`RE_INSPECTION`**: Field work completed, awaiting quality check.
- **`CLOSED`**: Resolution verified and archived.

---

## System Architecture

```text
                                  INPUT
                                    │
                         Surveillance Video Feed
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ Frame Sampling & Prep │
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ AI Inference Engine   │
                        │ • Waterlogging (Seg)  │
                        │ • Pothole (Detect)    │
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ Temporal Intelligence │
                        │ • Deduplication       │
                        │ • Persistence Tracking│
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Incident Generator   │
                        │ • Representative Point│
                        │ • Severity & Priority │
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ FastAPI REST Backend  │
                        │ • PostgreSQL/PostGIS  │
                        └───────────┬───────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
            React Operations Dashboard    Analytics Engine
                        │
                        ▼
            Human-in-the-Loop Workflow
            [DETECTED → VERIFIED / REJECTED → ASSIGNED → IN_PROGRESS → RE_INSPECTION → CLOSED]
```

---

## AI Ingest Studio vs. ML Pipeline

CivicPulse distinguishes between the dashboard ingestion interface and the backend ML pipeline:

- **Dashboard Ingestion Workflow**: Provides an interactive UI studio for uploading surveillance clips, previewing detections, and publishing resulting incident payloads into the live operations queue via `POST /api/v1/incidents/`.
- **ML Inference Pipeline**: The underlying computer vision pipeline (YOLOv8 & Segformer) responsible for frame-by-frame segmentation, bounding box detection, and temporal event association.

---

## API Reference

The backend exposes FastAPI REST API endpoints. Key endpoints include:

### Incidents
- `GET /api/v1/incidents/`: List incidents with optional filtering by `zone_id`, `incident_type`, `status`, `priority`, and `min_severity`.
- `POST /api/v1/incidents/`: Create a new incident.
- `GET /api/v1/incidents/{id}`: Retrieve detailed incident metadata.
- `PATCH /api/v1/incidents/{id}`: Update incident details.
- `PATCH /api/v1/incidents/{id}/status`: Update lifecycle status and append status-history audit entry.

### Evidence Subresource
- `POST /api/v1/incidents/{id}/evidence`: Attach visual evidence metadata to an incident.
- `GET /api/v1/incidents/{id}/evidence`: Retrieve evidence assets associated with an incident.

### Detections Subresource
- `POST /api/v1/incidents/{id}/detections`: Record frame-level AI detection data.
- `GET /api/v1/incidents/{id}/detections`: Retrieve raw frame-level detection records for an incident.

### Assignments Subresource
- `POST /api/v1/incidents/{id}/assignments`: Assign incident to field response team.
- `GET /api/v1/incidents/{id}/assignments`: Retrieve field team assignment records for an incident.

### Inspections Subresource
- `POST /api/v1/incidents/{id}/inspections`: Log field inspection results.
- `GET /api/v1/incidents/{id}/inspections`: Retrieve inspection history for an incident.

### History Audit Subresource
- `GET /api/v1/incidents/{id}/history`: Retrieve status transition audit history trail.

### Zone Telemetry
- `GET /api/v1/zones/`: Retrieve list of operational zones (`EC-01` through `EC-04`).

### Analytics
- `GET /api/v1/analytics/summary`: Aggregate metrics (active count, P1 critical count, mean resolution time).
- `GET /api/v1/analytics/trends`: 7-day rolling daily surge trends.
- `GET /api/v1/analytics/zones`: Per-zone incident counts categorized by priority level.

---

## Analytics Engine & Data Limitations

Analytics metrics are computed strictly via database-side SQL aggregations using PostgreSQL and SQLAlchemy.

### Deliberate Telemetry Limitations
To ensure data integrity, the system does not fabricate unmeasured metrics:
- **`waterlogged_area_sqm` $\rightarrow$ Unavailable / N/A**: Physical inundated surface area is not directly measured in the current schema.
- **`rainfall_mm` $\rightarrow$ Unavailable / N/A**: Rainfall gauge telemetry is not currently stored.

---

## Geospatial Visualization (Google Maps)

The dashboard provides a Google Maps-based geospatial visualization of PostGIS-backed incident locations:

- **Features**: Dynamic marker clustering, P1 critical pulse animation, zone boundaries, fly-to camera controllers, and InfoWindow details.
- **Configuration Note**: A valid browser Google Maps API key (`VITE_GOOGLE_MAPS_API_KEY`) with appropriate domain restrictions is required for production usage.

---

## Technology Stack

### Backend
- **Language**: Python 3.x
- **Framework**: FastAPI (Asynchronous REST API)
- **Database**: PostgreSQL with PostGIS extension
- **ORM / Migrations**: SQLAlchemy 2.0, Alembic
- **Testing**: Pytest, Httpx, AnyIO

### Frontend
- **Framework**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Mapping**: `@vis.gl/react-google-maps`
- **Visualizations**: Recharts
- **API Client Layer**: Centralized TypeScript API service layer (`api.ts`)

### Computer Vision
- **Libraries**: PyTorch, OpenCV
- **Models**: Segformer (Waterlogging Segmentation), YOLOv8 (Pothole Detection)

---

## Testing and Hard Dashboard QA

### Automated Tests
- **Backend Pytest Suite**: 37/37 tests passing (`pytest`) covering API endpoints, database migrations, repository patterns, and analytics aggregations.
- **Frontend Type Check**: 0 TypeScript compilation errors (`npm run check`).

### Hard Dashboard QA Verification
The operations dashboard was stress-tested and validated against three critical issues:
1. **Google Maps Camera Jitter & Marker Safety**: Stabilized camera controller with primitive ref comparison to eliminate pan jumps; added coordinate null-safety guards.
2. **AI Ingest Incident Publishing**: Connected AI Ingest Studio to `POST /api/v1/incidents/` so newly published incidents instantly persist and appear in live queues.
3. **Incident Type Filter Disparity**: Fixed empty array handling (`items: []`) to prevent premature mock fallback; implemented backend DB auto-seeding.

---

## Local Setup and Environment Configuration

### 1. Backend Setup

```bash
# Clone repository
git clone https://github.com/IndependentSalt69/ELCIA-Hackathon.git
cd ELCIA-Hackathon

# Create and activate virtual environment (.venv)
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI server
python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup

```bash
# Navigate to client directory
cd dashboard/client

# Install dependencies
npm install

# Create environment configuration in dashboard/client/.env
```

Add the following to `dashboard/client/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

*Security Note: Do not commit real API keys or database credentials to version control.*

```bash
# Start frontend development server
npm run dev
```

---

## Current Limitations

- **Evidence Media Serving**: Evidence files are currently represented by backend metadata records and fallback previews; dedicated binary media file streaming is pending.
- **Google Maps Key Requirement**: Map rendering requires a valid browser API key and billing setup.
- **Drone Trajectory Storage**: Drone flight paths (`LINESTRING`) are not yet stored in the database.
- **Rainfall Telemetry**: Physical rainfall depth measurements are not integrated into the current schema.
- **Physical Waterlogged Area**: Inundation area ($m^2$) is not directly measured in the current database schema.

---

## Repository Structure

```text
.
├── alembic/                          # Alembic database migration environment
│   ├── versions/                     # Revision migration scripts (PostGIS tables)
│   ├── env.py                        # Migration runner setup
│   └── script.py.mako                # Migration template
├── dashboard/
│   └── client/                       # React 18 + Vite TypeScript Frontend App
│       ├── public/                   # Static public assets & drone icons
│       └── src/
│           ├── components/           # React UI Component Modules
│           │   ├── analytics/        # Analytics charts & KPI summary cards
│           │   ├── common/           # Priority badges, status pills, sliding controls
│           │   ├── detail/           # Incident evidence inspection & triage modal
│           │   ├── incidents/        # Incident Queue, filter bars, card lists
│           │   ├── ingestion/        # AI Ingest Studio & video clip processing UI
│           │   ├── layout/           # Sidebar navigation, header, status badges
│           │   ├── map/              # Google Maps spatial operations center
│           │   ├── overview/         # Executive summary widgets & mini map
│           │   └── ui/               # Reusable UI primitives (Buttons, Dialogs)
│           ├── contexts/             # React context providers
│           ├── data/                 # Data transformers and mock fallbacks
│           ├── hooks/                # Custom React hooks (useIncidents, useAnalytics)
│           ├── pages/                # Main view pages (Dashboard, Incidents, Maps)
│           ├── services/             # Axios/Fetch API services (api.ts, incidentService.ts)
│           └── types/                # TypeScript type definitions (incident.ts)
├── docs/                             # Project Architecture & QA Logs
│   ├── backend_analytics_implementation.md
│   ├── dashboard_qa_bugfix_log.md
│   └── frontend_backend_integration_log.md
├── scripts/                          # Utility & maintenance scripts
│   ├── auto_seed_backend.ts          # Automated backend database seeder
│   └── verify_qa_fixes.ts            # Integration & verification suite
├── src/                              # FastAPI Python Backend Application
│   ├── api/                          # REST API Layer
│   │   ├── dependencies.py           # FastAPI dependency injectors
│   │   ├── main.py                   # Application entrypoint & CORS middleware
│   │   └── routes/                   # Route handlers (incidents, zones, analytics, health)
│   ├── core/                         # Core App Configurations
│   │   ├── config.py                 # Pydantic environment settings
│   │   └── logging.py                # Structured logging configuration
│   ├── db/                           # Database & ORM Infrastructure
│   │   ├── base.py                   # SQLAlchemy Base model class
│   │   ├── session.py                # Database connection session maker
│   │   └── models/                   # PostGIS & SQLAlchemy ORM Models
│   │       ├── incident.py           # Core Incident entity schema
│   │       ├── zone.py               # Operational Zone entity schema
│   │       ├── detection.py          # Frame-level AI detection records
│   │       ├── evidence.py           # Visual evidence frame references
│   │       ├── assignment.py         # Municipal field team allocation
│   │       └── history.py            # Audit log state transitions
│   ├── detection/                    # Computer Vision Detection Pipeline
│   │   ├── depth_estimator.py        # Water depth & severity estimation
│   │   ├── severity_analyzer.py      # Multi-factor severity scoring algorithm
│   │   ├── video_tracker.py          # Frame-level tracking & video processing
│   │   └── yolo_segmentation.py      # Segformer/YOLOv8 inference engine
│   ├── repositories/                 # Data Access Object (DAO) Pattern Layer
│   │   ├── analytics.py              # Aggregation SQL queries for summary/trends/zones
│   │   ├── incidents.py              # CRUD operations for incidents
│   │   ├── zones.py                  # Operational zone telemetry lookup
│   │   └── evidence.py               # Frame & clip metadata access
│   ├── schemas/                      # Pydantic Data Validation Schemas
│   │   ├── analytics.py              # Analytics request/response DTOs
│   │   ├── incident.py               # Incident DTOs
│   │   └── zone.py                   # Zone DTOs
│   ├── severity/                     # Priority & Severity Scoring Engine
│   │   └── scoring_engine.py         # Multi-factor operational scoring logic
│   └── tracking/                     # Temporal Association Engine
│       └── temporal_filter.py        # Frame-to-incident deduplication logic
├── tests/                            # Pytest Automated Test Suite
│   ├── api/                          # REST API route test suites
│   ├── db/                           # Database migration & lifecycle tests
│   ├── integration/                  # End-to-end integration test suites
│   └── repositories/                 # Repository layer query tests
├── alembic.ini                       # Alembic environment configuration
├── pytest.ini                        # Pytest framework settings
├── requirements.txt                  # Python dependency specifications
└── README.md                         # Project documentation
```

---

## License and Acknowledgments

Developed as part of the **ELCIA Smart City Drone-AI Challenge 2026** under the *Monsoon, Roads & Civic Infrastructure Intelligence* track.

Copyright 2026 CivicPulse Team.