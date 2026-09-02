# CivicPulse — Production Readiness & Deployment Audit

## 1. Current Production Topology

```
                   [ PUBLIC INTERNET ]
                            │
                            │ HTTPS (TLS 1.3)
                            ▼
                 [ Cloudflare Tunnel ]
               (cloudflared daemon / edge)
                            │
                            │ Local Reverse Proxy (HTTP 127.0.0.1)
                            ▼
              ┌───────────────────────────┐
              │     WINDOWS HOST PC       │
              │  (RTX 5070 GPU / CUDA)    │
              ├───────────────────────────┤
              │ 1. Frontend (Vite/Node)   │
              │    Port 3000 / Static     │
              │                           │
              │ 2. Backend (FastAPI/Py)   │
              │    Port 8000 / Uvicorn    │
              │                           │
              │ 3. ML Subprocess Worker   │
              │    YOLOv8 + MiDaS + H.264 │
              │                           │
              │ 4. Database (PostgreSQL)  │
              │    Port 5432 / PostGIS    │
              └───────────────────────────┘
```

The system operates as a single-host edge processing node. Drone flight video and SRT telemetry are submitted through the React Dashboard over HTTPS, processed on the local NVIDIA GeForce RTX 5070 GPU, ingested into PostgreSQL/PostGIS, and served back as annotated H.264 video streams and spatial GIS incidents.

> **Note on Public Demo Dataset**: `public_demo_video.mp4` uses synthetically generated, spatially realistic Vadodara telemetry (`data_raw/public_demo_video.srt`) for demonstration purposes. It is not flight-recorded GPS telemetry.

---

## 2. Runtime Dependencies

### Backend & ML Stack (Python 3.10–3.12)
* **Framework**: FastAPI `0.109+`, Uvicorn `0.27+` (running on Windows Proactor Event Loop)
* **Deep Learning Framework**: PyTorch `2.1.0+cu121` / `torchvision` (CUDA acceleration enabled)
* **Computer Vision**: OpenCV (`opencv-python 4.8+`), Supervision `0.19+`, Ultralytics YOLOv8 (`8.1+`), Pillow `10.2+`
* **Geospatial & Math**: Shapely `2.0+`, SciPy `1.11+`, NumPy `1.26+`, GeoAlchemy2 `0.14+`
* **Database Driver**: SQLAlchemy `2.0+`, Alembic `1.13+`, Psycopg 3 (`psycopg[binary] 3.1+`)
* **System Utilities**: FFmpeg (with `libx264` encoder & `+faststart`), `ffprobe` (binary executables on system `PATH`)

### Frontend Stack (Node.js 18+)
* **Framework**: React 19, Vite 7, TypeScript 5.6
* **UI & Animation**: Tailwind CSS 4, Radix UI, Lucide React, Framer Motion
* **Mapping**: `@vis.gl/react-google-maps` 1.9+
* **HTTP Client**: Axios & Fetch API abstraction (`dashboard/client/src/services/api.ts`)

---

## 3. Environment Variables

### Backend Environment Variables (`src/core/config.py`)

| Variable Name | Type | Default Value | Production Guidance |
| :--- | :--- | :--- | :--- |
| `APP_NAME` | `str` | `"CivicPulse API"` | Application display name |
| `APP_ENV` | `str` | `"development"` | Set to `"production"` in production |
| `DEBUG` | `bool` | `True` | **MUST be set to `False`** in production to disable uvicorn reloader & verbose tracebacks |
| `API_V1_PREFIX` | `str` | `"/api/v1"` | Base REST API route prefix |
| `HOST` | `str` | `"0.0.0.0"` | Bind interface (`"0.0.0.0"` permits reverse proxy forwarding) |
| `PORT` | `int` | `8000` | FastAPI listening port |
| `CORS_ORIGINS` | `List[str]` | `["http://localhost:3000", ...]` | Set to production domain(s) or Cloudflare hostname |
| `POSTGRES_USER` | `str` | `"postgres"` | PostgreSQL database user |
| `POSTGRES_PASSWORD`| `str` | `"postgres"` | **MUST be updated** to a strong secret password |
| `POSTGRES_HOST` | `str` | `"localhost"` | PostgreSQL hostname (can point to remote DB or `127.0.0.1`) |
| `POSTGRES_PORT` | `int` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `str` | `"civicpulse_db"` | PostgreSQL database name |
| `EVIDENCE_DIR` | `str` | `"outputs/evidence"` | Local directory path for JPEG evidence snapshots |
| `PREDICTIONS_DIR` | `str` | `"outputs/predictions"` | Local directory path for raw ML predictions |

### Frontend Environment Variables (`dashboard/client/.env`)

