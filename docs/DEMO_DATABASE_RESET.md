# CivicPulse Demo Database Reset Guide

This document describes the **Fresh Demo Database Reset** utility (`scripts/reset_demo_db.py`), its safety architecture, and step-by-step instructions for resetting the CivicPulse database and demo artifacts before presentations or demonstrations.

---

## 1. Overview & Purpose

During live demonstrations, evaluations, or Demo Day walkthroughs, operators generate live detections, assign repair crews, update incident statuses, and upload inspection reports.

The **Fresh Demo Database Reset** utility restores the system to a clean operational state by:
1. **Removing operational activity records** (`incidents`, `detections`, `evidence`, `assignments`, `incident_status_history`, `inspections`).
2. **Preserving essential baseline operational setup** (`users` and `zones`, including standard ELCIA operational zones `EC-01` through `EC-04`).
3. **Preserving all database structures** (PostgreSQL schema, table definitions, constraints, indexes, PostGIS spatial extensions, and Alembic migration state).
4. **Optionally cleaning demo-generated files** (video clips, evidence frames, JSON prediction logs) without touching model weights or repository code.

> [!IMPORTANT]
> The reset utility does **NOT** run `DROP SCHEMA`, `DROP DATABASE`, or destructive Alembic downgrades. It deletes operational activity records transactionally and leaves database schema, migrations, zones, and users completely intact. No re-seeding (`seed_database.py`) is required after reset.

---

## 2. Triple-Barrier Safety Architecture

To prevent accidental data loss across development or production environments, `scripts/reset_demo_db.py` enforces three mandatory safety barriers:

```text
               ┌───────────────────────────────┐
               │    python reset_demo_db.py    │
               └───────────────┬───────────────┘
                               │
               ┌───────────────▼───────────────┐
               │  Barrier 1: Dry-Run by Default│ ──[ No --confirm ]──► Preview Only & Exit 0
               └───────────────┬───────────────┘
                               │ (with --confirm)
               ┌───────────────▼───────────────┐
               │ Barrier 2: Environment Var    │ ──[ Not set ]───────► Refuse & Exit 1
               │ CIVICPULSE_ALLOW_DEMO_RESET   │
               └───────────────┬───────────────┘
                               │ (set to 'true')
               ┌───────────────▼───────────────┐
               │ Barrier 3: Typed Phrase Check │ ──[ Mismatch ]──────► Abort & Exit 1
               │ "RESET CIVICPULSE DEMO DB"    │
               └───────────────┬───────────────┘
                               │ (phrase matches)
               ┌───────────────▼───────────────┐
               │ Transactional Reset & Verify  │ ──► Commit 0 Rows & Verify Migrations
               └───────────────────────────────┘
```

1. **Barrier 1: Dry-Run by Default**  
   Running `python scripts/reset_demo_db.py` without `--confirm` performs **zero deletions**. It queries and displays current table counts and instructions.
2. **Barrier 2: Environment Authorization**  
   The script requires `CIVICPULSE_ALLOW_DEMO_RESET=true` (or `1`, `yes`) to be explicitly exported in the current session.
3. **Barrier 3: Interactive Confirmation Phrase**  
   The script prompts the user to type the exact confirmation phrase:  
   `RESET CIVICPULSE DEMO DATABASE`  
   Any typographical mismatch immediately aborts the operation.

---

## 3. Database Table Deletion Order

Foreign key constraints require child records to be deleted prior to parent records. The script executes deletions in the following strict order inside a single atomic database transaction:

| Order | Table Name | Relationship / Dependency | Action |
| :---: | :--- | :--- | :--- |
| **1** | `inspections` | Depends on `incidents`, `users`, `evidence` | Deleted |
| **2** | `incident_status_history` | Depends on `incidents`, `users` | Deleted |
| **3** | `assignments` | Depends on `incidents`, `users` | Deleted |
| **4** | `evidence` | Depends on `incidents` | Deleted |
| **5** | `detections` | Depends on `incidents` | Deleted |
| **6** | `incidents` | Depends on `zones` | Deleted |

### Preserved Infrastructure & Operational Setup Tables
- **`zones`**: Preserves operational sectors (`EC-01` to `EC-04`) and geospatial boundary definitions.
- **`users`**: Preserves registered operators, field inspectors, and administrators.
- **`alembic_version`**: Preserves Alembic migration tracking. The database stays at the latest migration version.
- **`spatial_ref_sys`**: Preserves PostGIS spatial reference system definitions.
- **PostgreSQL System Catalogs**: System schemas and internal extensions remain completely untouched.

---

## 4. How to Execute a Demo Reset

### Step 1: Preview Current State (Dry Run)
Inspect current row counts without deleting anything:
```bash
python scripts/reset_demo_db.py
```

### Step 2: Authorize and Execute Reset

#### On Linux / macOS (Bash / Zsh):
```bash
# 1. Authorize the session
export CIVICPULSE_ALLOW_DEMO_RESET=true

# 2. Run reset with confirmation
python scripts/reset_demo_db.py --confirm

# 3. When prompted, type:
# RESET CIVICPULSE DEMO DATABASE
```

#### On Windows (PowerShell):
```powershell
# 1. Authorize the session
$env:CIVICPULSE_ALLOW_DEMO_RESET = "true"

# 2. Run reset with confirmation
python scripts/reset_demo_db.py --confirm

# 3. When prompted, type:
# RESET CIVICPULSE DEMO DATABASE
```

---

## 5. Optional File Cleanup (`--clean-files`)

To delete demo-generated media assets (annotated video clips, cropped detection frames, uploaded raw files) along with database records, pass `--clean-files`:

```bash
python scripts/reset_demo_db.py --confirm --clean-files
```

### Files Cleaned:
- `outputs/jobs/*` (Job output videos and processing logs)
- `outputs/evidence/*` (Cropped hazard frame JPEGs)
- `outputs/incidents/*` (Incident video clips and exports)
- `outputs/predictions/*` (Raw mask overlays)
- `uploads/*` (Uploaded video/SRT temp directories)

### Files Strictly Preserved:
- `.gitkeep` and `.gitignore` files
- Production model weights (`models/production/best.pt`, `.pt`, `.onnx`, `.engine`)
- Source code, tests, documentation, and configuration files

---

## 6. Ready for Immediate Demo Day Use

Because operational zones (`EC-01` through `EC-04`) and system users are preserved:
- **No re-seeding is required.**
- The CivicPulse Dashboard and FastAPI Backend can immediately accept fresh video uploads, run AI detections, assign repairs, and advance municipal triage workflows on clean ground truth.
