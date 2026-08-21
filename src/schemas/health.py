"""
src/schemas/health.py
Pydantic schemas for API operational health response.
"""

from typing import Optional
from pydantic import BaseModel, Field


class DatabaseHealthResponse(BaseModel):
    status: str = Field(..., description="Database connectivity status: connected or disconnected")
    error: Optional[str] = Field(None, description="Connection error details if disconnected")


class HealthResponse(BaseModel):
    status: str = Field(..., description="API operational status: healthy or degraded")
    app_name: str
    environment: str
    version: str
    timestamp: str
    database: DatabaseHealthResponse
