"""
src/schemas/history.py
Pydantic schemas for IncidentStatusHistory entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from src.db.models.enums import IncidentStatus


class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_id: UUID
    old_status: Optional[IncidentStatus] = None
    new_status: IncidentStatus
    changed_by: Optional[UUID] = None
    comment: Optional[str] = None
    changed_at: datetime