| Variable Name | Default Value | Production Guidance |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api/v1` | **MUST be set to public HTTPS URL** (e.g. `https://<tunnel-domain>/api/v1`) |
| `VITE_GOOGLE_MAPS_API_KEY` | *(None)* | **Required** for Google Maps rendering. Restrict key to production domain in Google Cloud Console. |

---

## 4. Security Considerations

1. **Hardcoded DB Credentials**: `src/core/config.py` defaults to `postgres:postgres`. A production `.env` file must override `POSTGRES_PASSWORD`.
2. **Exposed Secrets**: Ensure `.env` and `alembic.ini` credentials are never committed to version control (`.gitignore` must contain `.env`).
3. **API Authentication**: Endpoint routes currently permit unauthenticated reads and uploads for hackathon operation. Production deployment should enforce API key or JWT authentication headers if exposed publicly long-term.
4. **Cloudflare Tunnel Token**: Do not commit `cloudflared` tunnel tokens or credential JSON files.

---

## 5. CORS (Cross-Origin Resource Sharing)

* **Current Implementation (`src/api/main.py`)**:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
* **Production Constraint**: W3C CORS specifications dictate that `allow_credentials=True` combined with wildcard `allow_origins=["*"]` may cause credentialed browser requests to fail in strict environments.
* **Production Fix**: Supply explicit origins in `CORS_ORIGINS` (e.g., `["https://civicpulse.example.com"]`) or use dynamic origin matching.

---

## 6. Media Storage

1. **Directory Paths**:
   - Evidence JPEGs: `outputs/evidence/`
   - Processing Job Artifacts: `outputs/jobs/<job_id>/`
   - Static Mounts:
     - `/static/evidence` $\rightarrow$ `outputs/evidence`
     - `/static/jobs` $\rightarrow$ `outputs/jobs`
2. **Video Streaming Requirements**:
   - HTTP Range Requests (`206 Partial Content`, `Accept-Ranges: bytes`) are handled automatically by FastAPI `StaticFiles`.
   - Transcoded videos use H.264 / AVC High Profile, `yuv420p`, and `-movflags +faststart` for instant web playback.
3. **Storage Growth**:
   - Each full flight job produces ~120 MB of annotated H.264 video and ~15 MB of evidence JPEGs.
   - Storage maintenance: Implement disk monitoring or a cron cleanup policy for obsolete job outputs.

---

## 7. GPU Requirements (NVIDIA RTX 5070 / CUDA)

