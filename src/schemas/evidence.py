"""
src/schemas/evidence.py
Pydantic schemas for Evidence entity API serialization and validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from src.db.models.enums import EvidenceType


class EvidenceBase(BaseModel):
    evidence_type: EvidenceType
    file_path: str = Field(..., max_length=512)
    captured_at: Optional[datetime] = None
    description: Optional[str] = None
    is_primary: bool = Field(default=False)


class EvidenceCreate(EvidenceBase):
    pass


class EvidenceResponse(EvidenceBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_id: UUID
    created_at: datetime
