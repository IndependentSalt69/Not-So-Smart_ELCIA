"""
src/db/models/history.py
IncidentStatusHistory ORM model for auditing status transitions.
"""

from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from src.db.base import Base
from src.db.models.enums import IncidentStatus

if TYPE_CHECKING:
    from src.db.models.incident import Incident
    from src.db.models.user import User


class IncidentStatusHistory(Base):
    __tablename__ = "incident_status_history"
    __table_args__ = (
        Index("ix_history_incident_changed_at", "incident_id", "changed_at"),
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
    old_status: Mapped[Optional[IncidentStatus]] = mapped_column(
        SQLEnum(IncidentStatus, native_enum=False, length=32),
        nullable=True,
    )
    new_status: Mapped[IncidentStatus] = mapped_column(
        SQLEnum(IncidentStatus, native_enum=False, length=32),
        nullable=False,
    )
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    comment: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships
    incident: Mapped["Incident"] = relationship(
        "Incident",
        back_populates="status_history",
    )
    changed_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="status_changes",
    )

    def __repr__(self) -> str:
        return f"<IncidentStatusHistory(incident_id='{self.incident_id}', old='{self.old_status}', new='{self.new_status}')>"
