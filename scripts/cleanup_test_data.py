#!/usr/bin/env python3
"""
scripts/cleanup_test_data.py
CivicPulse — Safe Database Test & Demo Data Cleanup Utility

A standalone CLI utility for safely inspecting, categorizing, and cleaning up
known test and demo data from the CivicPulse database without touching live/production records.

Default mode is DRY RUN (no deletion performed without explicit --confirm).
"""

import sys
import os
import uuid
import argparse
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional, Tuple

# Silence verbose SQLAlchemy query logs
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy.orm import Session, selectinload
from src.db.session import SessionLocal, engine
from src.db.models.incident import Incident
from src.db.models.detection import Detection
from src.db.models.evidence import Evidence
from src.db.models.assignment import Assignment
from src.db.models.inspection import Inspection
from src.db.models.history import IncidentStatusHistory


# ==============================================================================
# 1. KNOWN TEST & DEMO IDENTIFIERS / MARKERS
# ==============================================================================

# Explicit job ID markers generated during automated unit, integration, and E2E test suites
KNOWN_TEST_JOB_MARKERS: List[str] = [
    "fiveclass",
    "idempotent",
    "nullgps",
    "missing",
    "malformed",
    "invalidcls",
    "misev",
    "noconf",
    "badconf",
    "e2econf",
    "realdur",
    "shortdur",
    "nodur",
    "deriveddur",
    "test-job",
    "e2e-test",
    "mock-job",
    "null-gps",
]

# Explicit incident code prefixes created exclusively for tests and demo fixtures
KNOWN_DEMO_CODE_PREFIXES: List[str] = [
    "INC-DEMO-",
    "EC-DEMO-",
    "DEMO-",
]

KNOWN_TEST_CODE_PREFIXES: List[str] = [
    "TEST-INC-",
    "INC-TEST-",
    "INC-MANHOLE-",
    "INC-DUR-",
    "EC-ANTIGRAVITY-",
    "TST-INC-",
]

# File extensions protected from any filesystem cleanup
PROTECTED_EXTENSIONS: Set[str] = {
    ".py", ".pyc", ".ts", ".tsx", ".js", ".jsx", ".json", ".yaml", ".yml",
    ".md", ".txt", ".sh", ".ps1", ".env", ".gitignore", ".pt", ".pth", ".onnx", ".engine"
}


# ==============================================================================
# 2. DATA STRUCTURES
# ==============================================================================

@dataclass
class IncidentCandidate:
    id: str
    incident_code: str
    incident_type: str
    status: str
    priority: str
    created_at: str
    job_id: Optional[str]
    classification: str  # "TEST_DEMO", "PROTECTED_LIVE", "AMBIGUOUS"
    reason: str
    detections_count: int = 0
    evidence_count: int = 0
    assignments_count: int = 0
    inspections_count: int = 0
    status_history_count: int = 0
    evidence_file_paths: List[str] = field(default_factory=list)


# ==============================================================================
# 3. CLASSIFICATION ENGINE
# ==============================================================================

def get_real_local_job_folders() -> Set[str]:
    """Scan outputs/jobs/ directory for confirmed local job directories."""
    jobs_dir = PROJECT_ROOT / "outputs" / "jobs"
    if not jobs_dir.exists():
        return set()
    return {
        p.name.lower()
        for p in jobs_dir.iterdir()
        if p.is_dir() and not any(marker in p.name.lower() for marker in KNOWN_TEST_JOB_MARKERS)
    }


