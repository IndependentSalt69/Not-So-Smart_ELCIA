"""
src/repositories/processing_runs.py
Repository functions for grouping, reconstructing, and presenting Flight Inspection runs (TODO #4).
Survives backend server restarts by querying persisted PostGIS/PostgreSQL detections, incidents, and verifications.
"""

from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple, Union, Set
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.core.config import settings, PROJECT_ROOT
from src.db.models.enums import VerificationStatus
from src.db.models.incident import Incident
from src.db.models.detection import Detection
from src.db.models.verification import VideoVerification
from src.db.models.zone import Zone
from src.repositories.zones import get_zone
from src.schemas.incident import IncidentResponse
from src.schemas.verification import VideoVerificationResponse
from src.schemas.processing import (
    FlightInspectionRunSummary,
    FlightInspectionRunDetail,
    JobStatus,
)
from src.services.processing_job_manager import job_manager


def _resolve_annotated_video_url(job_id: str, verification: Optional[VideoVerification] = None) -> Optional[str]:
    """Resolves browser-accessible annotated video URL only if the video file exists on disk."""
    # Priority 1: Check standard output jobs directory
    annotated_disk_file = Path("outputs/jobs") / job_id / "annotated_output.mp4"
    if annotated_disk_file.exists() and annotated_disk_file.is_file():
        return f"/static/jobs/{job_id}/annotated_output.mp4"

    # Priority 2: Check settings.JOBS_DIR
    try:
        custom_job_file = Path(settings.JOBS_DIR) / job_id / "annotated_output.mp4"
        if custom_job_file.exists() and custom_job_file.is_file():
            return f"/static/jobs/{job_id}/annotated_output.mp4"
    except Exception:
        pass

    # Priority 3: Check VideoVerification record path
    if verification and verification.annotated_video_url:
        clean_url = verification.annotated_video_url.lstrip("/")
        if (Path(clean_url).exists() and Path(clean_url).is_file()) or (PROJECT_ROOT / clean_url).exists():
            return verification.annotated_video_url

    # Priority 4: Check in-memory job if active
    mem_job = job_manager.get_job(job_id)
    if mem_job and mem_job.results and mem_job.results.get("output_video_url"):
        raw_url = mem_job.results["output_video_url"]
        clean_url = raw_url.lstrip("/")
        if (Path(clean_url).exists() and Path(clean_url).is_file()) or (PROJECT_ROOT / clean_url).exists():
            return raw_url

    return None


