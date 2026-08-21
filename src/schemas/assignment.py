"""
src/schemas/assignment.py
Pydantic schemas for Assignment entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class AssignmentBase(BaseModel):
    assigned_to: UUID
    assigned_team: Optional[str] = Field(None, max_length=128)
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentResponse(AssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_id: UUID