def classify_incident_record(
    incident: Incident,
    detections: List[Detection],
    evidence_records: List[Evidence],
    real_job_folders: Set[str],
) -> Tuple[str, str, Optional[str]]:
    """
    Classify an incident record into:
      - 'TEST_DEMO': Positively identified as a test or demo fixture.
      - 'PROTECTED_LIVE': Positively identified as a genuine live/processed incident.
      - 'AMBIGUOUS': Lacks conclusive test markers or local live job match. Skipped by default.
    
    Returns:
      (classification, reason, extracted_job_id)
    """
    code = (incident.incident_code or "").strip()
    rec_action = (incident.recommended_action or "").strip()

    # Extract job_id from detections metadata
    extracted_job_id: Optional[str] = None
    is_demo_meta: bool = False
    for det in detections:
        meta = getattr(det, "detection_metadata", None)
        if meta is None and hasattr(det, "metadata") and isinstance(det.metadata, dict):
            meta = det.metadata
        if meta and isinstance(meta, dict):
            if "job_id" in meta:
                extracted_job_id = str(meta["job_id"]).strip()
            if meta.get("is_demo") is True:
                is_demo_meta = True

    # 1. Check for explicit DEMO markers
    if any(code.upper().startswith(p.upper()) for p in KNOWN_DEMO_CODE_PREFIXES):
        return ("TEST_DEMO", f"Incident code matches demo pattern '{code}'", extracted_job_id)

    if rec_action.startswith("DEMO:"):
        return ("TEST_DEMO", "Recommended action contains explicit 'DEMO:' marker", extracted_job_id)

    if is_demo_meta:
        return ("TEST_DEMO", "Detection metadata has 'is_demo': True", extracted_job_id)

    for ev in evidence_records:
        if ev.file_path and "outputs/evidence/demo_" in ev.file_path.replace("\\", "/"):
            return ("TEST_DEMO", f"Evidence file references demo asset: {ev.file_path}", extracted_job_id)

    # 2. Check for explicit TEST incident code prefixes
    if any(code.upper().startswith(p.upper()) for p in KNOWN_TEST_CODE_PREFIXES):
        return ("TEST_DEMO", f"Incident code matches test pattern '{code}'", extracted_job_id)

    # 3. Check for explicit TEST job markers in job_id or incident code
    job_str = (extracted_job_id or "").lower()
    for marker in KNOWN_TEST_JOB_MARKERS:
        if marker in job_str:
            return ("TEST_DEMO", f"Job ID contains test marker '{marker}' ({extracted_job_id})", extracted_job_id)
        if f"-{marker.upper()}-" in code.upper() or code.upper().endswith(f"-{marker.upper()}"):
            return ("TEST_DEMO", f"Incident code contains test marker '{marker}' ({code})", extracted_job_id)

    # 4. Check if incident corresponds to a confirmed live local job directory
    if code.startswith("INC-") and len(code.split("-")) >= 3:
        job_prefix = code.split("-")[1].lower()
        matched_real = [jf for jf in real_job_folders if jf.startswith(job_prefix)]
        if matched_real:
            return ("PROTECTED_LIVE", f"Matched active local job directory '{matched_real[0]}'", extracted_job_id)

    if extracted_job_id:
        job_id_clean = extracted_job_id.lower()
        if any(job_id_clean.startswith(jf) or jf.startswith(job_id_clean) for jf in real_job_folders):
            return ("PROTECTED_LIVE", f"Job ID matches active local job folder", extracted_job_id)

    # 5. Default fallback for records without positive test markers: AMBIGUOUS
    return ("AMBIGUOUS", "No positive test marker; no active local job folder match", extracted_job_id)


def inspect_database_incidents(
    db: Session,
    filter_code: Optional[str] = None,
    filter_job: Optional[str] = None,
    filter_marker: Optional[str] = None,
) -> List[IncidentCandidate]:
    """Inspect all incidents in the database and return classified candidates using efficient eager loading."""
    real_job_folders = get_real_local_job_folders()
    incidents = (
        db.query(Incident)
        .options(
            selectinload(Incident.detections),
            selectinload(Incident.evidence),
            selectinload(Incident.assignments),
            selectinload(Incident.inspections),
            selectinload(Incident.status_history),
        )
        .order_by(Incident.created_at.asc())
        .all()
    )

    candidates: List[IncidentCandidate] = []

    for inc in incidents:
        dets = inc.detections or []
        evs = inc.evidence or []
        assigns = inc.assignments or []
        insps = inc.inspections or []
        history = inc.status_history or []

        classification, reason, job_id = classify_incident_record(inc, dets, evs, real_job_folders)

        # Apply targeted CLI filters if provided
        if filter_code and filter_code.lower() not in (inc.incident_code or "").lower():
            continue
        if filter_job and (not job_id or filter_job.lower() not in job_id.lower()):
            continue
        if filter_marker:
            marker_l = filter_marker.lower()
            code_l = (inc.incident_code or "").lower()
            job_l = (job_id or "").lower()
            if marker_l not in code_l and marker_l not in job_l and marker_l not in reason.lower():
                continue

        evidence_paths = [ev.file_path for ev in evs if ev.file_path]

        cand = IncidentCandidate(
            id=str(inc.id),
            incident_code=inc.incident_code or str(inc.id),
            incident_type=inc.incident_type.value if hasattr(inc.incident_type, "value") else str(inc.incident_type),
            status=inc.status.value if hasattr(inc.status, "value") else str(inc.status),
            priority=inc.priority.value if hasattr(inc.priority, "value") else str(inc.priority),
            created_at=str(inc.created_at),
            job_id=job_id,
            classification=classification,
            reason=reason,
            detections_count=len(dets),
            evidence_count=len(evs),
            assignments_count=len(assigns),
            inspections_count=len(insps),
            status_history_count=len(history),
            evidence_file_paths=evidence_paths,
        )
        candidates.append(cand)

    return candidates