1. **GPU Hardware**: NVIDIA GeForce RTX 5070 (Blackwell architecture / Compute Capability 9.0).
2. **NVIDIA Driver**: Version $\ge 545.xx$ installed on Windows.
3. **PyTorch CUDA Build**: PyTorch compiled with CUDA support (`torch.cuda.is_available() == True`).
4. **Model Checkpoints**:
   - Bounding/Segmentation: `models/production/civicpulse_best.pt`
   - Monocular Depth: MiDaS `DPT_Large` (cached automatically at `C:\Users\<user>\.cache\torch\hub\checkpoints\`)

---

## 8. Database Requirements (PostgreSQL + PostGIS)

1. **PostgreSQL Version**: 15+ (PostgreSQL 17 verified).
2. **Required Extension**: `postgis` extension MUST be activated in the target database:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. **Migrations**: Managed via Alembic (`alembic upgrade head`). Automatically runs on project deployment.
4. **Remote Hosting Support**: PostgreSQL can be hosted on a separate machine or cloud database (AWS RDS / GCP Cloud SQL). Update `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` accordingly.

---

## 9. Restart & Recovery Behavior

1. **In-Memory Job State**:
   - `ProcessingJobManager` maintains processing job state in Python process memory (`self.jobs: Dict[str, JobRecord]`).
   - If FastAPI restarts while an ML job is in progress, the active Python subprocess is terminated, and the job record is cleared from memory.
2. **Database Resilience**:
   - Incidents ingested prior to a crash remain safely stored in PostgreSQL/PostGIS.
   - Re-running a failed job is idempotent (`ml_ingestion_service.py` skips duplicate detections and incidents).
3. **Crash Recovery**:
   - If FastAPI restarts, client UI polling `/api/v1/process/{job_id}` for an interrupted job receives `404 Not Found`.
   - Resolution: User resubmits video via dashboard.

---

## 10. Audit Questions Resolution

1. **All Environment Variables**: Listed in Section 3 above.
2. **Localhost / 127.0.0.1 Dependencies**:
   - Frontend `VITE_API_BASE_URL` in `dashboard/client/.env` points to `http://127.0.0.1:8000/api/v1`.
   - Frontend `api.ts` fallback points to `http://127.0.0.1:8000`.
   - Backend `POSTGRES_HOST` defaults to `localhost`.
   - `alembic.ini` hardcodes `localhost:5432`.
3. **Development-Only Configuration**: `DEBUG=True` in `src/core/config.py`, Vite debug collector plugin in `vite.config.ts`, CORS wildcard `allow_origins=["*"]`.
4. **CORS Requirements**: Wildcard CORS with credentials enabled must be updated for strict production domains.
5. **Google Maps API Key**: Requires domain referrer restriction in Google Cloud Console once deployed publicly.
6. **Upload-Size Limits**:
   - Python backend allows 500 MB uploads (`DEFAULT_MAX_UPLOAD_SIZE_BYTES`).
   - **Cloudflare Free Tier Tunnel caps HTTP POST body size at 100 MB**. Videos larger than 100 MB uploaded via Cloudflare Tunnel will return `413 Payload Too Large`.
7. **Filesystem Paths Assumed**: Zero hardcoded `D:\Civicpulse` paths. All paths are relative to current working directory (`os.getcwd()`).
8. **Background Job Restart**: In-memory dictionary reset on FastAPI process restart.
9. **FastAPI Restart During ML Job**: Subprocess killed, in-memory job status lost, DB ingested records preserved.
10. **Static Media Requirements**: `StaticFiles` mounted at `/static/evidence` and `/static/jobs`. Range requests supported natively.
11. **Secrets Security**: `.env` files and `alembic.ini` credentials must be kept out of version control.
12. **PostgreSQL Machine Independence**: Database can run on local host or remote cloud server seamlessly via environment configuration.
13. **ML Worker RTX 5070 Requirements**: PyTorch CUDA build, NVIDIA driver $\ge 545$, `civicpulse_best.pt`, MiDaS hub cache, FFmpeg on system PATH.
14. **Disaster Recovery Checklist**: Python 3.10+, Node.js 18+, PostgreSQL + PostGIS, PyTorch CUDA build, FFmpeg binary, `civicpulse_best.pt` weights.

---

## 11. Deployment Summary

### BLOCKERS
1. **Frontend `VITE_API_BASE_URL` Hardcoded to `127.0.0.1`**: `dashboard/client/.env` contains `http://127.0.0.1:8000/api/v1`. External browsers accessing via Cloudflare Tunnel cannot connect to `127.0.0.1`. **Must be set to public tunnel URL or relative path before frontend build.**
2. **Cloudflare Tunnel 100 MB Upload Limit**: Cloudflare Tunnel free tier restricts HTTP POST payloads to 100 MB. Sample flight videos (>100 MB) submitted via AI Ingest Studio will fail with `HTTP 413 Payload Too Large` unless compressed under 100 MB or chunked.

### WARNINGS
1. **`DEBUG=True` Enabled**: `src/core/config.py` has `DEBUG=True`, enabling Uvicorn auto-reloader and verbose error tracebacks.
2. **Wildcard CORS with Credentials**: `src/api/main.py` uses `allow_origins=["*"]` with `allow_credentials=True`.
3. **In-Memory Job State**: Job status resets if FastAPI process restarts.
4. **Google Maps API Key Domain Restrictions**: Key must be restricted to production HTTP referrers in Google Cloud Console.

### READY
1. **H.264 Browser Video Encoding**: Fully verified H.264 `yuv420p` + `+faststart` video pipeline.
2. **Geospatial PostgreSQL/PostGIS Schema & Migrations**: Automated database initialization and PostGIS geometry storage.
3. **Real GPU ML Processing**: NVIDIA RTX 5070 CUDA acceleration fully verified.
4. **Complete REST API Contract & Test Suite**: All 64 backend pytest tests passing, 0 TypeScript errors.

---

## 12. Recommended Deployment Sequence

1. **Step 1: Public Tunnel Endpoint Configuration**
   - Point Cloudflare Tunnel to `http://localhost:8000` (Backend API & Static Media) or configure reverse proxy.
   - Update `dashboard/client/.env` setting `VITE_API_BASE_URL=https://<your-cloudflare-domain>/api/v1`.
2. **Step 2: Frontend Production Build**
   - Run `npm run build` inside `dashboard/` to bundle static assets targeting the public URL.
3. **Step 3: Environment Hardening**
   - Set `APP_ENV=production` and `DEBUG=False` in backend `.env`.
   - Update `POSTGRES_PASSWORD` to secure production password.
   - Update `CORS_ORIGINS` to specify Cloudflare domain explicitly.
4. **Step 4: Database Migration Check**
   - Execute `.venv\Scripts\python -m alembic upgrade head` to verify PostGIS tables.
5. **Step 5: Process Launch & Verification**
   - Start Uvicorn backend process: `python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000`.
   - Launch Cloudflare Tunnel: `cloudflared tunnel run <tunnel_name>`.
   - Verify public health check `GET https://<your-cloudflare-domain>/health`.
