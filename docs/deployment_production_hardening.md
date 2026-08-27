# CivicPulse — Production Hardening & Configuration Guide

## 1. Production Environment Variables
Production configuration is fully driven by environment variables (`BaseSettings` in `src/core/config.py`).
- Backend settings template: `.env.example`
- Frontend settings template: `dashboard/client/.env.example`

Production environment parameters:
- `APP_ENV=production`
- `DEBUG=False`
- `HOST=0.0.0.0`
- `PORT=8000`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`

---

## 2. DEBUG Configuration
- `src/core/config.py` defines `DEBUG: bool = True` by default for local development.
- Setting `DEBUG=False` in production `.env` disables Uvicorn auto-reloading and prevents raw internal stack trace leaks.
- Development reloader and debug utilities remain fully available locally when `DEBUG=True`.

---

## 3. CORS Configuration
- In `src/api/main.py`, CORS is dynamically populated from `settings.CORS_ORIGINS`.
- **Local Dev Origins**: `http://localhost:3000`, `http://localhost:3001`, `http://127.0.0.1:3000`, `http://127.0.0.1:3001`, `http://localhost:5173`, `http://127.0.0.1:5173`.
- **Production Guidance**: Override `CORS_ORIGINS` in `.env` with explicit production origins (e.g. `CORS_ORIGINS=["https://<your-cloudflare-domain>"]`). Unrestricted wildcard `"*"` with `allow_credentials=True` is eliminated.

---

## 4. Frontend API URL Configuration
- `dashboard/client/src/services/api.ts` resolves API base URL from `import.meta.env.VITE_API_BASE_URL` or `process.env.VITE_API_BASE_URL`.
- Default fallback for local dev: `http://127.0.0.1:8000/api/v1`.
- Production deployment: Copy `dashboard/client/.env.example` to `dashboard/client/.env` and set `VITE_API_BASE_URL=https://<PUBLIC_API_HOST>/api/v1` prior to executing `npm run build`.

---

## 5. Cloudflare 100 MB Upload Constraint
- Cloudflare Tunnel free tier restricts HTTP POST body payloads to **100 MB**.
- Attempting to upload files $>100$ MB over a public Cloudflare Tunnel results in `HTTP 413 Payload Too Large`.
- Backend max upload setting remains `500 MB` for local high-throughput processing, avoiding unnecessary architecture refactoring.

---

## 6. Public Demo Video Selection
- `data_raw/full_demo_video.mp4` (~223 MB) remains the local benchmark dataset.
- `data_raw/public_demo_video.mp4` (~2.3 MB) + `data_raw/public_demo_video.srt` is selected as the public demonstration asset.
- At 2.3 MB, it comfortably passes through Cloudflare Tunnel without hitting upload limits while processing 21 accurate hazards in 12.6 seconds.

---

## 7. Google Maps Production Key Requirements
- The frontend Google Maps component (`@vis.gl/react-google-maps`) reads `VITE_GOOGLE_MAPS_API_KEY`.
- For public production deployments:
  1. Generate a dedicated Google Maps API Key in Google Cloud Console.
  2. Enable Maps JavaScript API & Geocoding API.
  3. Restrict the API key to the production domain/HTTP referrer (e.g. `https://<your-cloudflare-domain>/*`).

---

## 8. Secrets & Git Safety
- `.gitignore` explicitly enforces exclusion of sensitive secrets and runtime artifacts:
  - Secrets: `.env`, `*.env`
  - Uploads: `uploads/`
  - Generated ML outputs: `outputs/*` (except `!outputs/.gitkeep`)
  - Test/scratch artifacts: `scratch/jobs/`
- Local model weights (`models/production/civicpulse_best.pt`) are preserved locally without committing large binary files to Git.

---

## 9. Static Media Configuration
- FastAPI static mounts in `src/api/main.py`:
  - `/static/evidence` $\rightarrow$ `outputs/evidence`
  - `/static/jobs` $\rightarrow$ `outputs/jobs`
- Media files are served relative to working directory `os.getcwd()` without reliance on hardcoded `D:\Civicpulse` paths.
- HTTP Range Requests (`206 Partial Content`, `Accept-Ranges: bytes`) are handled out-of-the-box by Starlette `StaticFiles`.

---

## 10. In-Memory Job-State Limitation
- `ProcessingJobManager` maintains active processing jobs in Python process memory (`self.jobs: Dict[str, JobRecord]`).
- **Restart Limitation**: If the FastAPI process restarts during an active processing job, the in-memory job dictionary is reset, and the client polling `/api/v1/process/{job_id}` receives `404 Not Found`.
- **Data Integrity**: Incidents and evidence ingested into PostgreSQL/PostGIS prior to or after job completion remain 100% persistent and unaffected.
- **Recovery**: The user can resubmit the job via the dashboard.

---

## 12. Local Regression Results
- **Pytest Backend Test Suite**: **64 / 64 passed (100%) in 6.71s**.
- **Vitest Frontend Test Suite**: **30 / 30 passed (100%) in 7.73s**.
- **TypeScript Type Check**: **0 errors** (`tsc --noEmit` passed cleanly).
- **Application Behavior**: Preserved 100% compatibility across ML processing, API endpoints, PostGIS ingestion, and frontend UI.

---

## 13. Production Data Source & Mock Data Isolation

### Production Data Source
PostgreSQL/PostGIS is the single authoritative source of truth for incidents, evidence, detections, inspections, and assignments in production. Mock incident fixtures are available only when explicitly enabled for offline development or unit testing.

- **Production Setting**: `VITE_USE_MOCK_DATA=false` (Default)
- **Mock Mode Setting**: `VITE_USE_MOCK_DATA=true` (Used explicitly in unit testing or offline development)

### Production Incident State Architecture
1. **No Auto-Seeding**: `ensureBackendSeeded()` is completely disabled when `VITE_USE_MOCK_DATA=false`. No mock fixtures (`INITIAL_MOCK_INCIDENTS`) are inserted into PostgreSQL.
2. **No Mock Fallback**: If backend API queries fail or return empty results, the dashboard renders an appropriate empty state ("No incidents found" / "Evidence unavailable") rather than substituting mock incidents.
3. **LocalStorage Handling**: LocalStorage key `civicpulse_incidents_v1` is ignored in production mode. Stale mock incident objects in local browser storage are never loaded into the production queue or migrated to the backend. LocalStorage is strictly reserved for user UI preferences (theme, view mode, filters).
4. **Real Media Resolution**: Evidence and video stream URLs are derived strictly from real backend file paths returned by `GET /api/v1/incidents/{id}/evidence`.

---

## 14. Remaining Deployment Prerequisites
1. Select/initialize public Cloudflare Tunnel hostname.
2. Update `dashboard/client/.env` setting `VITE_API_BASE_URL` to public HTTPS URL.
3. Build production frontend bundle (`npm run build`).
4. Set `APP_ENV=production` and `DEBUG=False` in backend `.env`.
5. Launch Uvicorn backend server & Cloudflare Tunnel daemon.
