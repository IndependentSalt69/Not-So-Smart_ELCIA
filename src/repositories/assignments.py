"""
src/repositories/assignments.py
Repository functions for Assignment entity management.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Union
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models.assignment import Assignment


def parse_uuid(val: Union[uuid.UUID, str]) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except ValueError:
        return None


def create_assignment(
    db: Session,
    incident_id: Union[uuid.UUID, str],
    assigned_to: Union[uuid.UUID, str],
    assigned_team: Optional[str] = None,
    assigned_at: Optional[datetime] = None,
    completed_at: Optional[datetime] = None,
    notes: Optional[str] = None,
) -> Assignment:
    """Create an incident assignment linking incident to an assignee user."""
    inc_id = parse_uuid(incident_id) or incident_id
    assignee_id = parse_uuid(assigned_to) or assigned_to
    assignment = Assignment(
        incident_id=inc_id,
        assigned_to=assignee_id,
        assigned_team=assigned_team,
        completed_at=completed_at,
        notes=notes,
    )
    if assigned_at is not None:
        assignment.assigned_at = assigned_at

    try:
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment
    except Exception:
        db.rollback()
        raise


def get_incident_assignments(
    db: Session,
    incident_id: Union[uuid.UUID, str],
) -> List[Assignment]:
    """Get all assignments for a given incident."""
    inc_id = parse_uuid(incident_id) or incident_id
    stmt = select(Assignment).where(Assignment.incident_id == inc_id).order_by(Assignment.assigned_at.desc())
    return list(db.scalars(stmt).all())
