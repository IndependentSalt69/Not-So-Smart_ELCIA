"""
src/db/models/inspection.py
Inspection ORM model representing field inspector verifications.
"""

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import Text, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry

from src.db.base import Base
from src.db.models.enums import InspectionResult

if TYPE_CHECKING:
    from src.db.models.incident import Incident
    from src.db.models.user import User
    from src.db.models.evidence import Evidence


class Inspection(Base):
    __tablename__ = "inspections"
    __table_args__ = (
        Index("ix_inspections_incident_result", "incident_id", "result"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    inspector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    inspection_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    result: Mapped[InspectionResult] = mapped_column(
        SQLEnum(InspectionResult, native_enum=False, length=32),
        nullable=False,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    location: Mapped[Optional[bytes]] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=True,
        doc="PostGIS Point geometry for field inspector location during verification",
    )
    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evidence.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    incident: Mapped["Incident"] = relationship(
        "Incident",
        back_populates="inspections",
    )
    inspector: Mapped["User"] = relationship(
        "User",
        back_populates="inspections",
    )
    evidence: Mapped[Optional["Evidence"]] = relationship(
        "Evidence",
        back_populates="inspections",
    )

    def __repr__(self) -> str:
        return f"<Inspection(id='{self.id}', incident_id='{self.incident_id}', result='{self.result}')>"
