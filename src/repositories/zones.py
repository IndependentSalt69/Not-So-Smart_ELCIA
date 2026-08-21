"""
src/repositories/zones.py
Repository functions for Zone entity management.
"""

import uuid
from typing import Optional, List, Union, Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models.zone import Zone


def parse_uuid(val: Union[uuid.UUID, str]) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except ValueError:
        return None


def create_zone(
    db: Session,
    code: str,
    name: str,
    description: Optional[str] = None,
    geometry: Optional[Any] = None,
) -> Zone:
    """Create a new municipal operational zone."""
    zone = Zone(
        code=code,
        name=name,
        description=description,
        geometry=geometry,
    )
    try:
        db.add(zone)
        db.commit()
        db.refresh(zone)
        return zone
    except Exception:
        db.rollback()
        raise


def get_zone(db: Session, zone_id: Union[uuid.UUID, str]) -> Optional[Zone]:
    """Get zone by primary key UUID or zone code."""
    uid = parse_uuid(zone_id)
    if uid:
        stmt = select(Zone).where(Zone.id == uid)
        result = db.scalars(stmt).first()
        if result:
            return result
    # Fallback lookup by zone code
    stmt = select(Zone).where(Zone.code == str(zone_id))
    return db.scalars(stmt).first()


def list_zones(db: Session, skip: int = 0, limit: int = 100) -> List[Zone]:
    """List operational zones with pagination."""
    stmt = select(Zone).offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


def update_zone(
    db: Session,
    zone_id: Union[uuid.UUID, str],
    **kwargs: Any,
) -> Optional[Zone]:
    """Update fields on an existing zone."""
    zone = get_zone(db, zone_id)
    if not zone:
        return None

    try:
        for key, value in kwargs.items():
            if hasattr(zone, key) and key not in ("id", "created_at"):
                setattr(zone, key, value)
        db.commit()
        db.refresh(zone)
        return zone
    except Exception:
        db.rollback()
        raise
