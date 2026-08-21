"""
src/repositories package
Data access repository layer for CivicPulse entities.
"""

from src.repositories.zones import (
    create_zone,
    get_zone,
    list_zones,
    update_zone,
)
from src.repositories.users import (
    create_user,
    get_user,
    list_users,
    update_user,
)
from src.repositories.incidents import (
    create_incident,
    get_incident,
    list_incidents,
    update_incident,
    update_incident_status,
)
from src.repositories.evidence import (
    create_evidence,
    list_incident_evidence,
)
from src.repositories.detections import (
    create_detection,
    list_incident_detections,
)
from src.repositories.assignments import (
    create_assignment,
    get_incident_assignments,
)
from src.repositories.inspections import (
    create_inspection,
    list_incident_inspections,
)
from src.repositories.history import (
    create_status_history,
    list_incident_status_history,
)

__all__ = [
    # ZONES
    "create_zone",
    "get_zone",
    "list_zones",
    "update_zone",
    # USERS
    "create_user",
    "get_user",
    "list_users",
    "update_user",
    # INCIDENTS
    "create_incident",
    "get_incident",
    "list_incidents",
    "update_incident",
    "update_incident_status",
    # EVIDENCE
    "create_evidence",
    "list_incident_evidence",
    # DETECTIONS
    "create_detection",
    "list_incident_detections",
    # ASSIGNMENTS
    "create_assignment",
    "get_incident_assignments",
    # INSPECTIONS
    "create_inspection",
    "list_incident_inspections",
    # STATUS HISTORY
    "create_status_history",
    "list_incident_status_history",
]
