"""
src/services/ml_ingestion_service.py
Service for automatically ingesting ML pipeline outputs into PostgreSQL/PostGIS (Phase 11C).
Creates linked Incident, Detection, and Evidence database records idempotently.
"""

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from uuid import UUID

from sqlalchemy.orm import Session

from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus, EvidenceType
from src.db.models.incident import Incident
from src.db.models.detection import Detection
from src.db.models.evidence import Evidence
from src.repositories.incidents import get_incident
from src.repositories.zones import get_zone, list_zones
from src.core.spatial import geojson_to_geoalchemy


# Canonical ML Class Mapping Contract
CLASS_MAPPING: Dict[str, IncidentType] = {
    "waterlogging": IncidentType.WATERLOGGING,
    "pothole": IncidentType.POTHOLE,
    "drainage_overflow": IncidentType.DRAINAGE_OVERFLOW,
    "damaged_footpath": IncidentType.DAMAGED_FOOTPATH,
    "open_manhole": IncidentType.OPEN_MANHOLE,
}

# Recommended Action Templates per Hazard Class
RECOMMENDED_ACTIONS: Dict[IncidentType, str] = {
    IncidentType.WATERLOGGING: "Deploy high-capacity mobile dewatering pump to clear water accumulation.",
    IncidentType.POTHOLE: "Apply cold mix asphalt patch and set up warning cones.",
    IncidentType.DRAINAGE_OVERFLOW: "Deploy excavator to clear culvert silt and trash blockage.",
    IncidentType.DAMAGED_FOOTPATH: "Inspect footpath slab damage and install barrier tape.",
    IncidentType.OPEN_MANHOLE: "Install immediate high-visibility barricade and dispatch sewer maintenance crew to replace manhole lid.",
}


def normalize_severity_score(ml_score: Union[int, float]) -> float:
    """
    Normalizes ML severity score (0 - 100) to backend Incident scale (0.0 - 10.0).
    Raises ValueError for out-of-bound inputs.
    """
    if ml_score < 0 or ml_score > 100:
        raise ValueError(f"ML severity score out of bounds [0, 100]: {ml_score}")
    return round(float(ml_score) / 10.0, 2)


def map_priority_level(ml_score: float, risk_level: Optional[str] = None) -> PriorityLevel:
    """Maps ML severity score and risk level to database PriorityLevel enum."""
    risk_upper = (risk_level or "").upper()
    if ml_score > 70 or risk_upper == "CRITICAL":
        return PriorityLevel.P1
    elif ml_score > 40 or risk_upper == "HIGH":
        return PriorityLevel.P2
    else:
        return PriorityLevel.P3


def format_incident_code(job_id: str, hazard_id: Union[int, str]) -> str:
    """Formats job-scoped deterministic incident code for idempotency."""
    job_prefix = job_id.replace("-", "")[:8].upper()
    return f"INC-{job_prefix}-{hazard_id}"


