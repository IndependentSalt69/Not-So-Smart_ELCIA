"""
src/api/routes/zones.py
Zone management REST API endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from src.api.dependencies import get_db
from src.schemas.zone import ZoneCreate, ZoneResponse, ZoneDetectionResponse
from src.repositories.zones import (
    create_zone,
    get_zone as repo_get_zone,
    list_zones as repo_list_zones,
    resolve_zone_from_telemetry,
)

router = APIRouter(prefix="/zones", tags=["zones"])


@router.post(
    "/",
    summary="Create zone",
    status_code=status.HTTP_201_CREATED,
    response_model=ZoneResponse,
)
def create_new_zone(
    payload: ZoneCreate,
    db: Session = Depends(get_db),
) -> ZoneResponse:
    """Create a new municipal operational zone."""
    try:
        zone = create_zone(
            db=db,
            code=payload.code,
            name=payload.name,
            description=payload.description,
            geometry=payload.geometry,
        )
        return zone
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Zone with code '{payload.code}' already exists.",
        )


@router.post(
    "/detect",
    summary="Detect Surveillance Zone from SRT Telemetry",
    status_code=status.HTTP_200_OK,
    response_model=ZoneDetectionResponse,
)
async def detect_zone_from_srt(
    file: Optional[UploadFile] = File(None, description="Optional DJI SRT subtitle file"),
    srt_text: Optional[str] = Form(None, description="Optional raw SRT text content"),
    db: Session = Depends(get_db),
) -> ZoneDetectionResponse:
    """
    Parses DJI SRT flight telemetry and resolves the containing surveillance zone.
    Returns matched zone or multi-zone distribution.
    """
    content = None
    if file and file.filename:
        content = await file.read()
    elif srt_text:
        content = srt_text

    result = resolve_zone_from_telemetry(db=db, srt_content=content)
    return ZoneDetectionResponse(**result)


@router.get(
    "/",
    summary="List zones",
    status_code=status.HTTP_200_OK,
    response_model=List[ZoneResponse],
)
def list_all_zones(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> List[ZoneResponse]:
    """List municipal operational zones with pagination."""
    return repo_list_zones(db=db, skip=skip, limit=limit)


@router.get(
    "/{zone_id}",
    summary="Get zone details",
    status_code=status.HTTP_200_OK,
    response_model=ZoneResponse,
)
def get_zone_by_id(
    zone_id: str,
    db: Session = Depends(get_db),
) -> ZoneResponse:
    """Get details for an operational zone by ID or zone code."""
    zone = repo_get_zone(db=db, zone_id=zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Zone '{zone_id}' not found.",
        )
    return zone
