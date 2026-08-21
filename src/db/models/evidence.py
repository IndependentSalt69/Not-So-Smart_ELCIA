"""
src/db/models/evidence.py
Evidence ORM model storing media file paths, overlays, and video clips.
"""

from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
import uuid

from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from src.db.base import Base
from src.db.models.enums import EvidenceType

if TYPE_CHECKING:
    from src.db.models.incident import Incident
    from src.db.models.inspection import Inspection


class Evidence(Base):
    __tablename__ = "evidence"
    __table_args__ = (
        Index("ix_evidence_incident_type", "incident_id", "evidence_type"),
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
    evidence_type: Mapped[EvidenceType] = mapped_column(
        SQLEnum(EvidenceType, native_enum=False, length=16),
        nullable=False,
        index=True,
    )
    file_path: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        doc="Relative filesystem path or URL pointing to evidence asset",
    )
    captured_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    incident: Mapped["Incident"] = relationship(
        "Incident",
        back_populates="evidence",
    )
    inspections: Mapped[List["Inspection"]] = relationship(
        "Inspection",
        back_populates="evidence",
    )

    def __repr__(self) -> str:
        return f"<Evidence(id='{self.id}', type='{self.evidence_type}', file='{self.file_path}')>"
