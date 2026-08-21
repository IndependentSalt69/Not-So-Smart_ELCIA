"""
src/api/routes/incidents.py
Incident management route endpoints skeleton.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get(
    "/",
    summary="List incidents",
    status_code=status.HTTP_200_OK,
    response_model=List[Dict[str, Any]],
)
def list_incidents(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    List civic incidents with multi-filtering and spatial criteria.
    (Skeleton placeholder)
    """
    return []


@router.get(
    "/{incident_id}",
    summary="Get incident details",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any],
)
def get_incident(incident_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get detailed information for a single civic incident.
    (Skeleton placeholder)
    """
    return {
        "id": incident_id,
        "message": "Incident detail endpoint skeleton",
    }
