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
├── src/
│   ├── api/                # FastAPI router definitions, endpoints, schemas
│   ├── core/               # App configuration, security, logging
│   ├── db/                 # SQLAlchemy session setup, PostGIS models, migrations
│   ├── ml/                 # Detection models, frame extraction, inference code
│   └── repositories/       # Data access layer for incidents, zones, analytics
├── dashboard/
│   └── client/             # React + Vite TypeScript frontend application
│       ├── src/
│       │   ├── components/ # Map, Queue, Analytics, Ingest Studio UI
│       │   ├── services/   # Axios API client services
│       │   ├── hooks/      # React custom hooks
│       │   └── types/      # TypeScript interfaces
├── tests/                  # Pytest test suite (unit, integration, DB migrations)
├── docs/                   # System design logs, integration logs, QA bugfix logs
├── alembic.ini             # Alembic migration configuration
├── requirements.txt        # Python dependency manifest
└── README.md               # Project documentation
```

---

## License and Acknowledgments

Developed as part of the **ELCIA Smart City Drone-AI Challenge 2026** under the *Monsoon, Roads & Civic Infrastructure Intelligence* track.

Copyright 2026 CivicPulse Team.