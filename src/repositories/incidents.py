"""
src/repositories/incidents.py
Repository functions for Incident entity management.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Union, Any, Sequence
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models.incident import Incident
from src.db.models.history import IncidentStatusHistory
from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus
from src.core.spatial import geojson_to_geoalchemy


def parse_uuid(val: Union[uuid.UUID, str]) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except ValueError:
        return None


def create_incident(
    db: Session,
    incident_code: str,
    incident_type: IncidentType,
    confidence: float,
    severity_score: float,
    priority: PriorityLevel,
    zone_id: Union[uuid.UUID, str],
    status: IncidentStatus = IncidentStatus.DETECTED,
    started_at: Optional[datetime] = None,
    ended_at: Optional[datetime] = None,
    duration_seconds: Optional[float] = None,
    recommended_action: Optional[str] = None,
    location: Optional[Any] = None,
) -> Incident:
    """Create a new civic incident record."""
    zid = parse_uuid(zone_id) or zone_id
    loc_elem = geojson_to_geoalchemy(location)
    incident = Incident(
        incident_code=incident_code,
        incident_type=incident_type,
        confidence=confidence,
        severity_score=severity_score,
        priority=priority,
        zone_id=zid,
        status=status,
        ended_at=ended_at,
        duration_seconds=duration_seconds,
        recommended_action=recommended_action,
        location=loc_elem,
    )
    if started_at is not None:
        incident.started_at = started_at

    try:
        db.add(incident)
        db.commit()
        db.refresh(incident)
        return incident
    except Exception:
        db.rollback()
        raise


def get_incident(db: Session, incident_id: Union[uuid.UUID, str]) -> Optional[Incident]:
    """Get incident by primary key UUID or incident_code."""
    uid = parse_uuid(incident_id)
    if uid:
        stmt = select(Incident).where(Incident.id == uid)
        result = db.scalars(stmt).first()
        if result:
            return result
    stmt = select(Incident).where(Incident.incident_code == str(incident_id))
    return db.scalars(stmt).first()


def _apply_status_filter(stmt, status_arg: Optional[Union[IncidentStatus, Sequence[IncidentStatus], str]]):
    if status_arg is None:
        return stmt
    if isinstance(status_arg, IncidentStatus):
        return stmt.where(Incident.status == status_arg)
    if isinstance(status_arg, (list, tuple, set)):
        statuses = [s for s in status_arg if isinstance(s, IncidentStatus)]
        if len(statuses) == 1:
            return stmt.where(Incident.status == statuses[0])
        elif len(statuses) > 1:
            return stmt.where(Incident.status.in_(statuses))
        return stmt
    if isinstance(status_arg, str):
        parts = [p.strip().upper() for p in status_arg.split(",") if p.strip()]
        statuses = []
        for p in parts:
            try:
                statuses.append(IncidentStatus[p])
            except KeyError:
                pass
        if len(statuses) == 1:
            return stmt.where(Incident.status == statuses[0])
        elif len(statuses) > 1:
            return stmt.where(Incident.status.in_(statuses))
    return stmt


def list_incidents(
    db: Session,
    zone_id: Optional[Union[uuid.UUID, str]] = None,
    status: Optional[Union[IncidentStatus, Sequence[IncidentStatus], str]] = None,
    priority: Optional[PriorityLevel] = None,
    incident_type: Optional[IncidentType] = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = "created_at",
    order: str = "desc",
) -> List[Incident]:
    """List incidents with multi-criteria filtering, sorting, and pagination."""
    stmt = select(Incident)
    if zone_id is not None:
        zid = parse_uuid(zone_id) or zone_id
        stmt = stmt.where(Incident.zone_id == zid)
    stmt = _apply_status_filter(stmt, status)
    if priority is not None:
        stmt = stmt.where(Incident.priority == priority)
    if incident_type is not None:
        stmt = stmt.where(Incident.incident_type == incident_type)

    if sort_by == "priority":
        sort_column = Incident.priority
    else:
        sort_column = Incident.created_at

    if order.lower() == "asc":
        stmt = stmt.order_by(sort_column.asc())
    else:
        stmt = stmt.order_by(sort_column.desc())

    stmt = stmt.offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


def count_incidents(
    db: Session,
    zone_id: Optional[Union[uuid.UUID, str]] = None,
    status: Optional[Union[IncidentStatus, Sequence[IncidentStatus], str]] = None,
    priority: Optional[PriorityLevel] = None,
    incident_type: Optional[IncidentType] = None,
) -> int:
    """Get total count of incidents matching the filter criteria."""
    from sqlalchemy import func
    stmt = select(func.count(Incident.id))
    if zone_id is not None:
        zid = parse_uuid(zone_id) or zone_id
        stmt = stmt.where(Incident.zone_id == zid)
    stmt = _apply_status_filter(stmt, status)
    if priority is not None:
        stmt = stmt.where(Incident.priority == priority)
    if incident_type is not None:
        stmt = stmt.where(Incident.incident_type == incident_type)

    return db.scalar(stmt) or 0


def update_incident(
    db: Session,
    incident_id: Union[uuid.UUID, str],
    **kwargs: Any,
) -> Optional[Incident]:
    """Update fields on an existing incident."""
    incident = get_incident(db, incident_id)
    if not incident:
        return None

    try:
        for key, value in kwargs.items():
            if hasattr(incident, key) and key not in ("id", "created_at"):
                if key == "zone_id" and value is not None:
                    value = parse_uuid(value) or value
                elif key == "location" and value is not None:
                    value = geojson_to_geoalchemy(value)
                setattr(incident, key, value)
        db.commit()
        db.refresh(incident)
        return incident
    except Exception:
        db.rollback()
        raise



def update_incident_status(
    db: Session,
    incident_id: Union[uuid.UUID, str],
    status: IncidentStatus,
    changed_by: Optional[Union[uuid.UUID, str]] = None,
    comment: Optional[str] = None,
) -> Optional[Incident]:
    """Update status of an incident and append audit log entry in history."""
    incident = get_incident(db, incident_id)
    if not incident:
        return None

    old_status = incident.status
    incident.status = status

    cb_user_id = parse_uuid(changed_by) if changed_by is not None else None

    history_entry = IncidentStatusHistory(
        incident_id=incident.id,
        old_status=old_status,
        new_status=status,
        changed_by=cb_user_id,
        comment=comment,
    )

    try:
        db.add(history_entry)
        db.commit()
        db.refresh(incident)
        return incident
    except Exception:
        db.rollback()
        raise
