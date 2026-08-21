"""
src/db/models/detection.py
Detection ORM model representing individual frame-level model observations.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, TYPE_CHECKING
import uuid

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Index, CheckConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry

from src.db.base import Base

if TYPE_CHECKING:
    from src.db.models.incident import Incident


class Detection(Base):
    __tablename__ = "detections"
    __table_args__ = (
        CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="chk_detection_confidence_range"),
        Index("ix_detections_incident_detected_at", "incident_id", "detected_at"),
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
    detection_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    frame_number: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    location: Mapped[Optional[bytes]] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=True,
        doc="PostGIS Point geometry for individual observation coordinates",
    )
    detection_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        "metadata",
        JSONB().with_variant(JSON, "sqlite"),
        nullable=True,
        doc="Flexible JSONB payload for bounding boxes, mask stats, coverage ratios",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    incident: Mapped["Incident"] = relationship(
        "Incident",
        back_populates="detections",
    )

    def __repr__(self) -> str:
        return f"<Detection(id='{self.id}', type='{self.detection_type}', confidence={self.confidence})>"
