# CivicPulse — P1 Fix: Real Evidence JPG Serving and Browser Loading Log

## 1. Executive Summary
- **Objective**: Ensure real JPG evidence captures generated during ML video processing pipelines are reliably served over HTTP/HTTPS by FastAPI and rendered in the React dashboard (`IncidentCard` and `EvidenceViewer`).
- **Resolution**: Configured canonical absolute storage path resolution for `EVIDENCE_DIR` and `JOBS_DIR` anchored at `PROJECT_ROOT`, mounted `/static/jobs` in FastAPI `main.py` using `settings.JOBS_DIR`, added automated unit and security tests for static job evidence serving, and added unit tests in the frontend client for `getEvidenceMediaUrl` and `getIncidentVideoUrlFromEvidencePath`.
- **Scope Compliance**: Media serving and URL integration fix only. No YOLO model weights, training scripts, ML inference code, confidence calculation, severity logic, database records, or synthetic SVG fallback logic were modified.

---

## 2. Root Cause Analysis

### 2.1 The Issue
- Previously, FastAPI mounted `/static/jobs` with a relative string `StaticFiles(directory="outputs/jobs")` and `settings.EVIDENCE_DIR = "outputs/evidence"`.
- When the application is launched from different execution directories (e.g. subfolders, test runners, or alternative working directories), relative directory paths resolve relative to `os.getcwd()`, leading to missing directories and HTTP 404 Not Found errors when accessing `/static/jobs/<job_id>/evidence/<filename>.jpg`.
- Furthermore, automated test coverage specifically tested `/static/evidence` but lacked dedicated tests for `/static/jobs` serving, 404 handling, and traversal prevention.

### 2.2 Concrete Path Trace for Real Job & Incident Record

| Pipeline Stage | Value / Representation |
| :--- | :--- |
| **Physical Filesystem** | `D:\Not-So-Smart_ELCIA\outputs\jobs\4f487feb-b006-4068-a88d-915f408e6375\evidence\hazard_1_LOW.jpg` (Size: 174,442 bytes, Valid JPEG) |
| **Database Incident ID** | `ab21e0c7-535a-477c-969a-d74a1a49307d` |
| **Database Evidence ID** | `a0296ba9-2a06-4591-a294-1f81d1872ed7` |
| **Database `Evidence.file_path`** | `outputs/jobs/4f487feb-b006-4068-a88d-915f408e6375/evidence/hazard_1_LOW.jpg` |
| **API Response (`GET /api/v1/incidents/{id}/evidence`)** | `[{"id":"a0296ba9-2a06-4591-a294-1f81d1872ed7","incident_id":"ab21e0c7-535a-477c-969a-d74a1a49307d","evidence_type":"IMAGE","file_path":"outputs/jobs/4f487feb-b006-4068-a88d-915f408e6375/evidence/hazard_1_LOW.jpg","description":"Auto-captured damaged_footpath evidence (Risk: LOW)","is_primary":true,"captured_at":null,"created_at":"2026-09-05T06:58:10.279674Z"}]` |
| **Frontend `getEvidenceMediaUrl`** | `http://127.0.0.1:8000/static/jobs/4f487feb-b006-4068-a88d-915f408e6375/evidence/hazard_1_LOW.jpg` |
| **HTTP Response** | `HTTP/1.1 200 OK`, `Content-Type: image/jpeg`, `Content-Length: 174442` |

---

## 3. Files Changed and Exact Code Modifications

### 1. `src/core/config.py`
- Defined canonical `PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent`.
- Defined `EVIDENCE_DIR`, `JOBS_DIR`, and `PREDICTIONS_DIR` as absolute paths rooted at `PROJECT_ROOT`.

```python
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    ...
    # Storage Settings (Canonical absolute paths relative to PROJECT_ROOT)
    EVIDENCE_DIR: str = str(PROJECT_ROOT / "outputs" / "evidence")
    JOBS_DIR: str = str(PROJECT_ROOT / "outputs" / "jobs")
    PREDICTIONS_DIR: str = str(PROJECT_ROOT / "outputs" / "predictions")
```

---

### 2. `src/api/main.py`
- Mounted `/static/jobs` using `settings.JOBS_DIR` and ensured directories are initialized.

