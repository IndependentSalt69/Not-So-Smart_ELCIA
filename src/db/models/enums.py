"""
src/db/models/enums.py
Python Enums used by CivicPulse database models.
"""

import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    INSPECTOR = "INSPECTOR"


class IncidentType(str, enum.Enum):
    WATERLOGGING = "WATERLOGGING"
    POTHOLE = "POTHOLE"
    DRAINAGE_OVERFLOW = "DRAINAGE_OVERFLOW"


class PriorityLevel(str, enum.Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


class IncidentStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RE_INSPECTION = "RE_INSPECTION"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"


class EvidenceType(str, enum.Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    CLIP = "CLIP"


class InspectionResult(str, enum.Enum):
    RESOLVED = "RESOLVED"
    NOT_RESOLVED = "NOT_RESOLVED"
    PARTIALLY_RESOLVED = "PARTIALLY_RESOLVED"
