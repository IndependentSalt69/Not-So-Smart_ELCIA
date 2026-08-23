"""
src/schemas package
Pydantic data validation and serialization schemas for CivicPulse API.
"""

from src.schemas.zone import ZoneCreate, ZoneUpdate, ZoneResponse
from src.schemas.user import UserCreate, UserUpdate, UserResponse
from src.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentStatusUpdate,
    IncidentResponse,
    IncidentListResponse,
)
from src.schemas.evidence import EvidenceCreate, EvidenceResponse
from src.schemas.detection import DetectionCreate, DetectionResponse
from src.schemas.assignment import AssignmentCreate, AssignmentResponse
from src.schemas.inspection import InspectionCreate, InspectionResponse
from src.schemas.history import StatusHistoryResponse
from src.schemas.health import HealthResponse, DatabaseHealthResponse
from src.schemas.analytics import (
    StatusDistributionItem,
    PriorityDistributionItem,
    AnalyticsKPI,
    AnalyticsSummaryResponse,
    AnalyticsTrendItem,
    ZoneAnalyticsResponse,
    ZoneAnalyticsItem,
)

__all__ = [
    "ZoneCreate",
    "ZoneUpdate",
    "ZoneResponse",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "IncidentCreate",
    "IncidentUpdate",
    "IncidentStatusUpdate",
    "IncidentResponse",
    "IncidentListResponse",
    "EvidenceCreate",
    "EvidenceResponse",
    "DetectionCreate",
    "DetectionResponse",
    "AssignmentCreate",
    "AssignmentResponse",
    "InspectionCreate",
    "InspectionResponse",
    "StatusHistoryResponse",
    "HealthResponse",
    "DatabaseHealthResponse",
    "StatusDistributionItem",
    "PriorityDistributionItem",
    "AnalyticsKPI",
    "AnalyticsSummaryResponse",
    "AnalyticsTrendItem",
    "ZoneAnalyticsResponse",
    "ZoneAnalyticsItem",
]

