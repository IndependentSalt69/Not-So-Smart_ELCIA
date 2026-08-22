"""
src/repositories/inspections.py
Repository functions for Inspection entity management.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Union, Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models.inspection import Inspection
from src.db.models.enums import InspectionResult
from src.core.spatial import geojson_to_geoalchemy


def parse_uuid(val: Union[uuid.UUID, str]) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except ValueError:
        return None


def create_inspection(
    db: Session,
    incident_id: Union[uuid.UUID, str],
    inspector_id: Union[uuid.UUID, str],
    result: InspectionResult,
    inspection_time: Optional[datetime] = None,
    notes: Optional[str] = None,
    location: Optional[Any] = None,
    evidence_id: Optional[Union[uuid.UUID, str]] = None,
) -> Inspection:
    """Create a field inspection verification record."""
    inc_id = parse_uuid(incident_id) or incident_id
    insp_id = parse_uuid(inspector_id) or inspector_id
    ev_id = parse_uuid(evidence_id) if evidence_id is not None else None
    loc_elem = geojson_to_geoalchemy(location)

    inspection = Inspection(
        incident_id=inc_id,
        inspector_id=insp_id,
        result=result,
        notes=notes,
        location=loc_elem,
        evidence_id=ev_id,
    )

    if inspection_time is not None:
        inspection.inspection_time = inspection_time

    try:
        db.add(inspection)
        db.commit()
        db.refresh(inspection)
        return inspection
    except Exception:
        db.rollback()
        raise


def list_incident_inspections(
    db: Session,
    incident_id: Union[uuid.UUID, str],
) -> List[Inspection]:
    """List field inspections associated with an incident."""
    inc_id = parse_uuid(incident_id) or incident_id
    stmt = select(Inspection).where(Inspection.incident_id == inc_id).order_by(Inspection.inspection_time.desc())
    return list(db.scalars(stmt).all())
