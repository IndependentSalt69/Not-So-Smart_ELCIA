"""
src/repositories/history.py
Repository functions for IncidentStatusHistory entity management.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Union
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models.history import IncidentStatusHistory
from src.db.models.enums import IncidentStatus


def parse_uuid(val: Union[uuid.UUID, str]) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except ValueError:
        return None


def create_status_history(
    db: Session,
    incident_id: Union[uuid.UUID, str],
    new_status: IncidentStatus,
    old_status: Optional[IncidentStatus] = None,
    changed_by: Optional[Union[uuid.UUID, str]] = None,
    comment: Optional[str] = None,
    changed_at: Optional[datetime] = None,
) -> IncidentStatusHistory:
    """Create an incident status history audit record."""
    inc_id = parse_uuid(incident_id) or incident_id
    cb_id = parse_uuid(changed_by) if changed_by is not None else None

    history = IncidentStatusHistory(
        incident_id=inc_id,
        old_status=old_status,
        new_status=new_status,
        changed_by=cb_id,
        comment=comment,
    )
    if changed_at is not None:
        history.changed_at = changed_at

    try:
        db.add(history)
        db.commit()
        db.refresh(history)
        return history
    except Exception:
        db.rollback()
        raise


def list_incident_status_history(
    db: Session,
    incident_id: Union[uuid.UUID, str],
) -> List[IncidentStatusHistory]:
    """List status history audit records for an incident."""
    inc_id = parse_uuid(incident_id) or incident_id
    stmt = select(IncidentStatusHistory).where(IncidentStatusHistory.incident_id == inc_id).order_by(IncidentStatusHistory.changed_at.asc())
    return list(db.scalars(stmt).all())
