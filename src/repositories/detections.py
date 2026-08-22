"""
src/repositories/detections.py
Repository functions for Detection entity management.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Union, Dict, Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models.detection import Detection
from src.core.spatial import geojson_to_geoalchemy


def parse_uuid(val: Union[uuid.UUID, str]) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except ValueError:
        return None


def create_detection(
    db: Session,
    incident_id: Union[uuid.UUID, str],
    detection_type: str,
    confidence: float,
    frame_number: Optional[int] = None,
    detected_at: Optional[datetime] = None,
    location: Optional[Any] = None,
    detection_metadata: Optional[Dict[str, Any]] = None,
) -> Detection:
    """Create a frame-level detection observation record."""
    inc_id = parse_uuid(incident_id) or incident_id
    loc_elem = geojson_to_geoalchemy(location)
    detection = Detection(
        incident_id=inc_id,
        detection_type=detection_type,
        confidence=confidence,
        frame_number=frame_number,
        location=loc_elem,
        detection_metadata=detection_metadata,
    )

    if detected_at is not None:
        detection.detected_at = detected_at

    try:
        db.add(detection)
        db.commit()
        db.refresh(detection)
        return detection
    except Exception:
        db.rollback()
        raise


def list_incident_detections(
    db: Session,
    incident_id: Union[uuid.UUID, str],
) -> List[Detection]:
    """List frame detections associated with an incident."""
    inc_id = parse_uuid(incident_id) or incident_id
    stmt = select(Detection).where(Detection.incident_id == inc_id).order_by(Detection.detected_at.asc())
    return list(db.scalars(stmt).all())
