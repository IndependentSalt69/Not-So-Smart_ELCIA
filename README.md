# CivicPulse

### AI-Assisted Monsoon Civic Risk Intelligence and Response System

**ELCIA Smart City Drone-AI Challenge 2026**  
*Track: Monsoon, Roads & Civic Infrastructure Intelligence*  
*Context: Electronics City (EC-01 to EC-04), Bengaluru & Urban Corridors*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![PyTorch](https://img.shields.io/badge/AI%2FML-PyTorch%20%7C%20YOLOv11m-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20PostGIS-336791.svg?logo=postgresql&logoColor=white)](https://postgis.net)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-139%20Passing-success.svg?logo=pytest&logoColor=white)](tests)
[![Frontend Tests](https://img.shields.io/badge/Frontend%20Tests-117%20Passing-success.svg?logo=vitest&logoColor=white)](dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Live Demo](#live-demo)
3. [5 Canonical Hazard Classes](#5-canonical-hazard-classes)
4. [End-to-End System Architecture](#end-to-end-system-architecture)
   - [Core Data Pipeline](#core-data-pipeline)
   - [Flight-First Inspection Hierarchy](#flight-first-inspection-hierarchy)
   - [Hazard Lifecycle State Machine](#hazard-lifecycle-state-machine)
5. [Technology Stack](#technology-stack)
6. [System Prerequisites](#system-prerequisites)
7. [Automated Quick Start](#automated-quick-start)
   - [Windows (NVIDIA CUDA GPU)](#windows-nvidia-cuda-gpu)
   - [macOS (Apple Silicon MPS / Intel CPU)](#macos-apple-silicon-mps--intel-cpu)
8. [Manual Step-by-Step Setup](#manual-step-by-step-setup)
   - [Step 1: Clone Repository](#step-1-clone-repository)
   - [Step 2: Backend Environment & Dependencies](#step-2-backend-environment--dependencies)
   - [Step 3: Environment Variables Configuration](#step-3-environment-variables-configuration)
   - [Step 4: Database Migrations & Seeding](#step-4-database-migrations--seeding)
   - [Step 5: Frontend Dashboard Setup](#step-5-frontend-dashboard-setup)
   - [Step 6: Running the Services](#step-6-running-the-services)
9. [Operational Workflows & Dashboard Guide](#operational-workflows--dashboard-guide)
10. [Database Schema & Maintenance Utilities](#database-schema--maintenance-utilities)
11. [REST API Reference](#rest-api-reference)
12. [Testing & Quality Verification](#testing--quality-verification)
13. [Troubleshooting & FAQ](#troubleshooting--faq)
14. [License & Acknowledgments](#license--acknowledgments)

---

## Executive Summary

**CivicPulse** is an AI-powered civic monitoring, spatial risk triage, and municipal workflow platform designed for high-risk monsoon conditions.

Trained and deployed for Electronics City, Bengaluru (**ELCIA Zones EC-01 through EC-04**), the system ingests raw aerial drone surveillance video accompanied by synchronized SubRip (`.srt`) GPS flight telemetry. It extracts, tracks, and localizes road infrastructure defects, estimates real physical dimensions and severity, and routes them directly into an authoritative municipal action workflow.

### Key Capabilities
- **Flight-First Grouping & Ingestion**: Processes multi-minute drone survey flights, grouping detected anomalies under parent flight inspection runs without merging distinct physical hazards (`1 Physical Hazard = 1 Incident`).
- **Telemetry-Synchronized Geolocation**: Correlates video timestamps with synchronized drone GPS telemetry (`Latitude`, `Longitude`, `Altitude`, `ISO Timestamp`) when available to geolocate detected hazards across operational corridors.
- **Multi-Stage Computer Vision**:
  - **YOLOv11m Segmentation**: Pixel-level instance mask detection across 5 canonical civic hazard classes.
  - **ByteTrack Multi-Object Tracking**: Trajectory tracking across consecutive frames to prevent duplicate counting and extract true physical persistence duration.
  - **MiDaS / DPT Monocular Depth Estimation**: Quantitative road depression depth scoring for severe pothole profiling.
- **Progressive H.264 Video Transcoding**: Automated background FFmpeg pipeline transcoding aerial footage with `yuv420p` pixel format and `+faststart` atom placement for seamless, buffer-free in-browser playback.
- **Human-in-the-Loop Municipal Triage**: Complete lifecycle management from AI detection through engineer verification, field assignment, on-site repair, and drone re-inspection closure.
- **Zero False-Positive Penalty Handling**: Full support for clear baseline flights (`VERIFIED_CLEAR`) and operator manual anomaly reporting (`-M<TS>`) for continuous verification auditability.

---

## Live Demo

| Interface | URL / Access |
| :--- | :--- |
| **Public Production Dashboard** | [https://civicpulse-44d.pages.dev](https://civicpulse-44d.pages.dev) |
| **Local Dashboard Server** | `http://localhost:5173` (or `http://localhost:3000`) |
| **Local FastAPI REST API** | `http://127.0.0.1:8000` |
| **Interactive OpenAPI / Swagger Docs** | `http://127.0.0.1:8000/docs` |
| **ReDoc API Documentation** | `http://127.0.0.1:8000/redoc` |

---

## 5 Canonical Hazard Classes

CivicPulse is configured with 5 standardized, mutually exclusive civic hazard classes defined in [`configs/config.yaml`](file:///d:/Not-So-Smart_ELCIA/configs/config.yaml):

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           5 CANONICAL HAZARD CLASSES                            │
├─────────────────────┬──────────────┬────────────────────────┬───────────────────┤
│ Hazard Class        │ Class ID     │ Primary Severity Metric│ Operational Impact│
├─────────────────────┼──────────────┼────────────────────────┼───────────────────┤
│ DAMAGED_FOOTPATH    │ 0            │ Broken surface area m² │ Pedestrian Safety │
│ DRAINAGE_OVERFLOW   │ 1            │ Flow width & runoff    │ Flooding / Silt   │
│ OPEN_MANHOLE        │ 2            │ Cavity aperture radius │ Critical Hazard   │
│ POTHOLE             │ 3            │ Surface area + Depth   │ Vehicle Damage    │
│ WATERLOGGING        │ 4            │ Water inundation area  │ Corridor Blockage │
└─────────────────────┴──────────────┴────────────────────────┴───────────────────┘
```

1. **`WATERLOGGING` (Class 4)**: Standing water accumulation and road inundation that disrupts vehicular traffic, damages sub-base road layers, and poses hydroplaning hazards.
2. **`POTHOLE` (Class 3)**: Pavement structural cavities, asphalt voids, and surface craters. Scored using surface area and MiDaS monocular depth estimation.
3. **`OPEN_MANHOLE` (Class 2)**: Missing or displaced utility chamber, storm drain, or sewer access covers. Auto-assigned **High Urgency** with safety escalation.
4. **`DRAINAGE_OVERFLOW` (Class 1)**: Silted culverts, roadside stormwater drain blockages, and active runoff backflow over roads.
5. **`DAMAGED_FOOTPATH` (Class 0)**: Broken walkway pavers, eroded pedestrian sidewalks, and displaced concrete slabs.

---

## End-to-End System Architecture

![CivicPulse System Architecture](images/Architecture.png)

### Core Data Pipeline

![CivicPulse ML & Video Processing Pipeline](images/Pipeline.png)

### Flight-First Inspection Hierarchy

The platform implements an unambiguous architectural hierarchy: **1 Physical Hazard = 1 Incident**. Incidents produced during a single drone flight survey are grouped under a parent **Processing Job / Flight Inspection Run** without loss of spatial individuality:

```text
Processing Job / Flight Inspection Run (UUID: e.g. a1b2c3d4-...)
│
├── Flight Summary Metadata (Zone, Start/End Time, Hazard Totals, Video Player)
├── Video Verification Record (Status: VERIFIED_HAZARDS / VERIFIED_CLEAR)
│
├── Incident 1 [INC-A1B2C3D4-001] ── Pothole (Area: 1.4m², Depth: 6.2cm, Lat/Lon)
├── Incident 2 [INC-A1B2C3D4-002] ── Open Manhole (High Urgency, Lat/Lon)
├── Incident 3 [INC-A1B2C3D4-003] ── Waterlogging (Area: 8.5m², Lat/Lon)
└── Incident 4 [INC-A1B2C3D4-M01] ── Manual Anomaly (Operator reported)
```

### Hazard Lifecycle State Machine

Every incident transitions through an audited, deterministic state machine with compulsory transition notes and user tracking:

```text
                         [ DETECTED ] ── (AI Video Ingestion)
                           /        \
                          /          \
               (Operator / Engineer Review)
                        /              \
                       ▼                ▼
                [ VERIFIED ]       [ REJECTED ] ── (False positive logged)
                     │
            (Dispatch Repair Team)
                     │
                     ▼
                [ ASSIGNED ]
                     │
            (On-Site Field Work)
                     │
                     ▼
              [ IN_PROGRESS ]
                     │
            (Repair Work Completed)
                     │
                     ▼
             [ RE_INSPECTION ] ── (Queued for follow-up drone flight)
                     │
            (Follow-Up Flight Confirms Restoration)
                     │
                     ▼
                 [ CLOSED ] ── (Resolved & Archived)
```

---

## Technology Stack

```text
┌───────────────────────────┬──────────────────────────────────────────────────────────────────┐
│ Layer                     │ Technologies & Frameworks                                        │
├───────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Backend API               │ Python 3.11+, FastAPI, Uvicorn, Pydantic v2, AnyIO               │
│ Computer Vision & AI      │ PyTorch 2.x, Ultralytics YOLOv11m, ByteTrack, MiDaS / DPT, CV2   │
│ Video Transcoding         │ FFmpeg (H.264 / AVC1, yuv420p, +faststart, 30fps progressive)   │
│ Database & Spatial Engine │ PostgreSQL 15+, PostGIS 3+, SQLAlchemy 2.0 (async/sync), Alembic │
│ Cloud Database Provider   │ Supabase (AWS Mumbai / ap-south-1 pooler / session direct)       │
│ Frontend Dashboard        │ React 18, TypeScript 5.6, Vite 7, Tailwind CSS v4, Wouter        │
│ UI & Component Library    │ Radix UI Primitives, Lucide React, Framer Motion, Sonner Toasts  │
│ Geospatial & Mapping      │ @vis.gl/react-google-maps, Google Maps JavaScript API            │
│ Data Visualization        │ Recharts (Bar Charts, Trend Lines, Urgency Distributions)        │
│ Automated Testing         │ Pytest, HTTPX (Backend: 139 tests) | Vitest (Frontend: 117 tests)│
└───────────────────────────┴──────────────────────────────────────────────────────────────────┘
```

---

## System Prerequisites

Before installation, verify your environment meets the minimum system requirements:

### Hardware Requirements
- **CPU**: 4+ Physical Cores (x86_64 or Apple Silicon ARM64)
- **RAM**: 8 GB RAM minimum (16 GB recommended for high-res video inference)
- **GPU (Recommended for Windows/Linux)**: NVIDIA GPU with CUDA 11.8+ or CUDA 12.x / 13.x support (4GB+ VRAM)
- **GPU (macOS)**: Apple Silicon (M1/M2/M3/M4) with Metal Performance Shaders (MPS) support

### Required Software Tools
- **Python**: Version `3.10` or `3.11` (Python 3.11 recommended)
- **Node.js**: Version `18.x`, `20.x`, or `22.x` with `npm`
- **FFmpeg**: Accessible globally in system `PATH` (used for video slicing and web-safe encoding)
- **Git**: Version `2.x+`
- **PostgreSQL**: Local PostgreSQL 15+ with PostGIS extension **OR** a cloud-hosted [Supabase](https://supabase.com) PostgreSQL database.

---

## Automated Quick Start

CivicPulse includes hardened, automated setup and startup scripts organized by operating system:

| Platform | Setup Script | Start Script | Acceleration Mode |
| :--- | :--- | :--- | :--- |
| **Windows** | [`setup/windows/setup_gpu.ps1`](file:///d:/Not-So-Smart_ELCIA/setup/windows/setup_gpu.ps1) | [`setup/windows/start.ps1`](file:///d:/Not-So-Smart_ELCIA/setup/windows/start.ps1) | NVIDIA CUDA GPU Acceleration |
| **macOS (Apple Silicon)** | [`setup/macOS/setup_mac.sh`](file:///d:/Not-So-Smart_ELCIA/setup/macOS/setup_mac.sh) | [`setup/macOS/start_mac.sh`](file:///d:/Not-So-Smart_ELCIA/setup/macOS/start_mac.sh) | Apple Metal Performance Shaders (MPS) |
| **macOS (Intel)** | [`setup/macOS/setup_mac.sh`](file:///d:/Not-So-Smart_ELCIA/setup/macOS/setup_mac.sh) | [`setup/macOS/start_mac.sh`](file:///d:/Not-So-Smart_ELCIA/setup/macOS/start_mac.sh) | Optimized CPU Multi-Threading |

---

### Windows (NVIDIA CUDA GPU)

#### 1. Install CLI Tools (PowerShell)
```powershell
# Install Python, Node.js, and FFmpeg via Windows Package Manager
winget install Python.Python.3.11
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg.Shared
```

#### 2. Run Automated Windows Setup
```powershell
# Open PowerShell in the project root directory
.\setup\windows\setup_gpu.ps1
```
*What this script does:*
1. Checks for NVIDIA GPU via `nvidia-smi`.
2. Creates `.venv` and upgrades `pip`.
3. Installs backend dependencies from `requirements.txt`.
4. Installs CUDA-optimized PyTorch binaries matching your system CUDA runtime.
5. Verifies imports for `torch`, `ultralytics`, `timm`, and `lap`.
6. Checks for `.env`, `dashboard\.env`, and model weights `models\production\best.pt`.
7. Performs an automated database connectivity test.
8. Installs dashboard `node_modules` with `--legacy-peer-deps`.

#### 3. Start All Services
```powershell
.\setup\windows\start.ps1
```
*Launches the FastAPI backend on `http://127.0.0.1:8000` and the React Vite dashboard on `http://localhost:3000` (or `http://localhost:5173`) in synchronized terminal windows.*

---

### macOS (Apple Silicon MPS / Intel CPU)

#### 1. Install Prerequisites via Homebrew
```bash
# Install Homebrew (if not present)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install CLI packages
brew install python@3.11 node ffmpeg git
```

#### 2. Run Automated macOS Setup
```bash
# Grant execution permissions
chmod +x setup/macOS/setup_mac.sh setup/macOS/start_mac.sh

# Execute setup
./setup/macOS/setup_mac.sh
```
*What this script does:*
1. Detects system architecture (`arm64` Apple Silicon vs `x86_64` Intel).
2. Sets up Python virtual environment `.venv` using Python 3.11.
3. Installs requirements from `requirements.txt`.
4. Tests and validates Apple Silicon MPS hardware acceleration or Intel CPU fallback.
5. Validates `.env` database connectivity and model availability.
6. Installs frontend `node_modules`.

#### 3. Start All Services
```bash
./setup/macOS/start_mac.sh
```
*Spawns backend and frontend concurrently with trap listeners for clean shutdown on `Ctrl+C`.*

---

## Manual Step-by-Step Setup

If you prefer complete manual control over your development environment, follow these steps from scratch.

### Step 1: Clone Repository

```bash
git clone https://github.com/IndependentSalt69/Not-So-Smart_ELCIA.git
cd Not-So-Smart_ELCIA
```

---

### Step 2: Backend Environment & Dependencies

```bash
# Create Python virtual environment
python -m venv .venv

# Activate virtual environment:
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# Upgrade pip and packaging tools
python -m pip install --upgrade pip setuptools wheel

# Install dependencies
pip install -r requirements.txt
```

> [!NOTE]
> For NVIDIA GPU acceleration on Windows/Linux, install the PyTorch CUDA wheel:
> ```bash
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
> ```

---

### Step 3: Environment Variables Configuration

CivicPulse uses two `.env` files: one at the project root for the FastAPI backend, and one inside `dashboard/` for the Vite frontend.

#### 1. Root Backend Environment File (`.env`)
Create `.env` in the repository root:

```ini
# ==============================================================================
# CivicPulse Backend Configuration
# ==============================================================================

# Database Connection (PostgreSQL with PostGIS or Supabase pooler)
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require

# Application Environment
ENVIRONMENT=development
PROJECT_NAME="CivicPulse"
DEBUG=True

# Static File & Upload Directories
UPLOAD_DIR=uploads
JOBS_DIR=outputs/jobs

# Hazard Confidence & Tracking Defaults
DEFAULT_CONFIDENCE_THRESHOLD=0.30
```

#### 2. Frontend Environment File (`dashboard/.env`)
Create `dashboard/.env`:

```ini
# ==============================================================================
# CivicPulse Dashboard Configuration
# ==============================================================================

# Backend API Endpoint URL
VITE_API_BASE_URL=http://127.0.0.1:8000

# Authoritative Mode: Set to false to use PostgreSQL / FastAPI backend as single source of truth
VITE_USE_MOCK_DATA=false

# Google Maps API Key (Geocoding & Spatial Heatmaps)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourGoogleMapsApiKeyHere
```

---

### Step 4: Database Migrations & Seeding

CivicPulse uses Alembic for declarative schema migrations.

```bash
# Ensure virtual environment is active
# Run all database migrations up to the latest revision
alembic upgrade head
```

#### Ensure Canonical Electronics City Zones
To guarantee that the 4 canonical ELCIA zones (`EC-01` through `EC-04`) and their spatial boundaries exist in the database:

```bash
python scripts/restore_operational_zones.py
```

> [!NOTE]
> For resetting previous operational activity (incidents, detections, evidence, and status history) before a demonstration while preserving zones, users, and migration state, use the Demo Day reset utility:
> ```bash
> python scripts/reset_demo_db.py --dry-run
> ```

---

### Step 5: Frontend Dashboard Setup

```bash
# Navigate to dashboard directory
cd dashboard

# Install npm dependencies (use --legacy-peer-deps for React 18/19 compatibility)
npm install --legacy-peer-deps

# Verify TypeScript compilation
npm run check

# Return to root
cd ..
```

---

### Step 6: Running the Services

#### Terminal 1 — FastAPI Backend Server
```bash
# From repository root (with .venv active)
python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```
*The API is now live at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.*

#### Terminal 2 — React Dashboard Server
```bash
# From dashboard directory
cd dashboard
npm run dev
```
*The dashboard is now live at `http://localhost:5173` (or `http://localhost:3000`).*

---

## Operational Workflows & Dashboard Guide

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                         CIVICPULSE DASHBOARD MODULES                           │
├───────────────────────┬────────────────────────────────────────────────────────┤
│ Module                │ Operational Function                                   │
├───────────────────────┼────────────────────────────────────────────────────────┤
│ 1. Flight Ingestion   │ Upload MP4 + SRT, select ELCIA zone, monitor AI stages │
│ 2. Flight-First Queue │ Review flight inspections, aggregate stats, clear approvals│
│ 3. Incident Drawer    │ Inspect bounding box crops, depth profiles, GPS coords │
│ 4. Municipal Triage   │ Progress status (New → Verified → Assigned → Closed)   │
│ 5. Analytics Studio   │ Interactive charts answering: What, Where, When, How   │
└───────────────────────┴────────────────────────────────────────────────────────┘
```

### 1. Ingesting Drone Flights (`DroneIngestionStudio`)
1. Click **"Ingest Drone Footage"** in the top navigation bar.
2. Drag and drop a drone `.mp4` video file along with its matching `.srt` telemetry file.
3. Select the operational zone (e.g. `EC-01 Phase 1 Core`).
4. Click **"Start AI Pipeline"**:
   - The UI displays live processing progress through 6 stages: Uploading $\rightarrow$ Telemetry Parsing $\rightarrow$ YOLOv11m Inference $\rightarrow$ ByteTrack Tracking $\rightarrow$ MiDaS Depth Scoring $\rightarrow$ H.264 Video Encoding.
5. Once complete, the operator receives the processing summary and the identified Flight Inspection Run. The operator can click **"View Flight Inspection"** to inspect the flight run and review its individual constituent hazards. Individual hazards remain distinct and separate (the first incident is not automatically opened).

### 2. Flight-First Queue & Human Verification
- The default operations dashboard view organizes activity by **Flight Inspections**, providing immediate access to view and filter all **Individual Incidents**.
- Selecting a flight opens the Flight Inspection drawer, displaying total hazard count, breakdown by class, priority distribution, and the transcoded video player.
- **Zero AI Hazards (`VERIFIED_CLEAR`)**: When zero hazards are detected in a flight, no dummy incidents are created. The flight is routed to the Video Verification workflow where the operator can review the video and click **"Approve Clean Flight"** (`POST /api/v1/verifications/{id_or_job_id}/confirm-clear`), generating an official audit record.
- **Manual Anomaly Reporting**: If an operator spots an unlisted defect in the footage, they can submit an operator-reported incident (`POST /api/v1/verifications/{id_or_job_id}/report-anomaly`). This creates a linked incident with `Source = HUMAN_REPORTED`, `AI Confidence = N/A`, and an `-M<TS>` code suffix without fabricating AI detections.

### 3. Incident Management & Evidence Viewer
- Click any incident card within a flight run or the incident list to open the detailed **Incident Drawer**.
- **Real Evidence Viewer**: Displays the high-resolution video frame crop highlighting the bounding box mask, detection confidence (e.g. `89.4%`), estimated surface area in $m^2$, and tracked duration in seconds.
- **Status Lifecycle Transitions**: Authorized operators can advance the status from `New` $\rightarrow$ `Verified` $\rightarrow$ `Assigned` $\rightarrow$ `In Progress` $\rightarrow$ `Re-Inspection` $\rightarrow$ `Closed`.

### 4. Analytics Studio ("4 Operational Questions")
- **WHAT?** $\rightarrow$ **Issues by Type**: Horizontal breakdown of the 5 canonical hazard classes.
- **WHERE?** $\rightarrow$ **Issue Map & Geospatial Zones**: Interactive Google Map displaying clusters and individual markers color-coded by urgency.
- **WHEN?** $\rightarrow$ **7-Day Trend Analysis**: Rolling multi-series line chart tracking new vs resolved incidents across monsoon days.
- **HOW SERIOUS?** $\rightarrow$ **Urgency Distribution**: Priority breakdown (High, Medium, Low) ensuring urgent safety hazards (such as open manholes) receive immediate attention.

---

## Database Schema & Maintenance Utilities

### Core Relational Models

![CivicPulse PostgreSQL & PostGIS Database Schema](images/DB%20Schema.png)

### Database Maintenance Scripts

All maintenance utilities are located in [`scripts/`](file:///d:/Not-So-Smart_ELCIA/scripts/):

#### 1. Safe Test Data Cleanup (`cleanup_test_data.py`)
Removes test, demo, and E2E evaluation records without corrupting production or baseline data:
```bash
# Perform a safe dry-run (no DB changes)
python scripts/cleanup_test_data.py --dry-run

# Cleanup test records only
python scripts/cleanup_test_data.py --test-only

# Cleanup specific flight inspection prefix
python scripts/cleanup_test_data.py --flight-prefix A1B2C3D4
```

#### 2. Demo Day Database Reset Utility (`reset_demo_db.py`)
A standalone CLI utility for clearing previous operational activity records (incidents, detections, evidence, assignments, inspections, status history) before a demonstration, while preserving core configuration tables (`users`, `zones`, `alembic_version`, `spatial_ref_sys`):
```bash
# Dry-run preview (default mode, no records modified)
python scripts/reset_demo_db.py --dry-run

# Execute reset with explicit confirmation flag
python scripts/reset_demo_db.py --confirm
```
> [!WARNING]
> `reset_demo_db.py` is a reset tool for clearing operational test runs. It does **not** recreate database tables from scratch, run migrations, or seed demo incidents. To restore baseline operational zones, use `restore_operational_zones.py`.

#### 3. Restore Operational Zones (`restore_operational_zones.py`)
Idempotently guarantees that the 4 canonical Electronics City zones (`EC-01` to `EC-04`) and their spatial boundaries are present:
```bash
python scripts/restore_operational_zones.py
```

#### 4. Detection Threshold Evaluation (`evaluate_detection_thresholds.py`)
Evaluates confidence distributions across test video datasets:
```bash
python scripts/evaluate_detection_thresholds.py
```

---

## REST API Reference

The FastAPI backend exposes a fully typed, auto-documented REST API conforming to OpenAPI 3.1.

### 1. Health & Readiness
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health/` | Returns service health, database connectivity status, and version. |

### 2. Incidents Management
| Method | Endpoint | Query / Body Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/incidents/` | `zone_id`, `incident_type`, `status`, `priority`, `min_severity`, `skip`, `limit` | Query paginated incidents with multi-field filtering. |
| `POST` | `/api/v1/incidents/` | `IncidentCreate` JSON payload | Create a new incident. |
| `GET` | `/api/v1/incidents/{id}` | UUID path parameter | Retrieve full incident details, detections, and audit history. |
| `PATCH` | `/api/v1/incidents/{id}` | `IncidentUpdate` JSON payload | Update incident properties (priority, assigned team, notes). |
| `PATCH` | `/api/v1/incidents/{id}/status` | `IncidentStatusUpdate` (`status`, `comment`, `changed_by`) | Advance incident lifecycle state and write audit log. |
| `GET` | `/api/v1/incidents/{id}/evidence` | UUID path parameter | Retrieve all evidence frames and annotated crops. |

### 3. Video Processing & Flight Runs
| Method | Endpoint | Parameters / Payload | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/process` | `multipart/form-data` (`video`, `srt`, `zone_id`) | Submit raw drone video and optional flight telemetry for AI execution. |
| `GET` | `/api/v1/process/{job_id}` | Job UUID string | Poll processing progress percentage (0-100%), stage, and logs. |
| `GET` | `/api/v1/process/runs` | `zone_id`, `skip`, `limit` | List all historical and active Flight Inspection runs. |
| `GET` | `/api/v1/process/runs/{job_id}` | Job UUID or 8-character prefix | Retrieve detailed flight summary, constituent incidents, and verification status. |

### 4. Human Video Verifications
| Method | Endpoint | Payload | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/verifications` | `status`, `zone_id`, `skip`, `limit` | List video flight verifications with optional filtering. |
| `GET` | `/api/v1/verifications/{id_or_job_id}` | UUID or job ID path param | Retrieve verification details for a flight run. |
| `POST` | `/api/v1/verifications/{id_or_job_id}/confirm-clear` | `ConfirmClearRequest` (`reviewer_id`, `notes`) | Operator confirms clean flight footage with zero anomalies (`CONFIRMED_CLEAR`). |
| `POST` | `/api/v1/verifications/{id_or_job_id}/report-anomaly` | `ReportAnomalyRequest` (hazard details) | Operator reports an undetected hazard from flight footage (`HUMAN_REPORTED` incident). |

### 5. Operational Zones & Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/zones/` | List all ELCIA zones (`EC-01` to `EC-04`) with geometry polygons and active counts. |
| `GET` | `/api/v1/zones/{id}` | Retrieve specific zone metadata and spatial boundary coordinates. |
| `GET` | `/api/v1/analytics/summary` | Retrieve KPI metrics (active incidents, critical issues, avg resolution time). |
| `GET` | `/api/v1/analytics/trends` | Retrieve 7-day daily incident counts grouped by hazard type. |
| `GET` | `/api/v1/analytics/zones` | Retrieve zone-by-zone incident and urgency distribution breakdown. |

---

## Testing & Quality Verification

CivicPulse maintains strict test coverage across both backend Python services and frontend React modules.

```text
================================================================================
                           TEST VERIFICATION SUMMARY
================================================================================
 Backend Pytest Suite:     139 / 139 PASSED (100%)
 Frontend Vitest Suite:    117 / 117 PASSED (100% across 12 test files)
 TypeScript Compilation:   0 ERRORS (tsc --noEmit)
 Production Build:         PASSED (Vite + esbuild bundle)
================================================================================
```

### Running Backend Tests
```bash
# Run complete backend pytest suite
pytest -q

# Run with verbose test names
pytest -v

# Run specific domain test suites
pytest tests/api/test_incidents.py
pytest tests/api/test_processing_runs.py
pytest tests/services/test_ml_ingestion.py
pytest tests/db/test_migrations.py
```

### Running Frontend Tests & Type Checking
```bash
# Navigate to dashboard
cd dashboard

# 1. Run TypeScript type checker
npm run check

# 2. Run Vitest unit test suite (117 tests)
npx vitest run

# 3. Test production bundle build
npm run build
```

---

## Troubleshooting & FAQ

### 1. PyTorch / CUDA GPU Issues on Windows
**Symptom:** `CUDA is unavailable` or `torch.cuda.is_available()` returns `False`.
**Resolution:**
1. Verify your NVIDIA drivers are up to date by running `nvidia-smi` in PowerShell.
2. Reinstall the matching PyTorch CUDA wheel:
   ```powershell
   .\.venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
   ```

### 2. FFmpeg Not Found Error
**Symptom:** `FileNotFoundError: [Errno 2] No such file or directory: 'ffmpeg'`.
**Resolution:**
- On **Windows**: Run `winget install Gyan.FFmpeg.Shared` and restart your terminal.
- On **macOS**: Run `brew install ffmpeg`.

### 3. Frontend npm Dependency Conflicts
**Symptom:** `npm error ERESOLVE unable to resolve dependency tree`.
**Resolution:**
Use the legacy peer dependencies flag:
```bash
npm install --legacy-peer-deps
```

### 4. Database Connection Timeout or Pooler Errors
**Symptom:** `psycopg.OperationalError: connection to server ... failed: Connection timed out`.
**Resolution:**
1. Check that your internet connection is active.
2. Verify that `DATABASE_URL` in `.env` includes `?sslmode=require`.
3. If using Supabase, ensure you are using port `6543` (transaction/session pooler) or port `5432` (direct connection).

### 5. Video Playback Fails in Web Browser
**Symptom:** Output video shows audio icon or fails to decode in Google Chrome / Safari.
**Resolution:**
CivicPulse automatically encodes videos using progressive H.264 (`libx264`), `yuv420p` pixel format, and `+faststart` moov atom. Ensure FFmpeg is installed and accessible to enable this background transcoding pipeline.

---

## License & Acknowledgments

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

### Acknowledgments
- Developed for the **ELCIA Smart City Drone-AI Challenge 2026** under the *Monsoon, Roads & Civic Infrastructure Intelligence* track.
- Special thanks to the Electronics City Industrial Township Authority (**ELCIA**), Bengaluru, for spatial zone definitions and urban civic management problem specifications.
