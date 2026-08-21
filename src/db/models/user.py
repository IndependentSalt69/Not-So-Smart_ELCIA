"""
src/db/models/user.py
User ORM model representing operators, inspectors, and administrators.
"""

from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
import uuid

from sqlalchemy import String, Boolean, DateTime, Enum as SQLEnum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from src.db.base import Base
from src.db.models.enums import UserRole

if TYPE_CHECKING:
    from src.db.models.assignment import Assignment
    from src.db.models.history import IncidentStatusHistory
    from src.db.models.inspection import Inspection


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, native_enum=False, length=32),
        nullable=False,
        default=UserRole.OPERATOR,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
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
    assignments: Mapped[List["Assignment"]] = relationship(
        "Assignment",
        back_populates="assignee",
    )
    status_changes: Mapped[List["IncidentStatusHistory"]] = relationship(
        "IncidentStatusHistory",
        back_populates="changed_by_user",
    )
    inspections: Mapped[List["Inspection"]] = relationship(
        "Inspection",
        back_populates="inspector",
    )

    def __repr__(self) -> str:
        return f"<User(name='{self.name}', email='{self.email}', role='{self.role}')>"