def ingest_job_results(
    db: Session,
    job_id: str,
    output_dir: Union[str, Path],
    zone_id: Optional[Union[UUID, str]] = None,
) -> Dict[str, Any]:
    """
    Ingests hazard_telemetry.json and evidence images into PostgreSQL/PostGIS.
    Returns summary metrics dict including incident_ids.
    """
    out_path = Path(output_dir)
    telemetry_file = out_path / "hazard_telemetry.json"
    evidence_dir = out_path / "evidence"

    # 1. Verify Telemetry File Exists
    if not telemetry_file.exists():
        raise FileNotFoundError(f"Telemetry JSON file missing: {telemetry_file}")

    # 2. Parse Telemetry JSON
    try:
        with open(telemetry_file, "r") as f:
            telemetry_data = json.load(f)
        if not isinstance(telemetry_data, list):
            raise ValueError("Telemetry JSON root must be a list of hazard records.")
    except Exception as e:
        if isinstance(e, FileNotFoundError):
            raise
        raise ValueError(f"Failed to parse telemetry JSON: {str(e)}")

    # 3. Resolve Zone
    zone = None
    if zone_id:
        zone = get_zone(db, zone_id)

    if not zone:
        # Fallback to EC-01 or first available zone in DB
        zone = get_zone(db, "EC-01")
        if not zone:
            all_zones = list_zones(db)
            if all_zones:
                zone = all_zones[0]

    if not zone:
        raise ValueError("No operational zone found in database for ingestion.")

    summary = {
        "total_hazards": len(telemetry_data),
        "incidents_created": 0,
        "detections_created": 0,
        "evidence_created": 0,
        "skipped": 0,
        "failed": 0,
        "missing_gps": 0,
        "incident_ids": [],
    }

    global_evidence_dir = Path("outputs") / "evidence"
    global_evidence_dir.mkdir(parents=True, exist_ok=True)

    for item in telemetry_data:
        hazard_id = item.get("hazard_id")
        if hazard_id is None:
            summary["failed"] += 1
            continue

        incident_code = format_incident_code(job_id, hazard_id)

        # 4. Idempotency Check
        existing_incident = get_incident(db, incident_code)
        if existing_incident:
            summary["skipped"] += 1
            summary["incident_ids"].append(str(existing_incident.id))
            continue

        # 5. Class Mapping
        raw_class = str(item.get("class_name", "")).strip().lower()
        if raw_class not in CLASS_MAPPING:
            summary["failed"] += 1
            raise ValueError(f"Unsupported ML hazard class: '{raw_class}'. Allowed: {list(CLASS_MAPPING.keys())}")

        incident_type = CLASS_MAPPING[raw_class]

        # 6. Confidence Extraction & Validation
        raw_confidence = item.get("confidence")
        if raw_confidence is None:
            summary["failed"] += 1
            raise ValueError(f"Telemetry item for hazard '{hazard_id}' is missing required 'confidence' field.")

        try:
            confidence = float(raw_confidence)
            if not (0.0 <= confidence <= 1.0):
                raise ValueError(f"Confidence value {confidence} is out of bounds [0.0, 1.0].")
        except (ValueError, TypeError) as conf_err:
            summary["failed"] += 1
            raise ValueError(f"Invalid confidence for hazard '{hazard_id}': {conf_err}")

        # 6b. Duration / Persistence Extraction
        raw_duration = item.get("duration_seconds")
        if raw_duration is not None:
            try:
                duration_seconds = round(float(raw_duration), 2)
                if duration_seconds < 0:
                    duration_seconds = 0.0
            except (ValueError, TypeError):
                duration_seconds = None
        elif item.get("last_seen_sec") is not None and item.get("first_seen_sec") is not None:
            try:
                duration_seconds = round(max(0.0, float(item["last_seen_sec"]) - float(item["first_seen_sec"])), 2)
            except (ValueError, TypeError):
                duration_seconds = None
        else:
            duration_seconds = None

        # 7. Severity Normalization & Priority
        raw_score = item.get("severity_score", 0)
        backend_severity = normalize_severity_score(raw_score)
        priority = map_priority_level(raw_score, item.get("risk_level"))

        # 8. Location GeoJSON ([longitude, latitude])
        lat = item.get("latitude")
        lon = item.get("longitude")
        location_elem = None

        if lat is not None and lon is not None and (float(lat) != 0.0 or float(lon) != 0.0):
            geojson_point = {
                "type": "Point",
                "coordinates": [float(lon), float(lat)],
            }
            location_elem = geojson_to_geoalchemy(geojson_point)
        else:
            summary["missing_gps"] += 1

        rec_action = RECOMMENDED_ACTIONS.get(incident_type, "Inspect site and issue maintenance work order.")

        # 9. Transaction per Hazard
        try:
            incident = Incident(
                incident_code=incident_code,
                incident_type=incident_type,
                confidence=confidence,
                severity_score=backend_severity,
                priority=priority,
                zone_id=zone.id,
                status=IncidentStatus.DETECTED,
                started_at=datetime.now(timezone.utc),
                duration_seconds=duration_seconds,
                recommended_action=rec_action,
                location=location_elem,
            )
            db.add(incident)
            db.flush()

            # Create Detection
            detection = Detection(
                incident_id=incident.id,
                detection_type=raw_class,
                confidence=confidence,
                frame_number=item.get("frame_logged"),
                detected_at=datetime.now(timezone.utc),
                location=location_elem,
                detection_metadata={
                    "job_id": job_id,
                    "hazard_id": hazard_id,
                    "timestamp_sec": item.get("timestamp_sec"),
                    "first_seen_sec": item.get("first_seen_sec"),
                    "last_seen_sec": item.get("last_seen_sec"),
                    "duration_seconds": duration_seconds,
                    "mask_pixels": item.get("mask_pixels"),
                    "area_coverage_pct": item.get("area_coverage_pct"),
                    "relative_depth_drop": item.get("relative_depth_drop"),
                    "risk_level": item.get("risk_level"),
                },
            )
            db.add(detection)

            # Create Evidence
            evidence_file = item.get("evidence_file")
            if evidence_file:
                job_ev_file = evidence_dir / evidence_file
                if job_ev_file.exists():
                    rel_file_path = f"outputs/jobs/{job_id}/evidence/{evidence_file}"

                    # Copy to global evidence directory for fallback static route
                    copy_target = global_evidence_dir / f"{job_id[:8]}_{evidence_file}"
                    if not copy_target.exists():
                        shutil.copy2(job_ev_file, copy_target)

                    ev = Evidence(
                        incident_id=incident.id,
                        evidence_type=EvidenceType.IMAGE,
                        file_path=rel_file_path,
                        description=f"Auto-captured {raw_class} evidence (Risk: {item.get('risk_level')})",
                        is_primary=True,
                    )
                    db.add(ev)
                    summary["evidence_created"] += 1

            db.commit()
            summary["incidents_created"] += 1
            summary["detections_created"] += 1
            summary["incident_ids"].append(str(incident.id))

        except Exception as hazard_err:
            db.rollback()
            summary["failed"] += 1
            raise hazard_err

    return summary