# ==============================================================================
# 4. SAFE FILESYSTEM CLEANUP
# ==============================================================================

def is_safe_to_delete_evidence_file(
    file_path: str,
    candidate_job_id: Optional[str],
    protected_evidence_paths: Set[str],
) -> bool:
    """
    Check if an on-disk evidence file is safe to remove:
      1. Must not be in protected_evidence_paths.
      2. Must be within the outputs/ directory.
      3. Must not have a protected file extension (.py, .pt, .yaml, etc.).
      4. Must belong to a known test job or demo pattern.
    """
    if not file_path:
        return False

    norm_path = file_path.replace("\\", "/")
    if norm_path in protected_evidence_paths:
        return False

    target_path = Path(norm_path)
    if not target_path.is_absolute():
        target_path = PROJECT_ROOT / target_path

    if target_path.suffix.lower() in PROTECTED_EXTENSIONS:
        return False

    outputs_root = (PROJECT_ROOT / "outputs").resolve()
    try:
        resolved_target = target_path.resolve()
        resolved_target.relative_to(outputs_root)
    except (ValueError, RuntimeError):
        return False

    path_str = str(resolved_target).lower()
    is_demo_file = "demo_" in path_str or "outputs/evidence/demo_" in path_str.replace("\\", "/")
    is_test_job_file = (
        candidate_job_id
        and any(m in candidate_job_id.lower() for m in KNOWN_TEST_JOB_MARKERS)
        and candidate_job_id.lower() in path_str
    )

    return bool(is_demo_file or is_test_job_file)


# ==============================================================================
# 5. TRANSACTIONAL DELETION ENGINE
# ==============================================================================

def execute_cleanup(
    db: Session,
    candidates_to_delete: List[IncidentCandidate],
    all_candidates: List[IncidentCandidate],
    clean_files: bool = False,
) -> Dict[str, int]:
    """
    Execute relational deletion inside an explicit database transaction.
    If any step fails, transaction is rolled back completely.
    """
    if not candidates_to_delete:
        return {"incidents": 0, "detections": 0, "evidence": 0, "assignments": 0, "inspections": 0, "history": 0, "files": 0}

    # Build set of protected evidence file paths from non-test candidates
    protected_paths: Set[str] = set()
    for cand in all_candidates:
        if cand.classification != "TEST_DEMO":
            for p in cand.evidence_file_paths:
                protected_paths.add(p.replace("\\", "/"))

    counts = {
        "incidents": 0,
        "detections": 0,
        "evidence": 0,
        "assignments": 0,
        "inspections": 0,
        "history": 0,
        "files": 0,
    }

    files_to_delete: List[Path] = []
    job_dirs_to_check: Set[Path] = set()

    try:
        for cand in candidates_to_delete:
            try:
                inc_id = uuid.UUID(cand.id) if isinstance(cand.id, str) else cand.id
            except (ValueError, TypeError, AttributeError):
                inc_id = cand.id

            # 1. Collect files to delete if requested
            if clean_files:
                for fp in cand.evidence_file_paths:
                    if is_safe_to_delete_evidence_file(fp, cand.job_id, protected_paths):
                        p = Path(fp) if Path(fp).is_absolute() else PROJECT_ROOT / fp
                        if p.exists() and p.is_file():
                            files_to_delete.append(p)
                            if "outputs/jobs" in str(p).replace("\\", "/"):
                                job_dirs_to_check.add(p.parent.parent)

            # 2. Relational deletions in safe foreign-key order
            # Child: Inspections
            insp_deleted = db.query(Inspection).filter(Inspection.incident_id == inc_id).delete(synchronize_session=False)
            counts["inspections"] += insp_deleted

            # Child: Assignments
            assign_deleted = db.query(Assignment).filter(Assignment.incident_id == inc_id).delete(synchronize_session=False)
            counts["assignments"] += assign_deleted

            # Child: Status History
            hist_deleted = db.query(IncidentStatusHistory).filter(IncidentStatusHistory.incident_id == inc_id).delete(synchronize_session=False)
            counts["history"] += hist_deleted

            # Child: Detections
            det_deleted = db.query(Detection).filter(Detection.incident_id == inc_id).delete(synchronize_session=False)
            counts["detections"] += det_deleted

            # Child: Evidence
            ev_deleted = db.query(Evidence).filter(Evidence.incident_id == inc_id).delete(synchronize_session=False)
            counts["evidence"] += ev_deleted

            # Parent: Incident
            inc_deleted = db.query(Incident).filter(Incident.id == inc_id).delete(synchronize_session=False)
            counts["incidents"] += inc_deleted

        # Commit database transaction
        db.commit()

        # Delete safe on-disk files only after DB commit succeeds
        if clean_files:
            for f in files_to_delete:
                try:
                    if f.exists() and f.is_file():
                        f.unlink()
                        counts["files"] += 1
                except Exception as file_err:
                    print(f"  [WARN] Failed to delete file '{f}': {file_err}")

            # Clean empty test job directories
            for jdir in job_dirs_to_check:
                try:
                    if jdir.exists() and jdir.is_dir() and not any(jdir.iterdir()):
                        jdir.rmdir()
                except Exception:
                    pass

        return counts

    except Exception as exc:
        db.rollback()
        raise RuntimeError(f"Database cleanup transaction failed and was rolled back: {exc}") from exc


