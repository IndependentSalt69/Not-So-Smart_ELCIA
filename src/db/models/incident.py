"""
src/db/models/incident.py
Central Incident ORM model representing detected civic risk events.
"""

from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
import uuid

from sqlalchemy import (
    String,
    Text,
    Float,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    CheckConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry

from src.db.base import Base
from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus

if TYPE_CHECKING:
    from src.db.models.zone import Zone
    from src.db.models.detection import Detection
    from src.db.models.evidence import Evidence
    from src.db.models.assignment import Assignment
    from src.db.models.history import IncidentStatusHistory
    from src.db.models.inspection import Inspection


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="chk_incident_confidence_range"),
        CheckConstraint("severity_score >= 0.0 AND severity_score <= 10.0", name="chk_incident_severity_range"),
        Index("ix_incidents_status_priority", "status", "priority"),
        Index("ix_incidents_zone_status", "zone_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    incident_code: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        doc="Unique incident tracking code e.g. EC-001",
    )
    incident_type: Mapped[IncidentType] = mapped_column(
        SQLEnum(IncidentType, native_enum=False, length=32),
        nullable=False,
        index=True,
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Model detection confidence score (0.0 to 1.0)",
    )
    severity_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Physical hazard severity score (0.0 to 10.0)",
    )
    priority: Mapped[PriorityLevel] = mapped_column(
        SQLEnum(PriorityLevel, native_enum=False, length=10),
        nullable=False,
        index=True,
    )
    status: Mapped[IncidentStatus] = mapped_column(
        SQLEnum(IncidentStatus, native_enum=False, length=32),
        nullable=False,
        default=IncidentStatus.DETECTED,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    duration_seconds: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    recommended_action: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("zones.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    location: Mapped[Optional[bytes]] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=True,
        doc="PostGIS Point geometry representing geographic position",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    zone: Mapped["Zone"] = relationship(
        "Zone",
        back_populates="incidents",
    )
    detections: Mapped[List["Detection"]] = relationship(
        "Detection",
        back_populates="incident",
        cascade="all, delete-orphan",
    )
    evidence: Mapped[List["Evidence"]] = relationship(
        "Evidence",
        back_populates="incident",
        cascade="all, delete-orphan",
    )
    assignments: Mapped[List["Assignment"]] = relationship(
        "Assignment",
        back_populates="incident",
        cascade="all, delete-orphan",
    )
    status_history: Mapped[List["IncidentStatusHistory"]] = relationship(
        "IncidentStatusHistory",
        back_populates="incident",
        cascade="all, delete-orphan",
    )
    inspections: Mapped[List["Inspection"]] = relationship(
        "Inspection",
        back_populates="incident",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Incident(code='{self.incident_code}', type='{self.incident_type}', status='{self.status}', priority='{self.priority}')>"
