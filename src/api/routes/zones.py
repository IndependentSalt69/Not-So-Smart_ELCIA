"""
src/api/routes/zones.py
Zone management route endpoints skeleton.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get(
    "/",
    summary="List zones",
    status_code=status.HTTP_200_OK,
    response_model=List[Dict[str, Any]],
)
def list_zones(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    List municipal operational zones (e.g. EC-01 to EC-04).
    (Skeleton placeholder)
    """
    return [
        {"zone_id": "EC-01", "name": "Phase 1 - West (Hosur Arterial)"},
        {"zone_id": "EC-02", "name": "Phase 1 - East (Neeladri Road)"},
        {"zone_id": "EC-03", "name": "Phase 2 - North (Velankani Drive)"},
        {"zone_id": "EC-04", "name": "Main Junction Corridor"},
    ]


@router.get(
    "/{zone_id}",
    summary="Get zone details",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any],
)
def get_zone(zone_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get operational zone details.
    (Skeleton placeholder)
    """
    return {
        "zone_id": zone_id,
        "message": f"Zone {zone_id} details endpoint skeleton",
    }