# ==============================================================================
# 6. OUTPUT & PRESENTATION
# ==============================================================================

def print_candidates_table(candidates: List[IncidentCandidate], title: str = "Database Records Classification"):
    """Print formatted ASCII table of candidate records."""
    print(f"\n{'=' * 105}")
    print(f" {title.upper()}")
    print(f"{'=' * 105}")
    print(f"{'Classification':<16} | {'Code':<18} | {'Type':<17} | {'Status':<10} | {'Job ID':<22} | {'Reason'}")
    print(f"{'-' * 16}-+-{'-' * 18}-+-{'-' * 17}-+-{'-' * 10}-+-{'-' * 22}-+-{'-' * 20}")

    for c in candidates:
        cls_tag = f"[{c.classification}]"
        job_display = (c.job_id[:20] + "..") if c.job_id and len(c.job_id) > 22 else (c.job_id or "-")
        reason_short = (c.reason[:48] + "..") if len(c.reason) > 50 else c.reason
        print(f"{cls_tag:<16} | {c.incident_code:<18} | {c.incident_type:<17} | {c.status:<10} | {job_display:<22} | {reason_short}")

    print(f"{'=' * 105}\n")


# ==============================================================================
# 7. MAIN CLI ENTRYPOINT
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="CivicPulse Safe Database Test & Demo Data Cleanup Utility",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # 1. Dry run (default — inspects candidates without deleting):
  python scripts/cleanup_test_data.py

  # 2. List all records categorized as TEST_DEMO, PROTECTED_LIVE, or AMBIGUOUS:
  python scripts/cleanup_test_data.py --list

  # 3. Perform confirmed cleanup of verified test/demo data (requires confirmation):
  python scripts/cleanup_test_data.py --confirm

  # 4. Non-interactive confirmed cleanup (e.g. CI / scripts):
  python scripts/cleanup_test_data.py --confirm --yes

  # 5. Targeted cleanup for a specific test incident or job:
  python scripts/cleanup_test_data.py --incident-code INC-DEMO-001 --confirm
  python scripts/cleanup_test_data.py --job-id 9227d3e8-fiveclass --confirm
        """
    )
    parser.add_argument("--list", action="store_true", help="List all database records and their classifications without deleting.")
    parser.add_argument("--confirm", action="store_true", help="Enable deletion mode. Default without --confirm is strictly a DRY RUN.")
    parser.add_argument("-y", "--yes", action="store_true", help="Automatically accept confirmation prompt (requires --confirm).")
    parser.add_argument("--clean-files", action="store_true", help="Also safely delete verified on-disk test evidence files.")
    parser.add_argument("--incident-code", type=str, default=None, help="Target a specific incident code for cleanup.")
    parser.add_argument("--job-id", type=str, default=None, help="Target a specific job ID for cleanup.")
    parser.add_argument("--marker", type=str, default=None, help="Filter by specific test marker keyword.")

    args = parser.parse_args()

    db: Session = SessionLocal()
    try:
        # 1. Inspect and classify all database records
        candidates = inspect_database_incidents(
            db=db,
            filter_code=args.incident_code,
            filter_job=args.job_id,
            filter_marker=args.marker,
        )

        test_candidates = [c for c in candidates if c.classification == "TEST_DEMO"]
        live_candidates = [c for c in candidates if c.classification == "PROTECTED_LIVE"]
        ambiguous_candidates = [c for c in candidates if c.classification == "AMBIGUOUS"]

        # 2. List Mode
        if args.list:
            print_candidates_table(candidates, title="Database Records Classification Summary")
            print("Classification Breakdown:")
            print(f"  - Safe Test/Demo Candidates : {len(test_candidates)}")
            print(f"  - Protected Live Records    : {len(live_candidates)}")
            print(f"  - Ambiguous Records (Skip)  : {len(ambiguous_candidates)}")
            print(f"  - Total Records Evaluated   : {len(candidates)}\n")
            return

        # 3. Dry-Run Mode (Default when --confirm is omitted)
        if not args.confirm:
            print("\n=======================================================")
            print(" CivicPulse Test Data Cleanup — DRY RUN MODE (DEFAULT)")
            print("=======================================================")
            if test_candidates:
                print_candidates_table(test_candidates, title="Candidates Identified for Safe Deletion (Dry Run)")
            else:
                print("\n[INFO] Zero candidate test records identified.")

            tot_det = sum(c.detections_count for c in test_candidates)
            tot_ev = sum(c.evidence_count for c in test_candidates)
            tot_as = sum(c.assignments_count for c in test_candidates)
            tot_in = sum(c.inspections_count for c in test_candidates)
            tot_hi = sum(c.status_history_count for c in test_candidates)

            print("Summary of Candidates Eligible for Cleanup:")
            print(f"  - Test incidents found        : {len(test_candidates)}")
            print(f"  - Test detections found       : {tot_det}")
            print(f"  - Test evidence found         : {tot_ev}")
            print(f"  - Test assignments found      : {tot_as}")
            print(f"  - Test inspections found      : {tot_in}")
            print(f"  - Test status history rows    : {tot_hi}")
            print(f"  - Protected live incidents    : {len(live_candidates)} (PRESERVED)")
            print(f"  - Ambiguous incidents skipped : {len(ambiguous_candidates)} (PRESERVED)")
            print("\n[DRY RUN COMPLETE] Zero database records or files were modified.")
            print("To execute deletion on confirmed test candidates, re-run with: --confirm\n")
            return

        # 4. Confirmed Deletion Mode
        print("\n=======================================================")
        print(" CivicPulse Test Data Cleanup — CONFIRMED EXECUTION")
        print("=======================================================")

        if not test_candidates:
            print("\n[INFO] No safe test/demo records found matching the criteria.")
            print("Zero records deleted. Database is clean.\n")
            return

        print_candidates_table(test_candidates, title="Records Targeted for Deletion")

        tot_det = sum(c.detections_count for c in test_candidates)
        tot_ev = sum(c.evidence_count for c in test_candidates)
        tot_as = sum(c.assignments_count for c in test_candidates)
        tot_in = sum(c.inspections_count for c in test_candidates)
        tot_hi = sum(c.status_history_count for c in test_candidates)

        print("About to delete:")
        print(f"  - Incidents      : {len(test_candidates)}")
        print(f"  - Detections     : {tot_det}")
        print(f"  - Evidence       : {tot_ev}")
        print(f"  - Assignments    : {tot_as}")
        print(f"  - Inspections    : {tot_in}")
        print(f"  - Status history : {tot_hi}")
        print(f"  - Clean files    : {'YES' if args.clean_files else 'NO'}")
        print(f"  - Protected live : {len(live_candidates)} (WILL NOT BE TOUCHED)")
        print(f"  - Ambiguous      : {len(ambiguous_candidates)} (WILL NOT BE TOUCHED)")

        # Interactive confirmation
        if not args.yes:
            print("\nWARNING: This action permanently deletes candidate rows in a transaction.")
            user_input = input("Continue with deletion? [y/N]: ").strip().lower()
            if user_input not in ("y", "yes"):
                print("\n[ABORTED] Cleanup aborted by user. No records were deleted.\n")
                return

        # Execute Transactional Deletion
        print("\nExecuting relational cleanup transaction...")
        results = execute_cleanup(
            db=db,
            candidates_to_delete=test_candidates,
            all_candidates=candidates,
            clean_files=args.clean_files,
        )

        print("\n[SUCCESS] Test Data Cleanup Completed Successfully:")
        print(f"  - Incidents deleted      : {results['incidents']}")
        print(f"  - Detections deleted     : {results['detections']}")
        print(f"  - Evidence deleted       : {results['evidence']}")
        print(f"  - Assignments deleted    : {results['assignments']}")
        print(f"  - Inspections deleted    : {results['inspections']}")
        print(f"  - Status history deleted : {results['history']}")
        print(f"  - Evidence files removed : {results['files']}")
        print("Database transaction committed.\n")

    finally:
        db.close()


if __name__ == "__main__":
    main()
