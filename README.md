# CivicPulse

### AI-Assisted Monsoon Civic Risk Intelligence and Response System

**ELCIA Smart City Drone-AI Challenge 2026**  
*Track: Monsoon, Roads & Civic Infrastructure Intelligence*  
*Context: Electronics City, Bengaluru*

---

## Executive Summary

CivicPulse is an enterprise-grade AI civic intelligence and automated response platform designed to transform aerial drone and road surveillance video into structured, evidence-backed civic infrastructure incidents. 

The platform addresses severe monsoon-related urban challenges—specifically **waterlogging inundation** and **pothole road degradation**—by automating the full operational lifecycle: visual detection, spatial coordinate mapping, temporal deduplication, severity scoring, operational priority triage, human-in-the-loop verification, and resolution tracking.

---

## Current Implementation Status

CivicPulse is fully implemented, integrated, and verified across both backend and frontend components:

- **FastAPI Backend Services**: Production REST API endpoints for incident management, zone telemetry, AI video ingestion, and live analytics.
- **PostgreSQL / PostGIS Database**: Relational schema with spatial extensions, Alembic migration history, and PostGIS geometry indexing.
- **AI Computer Vision Pipeline**: Frame extraction, waterlogging segmentation, pothole detection, and temporal event association.
- **React Operations Dashboard**: Interactive TypeScript dashboard featuring live Google Maps spatial tracking, real-time incident queues, AI Ingest Studio, and analytics telemetry.
- **Verification Suite**: 37/37 backend pytest unit/integration tests passing; zero TypeScript compilation errors (`npm run check`).

---

## System Architecture

```text
                                  INPUT
                                    │
                         Road / Drone Video Feed
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
                        │ • Frame Deduplication │
                        │ • Persistence Tracking│
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Incident Generator   │
                        │ • Spatial PostGIS Tag │
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
            [DETECTED → VERIFIED → ASSIGNED → IN_PROGRESS → RE_INSPECTION → CLOSED]
```

---

## Key Features

### 1. AI Video Ingestion Studio
- Ingests drone and dashcam surveillance footage in real time.
- Extracts visual evidence frames and runs automated detection models.
- Generates structured incident objects with exact timestamp, location description, confidence metric, and bounding metadata.

### 2. Spatial Operations Center (Google Maps & PostGIS)
- Renders incident hotspots using `@vis.gl/react-google-maps` with satellite hybrid and vector views.
- Integrates PostGIS geometry points for precise longitude and latitude spatial queries across Electronics City Phase 1 and Phase 2 corridors.
- Supports interactive fly-to controls, coordinate lookup, zone filtering, and dynamic incident info cards.

### 3. Operational Severity & Priority Engine
Decouples model detection confidence from operational intervention priority:
- **Severity Score (0.0 – 10.0)**: Calculated from physical inundation extent, road obstruction, and duration.
- **Priority Triage**:
  - **P1 — Critical**: Immediate intervention required (e.g., major junction inundation).
  - **P2 — High**: High-priority inspection and maintenance.
  - **P3 — Routine**: Scheduled maintenance queue.

### 4. Closed-Loop Incident Lifecycle Workflow
Tracks incident progression across six formal state-machine statuses:
1. `DETECTED`: Initial AI pipeline detection.
2. `VERIFIED`: Confirmed by human operator.
3. `ASSIGNED`: Allocated to municipal field team.
4. `IN_PROGRESS`: On-site mitigation active.
5. `RE_INSPECTION`: Quality assurance re-check.
6. `CLOSED`: Resolved and archived.

### 5. Live Analytics & Telemetry Engine
- Aggregates live backend metrics via PostgreSQL SQL transformations.
- Provides daily incident surge trends over rolling 7-day windows.
- Visualizes zone vulnerability distributions and operational status breakdowns using Recharts.

---

## Technology Stack

### Backend
- **Language**: Python 3.12
- **Framework**: FastAPI (Asynchronous REST API)
- **Database**: PostgreSQL 15 with PostGIS 3 extension
- **ORM / Migrations**: SQLAlchemy 2.0, Alembic
- **Testing**: Pytest, Httpx, AnyIO

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Mapping**: Google Maps Platform (`@vis.gl/react-google-maps`)
- **Visualizations**: Recharts
- **Icons & UI**: Lucide React, Shadcn/UI primitives

### AI & Computer Vision
- **Frameworks**: PyTorch, OpenCV
- **Models**: Segformer (Waterlogging Segmentation), YOLOv8 (Pothole Detection)

---

## API Reference

The backend exposes full OpenAPI documentation at `/docs` when running. Key endpoints include:

### Incidents API
- `GET /api/v1/incidents/`: List incidents with optional filtering by `zone_id`, `incident_type`, `status`, `priority`, and `min_severity`.
- `POST /api/v1/incidents/`: Create a new incident.
- `GET /api/v1/incidents/{id}`: Retrieve detailed incident metadata and evidence.
- `PATCH /api/v1/incidents/{id}`: Update status, priority, or assigned team.

### Zone Telemetry API
- `GET /api/v1/zones/`: Retrieve list of operational zones (e.g., `EC-01`, `EC-02`, `EC-03`, `EC-04`).

### Analytics API
- `GET /api/v1/analytics/summary`: Aggregate metrics including active incidents, P1 critical count, and mean resolution time.
- `GET /api/v1/analytics/trends`: Daily historical surge trends over 7-day rolling window.
- `GET /api/v1/analytics/zones`: Per-zone incident counts broken down by priority level.

### Ingestion & Inference API
- `POST /api/v1/ingest/upload`: Upload raw surveillance video clip.
- `POST /api/v1/inference/process`: Run computer vision pipeline on uploaded clip.

---

## Local Setup and Installation

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm
- PostgreSQL 15+ with PostGIS extension (or local SQLite/PostgreSQL configuration)

### 1. Backend Setup

```bash
# Clone repository
git clone https://github.com/IndependentSalt69/ELCIA-Hackathon.git
cd ELCIA-Hackathon

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI development server
uvicorn src.api.main:app --reload --port 8000
```

The API will be available at `http://127.0.0.1:8000` (OpenAPI Swagger docs at `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup

```bash
# Navigate to client directory
cd dashboard/client

# Install dependencies
npm install

# Configure environment variables in dashboard/client/.env
# VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Run frontend development server
npm run dev
```

The React dashboard will be available at `http://localhost:5173`.

---

## Testing and Verification

### Backend Automated Test Suite
Run the full pytest suite (37 tests covering API endpoints, database migrations, repository patterns, and analytics aggregations):

```bash
python -m pytest
```

### Frontend Type Check
Run TypeScript static analysis across the frontend codebase:

```bash
cd dashboard/client
npm run check
```

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
│           ├── services/             # Axios API services (api.ts, incidentService.ts)
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