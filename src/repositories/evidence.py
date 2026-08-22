"""
src/repositories/evidence.py
Repository functions for Evidence entity management.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Union

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models.evidence import Evidence
from src.db.models.enums import EvidenceType


def parse_uuid(val: Union[uuid.UUID, str]) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val

    try:
        return uuid.UUID(str(val))
    except ValueError:
        return None


def create_evidence(
    db: Session,
    incident_id: Union[uuid.UUID, str],
    evidence_type: EvidenceType,
    file_path: str,
    captured_at: Optional[datetime] = None,
    description: Optional[str] = None,
    is_primary: bool = False,
) -> Evidence:
    """Create a new evidence record for an incident."""

    inc_id = parse_uuid(incident_id) or incident_id

    evidence = Evidence(
        incident_id=inc_id,
        evidence_type=evidence_type,
        file_path=file_path,
        captured_at=captured_at,
        description=description,
        is_primary=is_primary,
    )

    try:
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        return evidence

    except Exception:
        db.rollback()
        raise


def get_evidence(
    db: Session,
    evidence_id: Union[uuid.UUID, str],
) -> Optional[Evidence]:
    """Get evidence by primary key UUID."""

    eid = parse_uuid(evidence_id)

    if not eid:
        return None

    stmt = select(Evidence).where(Evidence.id == eid)

    return db.scalars(stmt).first()


def list_incident_evidence(
    db: Session,
    incident_id: Union[uuid.UUID, str],
) -> List[Evidence]:
    """List all evidence assets associated with a specific incident."""

    inc_id = parse_uuid(incident_id) or incident_id

    stmt = (
        select(Evidence)
        .where(Evidence.incident_id == inc_id)
    )

    return list(db.scalars(stmt).all())