def _extract_hazard_sequence(incident: Incident, job_prefix: str) -> int:
    """Extracts deterministic sequence number from incident code or metadata for stable sorting."""
    code = incident.incident_code or ""
    # Check format INC-<PREFIX>-<NUM>
    match = re.search(r"INC-[A-F0-9]+-(\d+)", code, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass

    # Check format INC-<PREFIX>-M<TS> (manual anomaly)
    match_m = re.search(r"INC-[A-F0-9]+-M(\d+)", code, re.IGNORECASE)
    if match_m:
        try:
            return 10000 + int(match_m.group(1))
        except ValueError:
            pass

    # Check detections metadata
    if hasattr(incident, "detections") and incident.detections:
        for det in incident.detections:
            if det.detection_metadata and isinstance(det.detection_metadata, dict):
                h_id = det.detection_metadata.get("hazard_id")
                if h_id is not None:
                    try:
                        return int(h_id)
                    except (ValueError, TypeError):
                        pass

    return 99999


def _build_flight_runs_map(db: Session) -> Dict[str, Dict[str, Any]]:
    """
    Reconstructs all Flight Inspection runs from persisted DB records (detections, incidents, verifications)
    and merges active in-memory jobs without duplicating or mutating records.
    """
    runs_map: Dict[str, Dict[str, Any]] = {}

    # 1. Gather all VideoVerification records (handles 0-incident flights and manual anomaly parent runs)
    stmt_verif = select(VideoVerification).options(selectinload(VideoVerification.zone))
    verifications = list(db.execute(stmt_verif).unique().scalars().all())

    for verif in verifications:
        job_id = str(verif.job_id)
        job_prefix = job_id.replace("-", "")[:8].upper()
        runs_map[job_id] = {
            "job_id": job_id,
            "job_prefix": job_prefix,
            "verification": verif,
            "incidents": {},
            "zone_id": verif.zone_id,
            "zone_code": verif.zone.code if verif.zone else ("OTHER" if verif.custom_zone_name else None),
            "custom_zone_name": verif.custom_zone_name,
            "created_at": verif.created_at,
            "completed_at": verif.reviewed_at,
            "status": verif.status.value,
        }

    # 2. Gather all Detections with linked Incidents
    stmt_det = (
        select(Detection)
        .options(
            selectinload(Detection.incident).selectinload(Incident.zone),
            selectinload(Detection.incident).selectinload(Incident.status_history),
        )
    )
    detections = list(db.execute(stmt_det).unique().scalars().all())

    # Map job_prefix to full job_id for resolution
    prefix_to_job_id = {v["job_prefix"]: k for k, v in runs_map.items()}

    for det in detections:
        meta = det.detection_metadata
        if not meta or not isinstance(meta, dict):
            continue

        raw_job_id = meta.get("job_id")
        if not raw_job_id:
            continue

        job_id = str(raw_job_id)
        job_prefix = job_id.replace("-", "")[:8].upper()
        prefix_to_job_id[job_prefix] = job_id

        if job_id not in runs_map:
            runs_map[job_id] = {
                "job_id": job_id,
                "job_prefix": job_prefix,
                "verification": None,
                "incidents": {},
                "zone_id": None,
                "zone_code": None,
                "custom_zone_name": None,
                "created_at": det.created_at,
                "completed_at": None,
                "status": "COMPLETED",
            }

        incident = det.incident
        if incident:
            runs_map[job_id]["incidents"][incident.id] = incident

    # 3. Gather Incidents that match job_prefix or created_incident_id (covers manual anomalies & AI incidents)
    stmt_inc = select(Incident).options(
        selectinload(Incident.zone),
        selectinload(Incident.detections),
        selectinload(Incident.status_history),
    )
    incidents = list(db.execute(stmt_inc).unique().scalars().all())

    for inc in incidents:
        matched_job_id = None

        # A. Check incident code prefix format INC-<PREFIX>-...
        code_match = re.match(r"INC-([A-F0-9]{8})-", inc.incident_code or "", re.IGNORECASE)
        if code_match:
            prefix = code_match.group(1).upper()
            if prefix in prefix_to_job_id:
                matched_job_id = prefix_to_job_id[prefix]
            else:
                # Discovered a flight job from incident code prefix
                matched_job_id = prefix
                prefix_to_job_id[prefix] = prefix
                if prefix not in runs_map:
                    runs_map[prefix] = {
                        "job_id": prefix,
                        "job_prefix": prefix,
                        "verification": None,
                        "incidents": {},
                        "zone_id": None,
                        "zone_code": None,
                        "custom_zone_name": None,
                        "created_at": inc.created_at,
                        "completed_at": None,
                        "status": "COMPLETED",
                    }

        # B. Check status history comments for job_id=...
        if not matched_job_id and inc.status_history:
            for hist in inc.status_history:
                if hist.comment and "job_id=" in hist.comment:
                    m = re.search(r"job_id=([a-f0-9\-]+)", hist.comment, re.IGNORECASE)
                    if m:
                        candidate = m.group(1)
                        if candidate in runs_map:
                            matched_job_id = candidate
                            break

        if matched_job_id and matched_job_id in runs_map:
            runs_map[matched_job_id]["incidents"][inc.id] = inc

    # 4. Attach created_incident_id from VideoVerification if present
    for verif in verifications:
        if verif.created_incident_id:
            job_id = str(verif.job_id)
            if job_id in runs_map and verif.created_incident_id not in runs_map[job_id]["incidents"]:
                inc_match = next((i for i in incidents if i.id == verif.created_incident_id), None)
                if inc_match:
                    runs_map[job_id]["incidents"][inc_match.id] = inc_match

    # 5. Merge active in-memory jobs from ProcessingJobManager if currently executing/queued
    for job_id, mem_job in job_manager.jobs.items():
        job_prefix = job_id.replace("-", "")[:8].upper()
        if job_id not in runs_map:
            runs_map[job_id] = {
                "job_id": job_id,
                "job_prefix": job_prefix,
                "verification": None,
                "incidents": {},
                "zone_id": UUID(mem_job.zone_id) if mem_job.zone_id and len(mem_job.zone_id) == 36 else None,
                "zone_code": mem_job.zone_id if mem_job.zone_id and len(mem_job.zone_id) <= 10 else None,
                "custom_zone_name": mem_job.custom_zone_name,
                "created_at": mem_job.created_at,
                "completed_at": mem_job.completed_at,
                "status": mem_job.status.value,
            }
        else:
            if mem_job.status in (JobStatus.QUEUED, JobStatus.PROCESSING, JobStatus.FAILED):
                runs_map[job_id]["status"] = mem_job.status.value
            if mem_job.completed_at:
                runs_map[job_id]["completed_at"] = mem_job.completed_at
            if mem_job.custom_zone_name:
                runs_map[job_id]["custom_zone_name"] = mem_job.custom_zone_name

    return runs_map


def _build_run_summary(run_data: Dict[str, Any]) -> FlightInspectionRunSummary:
    """Computes aggregate metrics and returns typed FlightInspectionRunSummary."""
    job_id = run_data["job_id"]
    job_prefix = run_data["job_prefix"]
    verification = run_data["verification"]
    incidents_list: List[Incident] = list(run_data["incidents"].values())

    total_hazards = len(incidents_list)

    class_counts: Dict[str, int] = {}
    priority_counts: Dict[str, int] = {}
    has_human_report = False

    for inc in incidents_list:
        type_str = inc.incident_type.value if hasattr(inc.incident_type, "value") else str(inc.incident_type)
        class_counts[type_str] = class_counts.get(type_str, 0) + 1

        prio_str = inc.priority.value if hasattr(inc.priority, "value") else str(inc.priority)
        priority_counts[prio_str] = priority_counts.get(prio_str, 0) + 1

        if inc.source == "HUMAN_REPORTED" or "-M" in inc.incident_code:
            has_human_report = True

    # Resolve Zone & Custom Zone Name
    zone_id = run_data.get("zone_id")
    zone_code = run_data.get("zone_code")
    custom_zone_name = run_data.get("custom_zone_name")

    if not zone_id and incidents_list:
        zone_id = incidents_list[0].zone_id
        if incidents_list[0].zone:
            zone_code = incidents_list[0].zone.code
        for inc in incidents_list:
            if inc.custom_zone_name:
                custom_zone_name = inc.custom_zone_name
                break

    if not zone_code and verification and verification.zone:
        zone_code = verification.zone.code
    if not custom_zone_name and verification and verification.custom_zone_name:
        custom_zone_name = verification.custom_zone_name

    if not zone_code and (custom_zone_name or (not zone_id and (incidents_list or verification))):
        zone_code = "OTHER"

    # Resolve Timestamps
    created_at = run_data["created_at"]
    if incidents_list:
        inc_created = [i.created_at for i in incidents_list if i.created_at]
        if inc_created:
            created_at = min(inc_created)
        else:
            inc_starts = [i.started_at for i in incidents_list if i.started_at]
            if inc_starts:
                created_at = min(inc_starts)

    completed_at = run_data.get("completed_at")
    if not completed_at and incidents_list:
        inc_ends = [i.ended_at for i in incidents_list if i.ended_at]
        if inc_ends:
            completed_at = max(inc_ends)
        else:
            completed_at = max([i.created_at for i in incidents_list if i.created_at])

    # Resolve Status
    status = run_data["status"]
    if verification:
        status = verification.status.value
    elif incidents_list:
        status = "COMPLETED"

    annotated_video_url = _resolve_annotated_video_url(job_id, verification)

    return FlightInspectionRunSummary(
        job_id=job_id,
        job_prefix=job_prefix,
        zone_id=zone_id,
        zone_code=zone_code,
        custom_zone_name=custom_zone_name,
        total_hazards=total_hazards,
        class_counts=class_counts,
        priority_counts=priority_counts,
        status=status,
        created_at=created_at,
        completed_at=completed_at,
        annotated_video_url=annotated_video_url,
        has_human_report=has_human_report,
    )


def list_flight_runs(
    db: Session,
    zone_id: Optional[Union[UUID, str]] = None,
    skip: int = 0,
    limit: int = 20,
) -> Tuple[List[FlightInspectionRunSummary], int]:
    """
    Lists historical and active flight inspection runs with aggregate metrics,
    supporting optional zone filtering and deterministic timestamp sorting.
    """
    runs_map = _build_flight_runs_map(db)

    # Convert to summaries
    summaries: List[FlightInspectionRunSummary] = []
    for run_data in runs_map.values():
        summaries.append(_build_run_summary(run_data))

    # Apply Zone Filter
    if zone_id is not None:
        if str(zone_id).strip().upper() == "OTHER":
            summaries = [
                s for s in summaries if (s.zone_id is None or s.zone_code == "OTHER")
            ]
        else:
            target_zone = get_zone(db, zone_id)
            if target_zone:
                summaries = [
                    s for s in summaries if (s.zone_id == target_zone.id or s.zone_code == target_zone.code)
                ]
            else:
                summaries = [
                    s for s in summaries if (str(s.zone_id) == str(zone_id) or s.zone_code == str(zone_id))
                ]

    # Sort descending by created_at (newest runs first)
    def sort_key(s: FlightInspectionRunSummary):
        dt = s.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    summaries.sort(key=sort_key, reverse=True)

    total = len(summaries)
    paginated = summaries[skip : skip + limit]

    return paginated, total


def get_flight_run(
    db: Session,
    job_id_or_prefix: str,
) -> Optional[FlightInspectionRunDetail]:
    """
    Retrieves a single Flight Inspection run by full UUID or 8-char prefix.
    Returns the flight summary, all individual IncidentResponse objects (sorted deterministically),
    and associated VideoVerification details if present.
    """
    runs_map = _build_flight_runs_map(db)

    target_key = None
    query_clean = str(job_id_or_prefix).strip()
    query_upper = query_clean.upper()

    # Exact job_id match
    if query_clean in runs_map:
        target_key = query_clean
    else:
        # Prefix match
        for k, v in runs_map.items():
            if v["job_prefix"] == query_upper or k.lower().startswith(query_clean.lower()):
                target_key = k
                break

    if not target_key:
        return None

    run_data = runs_map[target_key]
    summary = _build_run_summary(run_data)

    # Sort incidents deterministically
    incidents_list: List[Incident] = list(run_data["incidents"].values())
    job_prefix = summary.job_prefix

    def incident_sort_key(inc: Incident) -> Tuple[int, datetime]:
        seq = _extract_hazard_sequence(inc, job_prefix)
        dt = inc.created_at or datetime.min.replace(tzinfo=timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return (seq, dt)

    incidents_list.sort(key=incident_sort_key)

    # Convert to Pydantic responses
    incident_responses = [IncidentResponse.model_validate(inc) for inc in incidents_list]

    verif_response = None
    if run_data["verification"]:
        verif_response = VideoVerificationResponse.model_validate(run_data["verification"])

    return FlightInspectionRunDetail(
        summary=summary,
        incidents=incident_responses,
        verification=verif_response,
    )
