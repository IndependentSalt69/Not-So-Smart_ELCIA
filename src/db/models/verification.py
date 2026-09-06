"""
src/db/models/verification.py
VideoVerification ORM model representing human-in-the-loop QA on aerial drone flights
where AI processing completed with zero detected incidents.
"""

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import (
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from src.db.base import Base
from src.db.models.enums import VerificationStatus

if TYPE_CHECKING:
    from src.db.models.zone import Zone
    from src.db.models.user import User
    from src.db.models.incident import Incident


class VideoVerification(Base):
    __tablename__ = "video_verifications"
    __table_args__ = (
        Index("ix_video_verifications_zone_status", "zone_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    job_id: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        doc="Processing job UUID that produced zero incidents",
    )
    video_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    video_path: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    annotated_video_url: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
    )
    telemetry_path: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
    )
    zone_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("zones.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    drone_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
    )
    ai_hazard_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    status: Mapped[VerificationStatus] = mapped_column(
        SQLEnum(VerificationStatus, native_enum=False, length=32),
        nullable=False,
        default=VerificationStatus.PENDING_REVIEW,
        index=True,
    )
    reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    review_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Linked manual incident if operator reported an anomaly",
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
    zone: Mapped[Optional["Zone"]] = relationship("Zone")
    reviewer: Mapped[Optional["User"]] = relationship("User")
    created_incident: Mapped[Optional["Incident"]] = relationship("Incident")

    def __repr__(self) -> str:
        return f"<VideoVerification(job_id='{self.job_id}', status='{self.status}', ai_hazards={self.ai_hazard_count})>"
