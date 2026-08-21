"""
src/db/models/zone.py
Zone ORM model representing municipal operational sectors.
"""

from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
import uuid

from sqlalchemy import String, Text, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry

from src.db.base import Base

if TYPE_CHECKING:
    from src.db.models.incident import Incident


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    code: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        nullable=False,
        index=True,
        doc="Unique zone code e.g. EC-01",
    )
    name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        doc="Human-readable zone name",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    geometry: Mapped[Optional[bytes]] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True),
        nullable=True,
        doc="PostGIS polygon geometry representing zone geographical boundary",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    incidents: Mapped[List["Incident"]] = relationship(
        "Incident",
        back_populates="zone",
        cascade="all, delete-orphan",
        passive_deletes=False,
    )

    def __repr__(self) -> str:
        return f"<Zone(code='{self.code}', name='{self.name}')>"