```python
    # Ensure evidence output and job output directories exist
    os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
    os.makedirs(settings.JOBS_DIR, exist_ok=True)

    # Mount static files for evidence under /static/evidence, /evidence, and /static/jobs
    app.mount(
        "/static/evidence",
        StaticFiles(directory=settings.EVIDENCE_DIR),
        name="static_evidence",
    )
    app.mount(
        "/evidence",
        StaticFiles(directory=settings.EVIDENCE_DIR),
        name="evidence",
    )
    app.mount(
        "/static/jobs",
        StaticFiles(directory=settings.JOBS_DIR),
        name="static_jobs",
    )
```

---

### 3. `tests/api/test_evidence_static.py`
- Added comprehensive unit and security tests for `/static/jobs`:
  - `test_valid_job_evidence_static_serving`: Verifies HTTP 200 and `image/jpeg` header on real job files.
  - `test_nonexistent_job_evidence_returns_404`: Verifies HTTP 404 for nonexistent job files.
  - `test_job_evidence_path_traversal_prevention`: Verifies path traversal (`../`) attempts are rejected.

---

### 4. `dashboard/client/src/__tests__/incidentService.test.ts`
- Added unit tests for `getEvidenceMediaUrl` and `getIncidentVideoUrlFromEvidencePath`:
  - Validates `outputs/jobs/<job_id>/evidence/<filename>.jpg` conversion to `http://127.0.0.1:8000/static/jobs/...`.
  - Validates Windows backslash normalization.
  - Validates global fallback path conversion.
  - Validates derived video MP4 URL extraction.

---

## 4. Verification and Security Analysis

### 4.1 Security Considerations
- **Sandboxed Root**: `StaticFiles` is mounted strictly on `settings.JOBS_DIR` (`outputs/jobs`) and `settings.EVIDENCE_DIR` (`outputs/evidence`).
- **Path Traversal Protection**: Starlette / FastAPI `StaticFiles` rejects directory escape attempts (`/static/jobs/../config.py` and URL-encoded `/static/jobs/..%2fconfig.py`), returning HTTP 404.
- **Unexposed Directories**: Application source (`/static/src`), database (`/static/db`), configs, and models remain inaccessible.

### 4.2 End-to-End Real HTTP Request Verification
```bash
# Real job evidence file request
curl.exe -I -s "http://127.0.0.1:8000/static/jobs/49559b26-9c73-4037-9f67-0fd7f711c6f3/evidence/hazard_1_LOW.jpg"

HTTP/1.1 200 OK
date: Sat, 05 Sep 2026 10:11:46 GMT
server: uvicorn
content-type: image/jpeg
accept-ranges: bytes
content-length: 174442
last-modified: Sat, 05 Sep 2026 07:01:03 GMT
etag: "7f1ad6a0f2bb019d61f2d6ae6a72e819"
```

```bash
# Nonexistent evidence file request
curl.exe -I -s "http://127.0.0.1:8000/static/jobs/nonexistent-job-id/evidence/hazard_1_LOW.jpg"

HTTP/1.1 404 Not Found
```

```bash
# Path traversal prevention request
curl.exe -I -s "http://127.0.0.1:8000/static/jobs/../config.py"

HTTP/1.1 404 Not Found
```

---

## 5. Automated Test Results

### 5.1 Backend Static Serving Tests (`tests/api/test_evidence_static.py`)
```
tests/api/test_evidence_static.py::test_valid_evidence_static_serving PASSED     [ 14%]
tests/api/test_evidence_static.py::test_nonexistent_evidence_returns_404 PASSED [ 28%]
tests/api/test_evidence_static.py::test_path_traversal_prevention PASSED        [ 42%]
tests/api/test_evidence_static.py::test_unexposed_directories_are_not_served PASSED [ 57%]
tests/api/test_evidence_static.py::test_valid_job_evidence_static_serving PASSED [ 71%]
tests/api/test_evidence_static.py::test_nonexistent_job_evidence_returns_404 PASSED [ 85%]
tests/api/test_evidence_static.py::test_job_evidence_path_traversal_prevention PASSED [100%]

============================== 7 passed in 0.24s ==============================
```

### 5.2 Full Backend Pytest Suite
```
================= 77 passed, 1 skipped, 16 warnings in 44.89s =================
```

### 5.3 Frontend Vitest Suite
```
 Test Files  7 passed (7)
      Tests  53 passed (53)
   Duration  12.02s
```

---

## 6. Safety & Non-Regression Confirmation
- [x] **No ML model weights changed**
- [x] **No ML training code changed**
- [x] **No YOLO inference logic changed**
- [x] **No confidence calculation or severity analyzer changed**
- [x] **No database reset, deletion, or reseeding performed**
- [x] **Synthetic SVG fallback maintained**: Gracefully handles missing evidence or 404s without UI disruption.
