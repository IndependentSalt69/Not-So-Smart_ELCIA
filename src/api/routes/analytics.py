"""
src/api/routes/analytics.py
Backend analytics REST API endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.schemas.analytics import (
    AnalyticsSummaryResponse,
    AnalyticsTrendItem,
    ZoneAnalyticsResponse,
)
from src.repositories import (
    get_analytics_summary,
    get_analytics_trends,
    get_analytics_zones,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/summary",
    summary="Get analytics summary KPIs and distributions",
    status_code=status.HTTP_200_OK,
    response_model=AnalyticsSummaryResponse,
)
def read_analytics_summary(
    db: Session = Depends(get_db),
) -> AnalyticsSummaryResponse:
    """
    Retrieve summary KPIs, status distribution, and priority distribution derived from database records.
    """
    return get_analytics_summary(db=db)


@router.get(
    "/trends",
    summary="Get daily incident trends",
    status_code=status.HTTP_200_OK,
    response_model=List[AnalyticsTrendItem],
)
def read_analytics_trends(
    days: int = Query(7, description="Number of days to include in trend analysis (1 to 90)"),
    db: Session = Depends(get_db),
) -> List[AnalyticsTrendItem]:
    """
    Retrieve daily incident trend counts (waterlogging vs potholes) for the requested number of days.
    """
    try:
        return get_analytics_trends(db=db, days=days)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/zones",
    summary="Get zone operational analytics",
    status_code=status.HTTP_200_OK,
    response_model=List[ZoneAnalyticsResponse],
)
def read_analytics_zones(
    db: Session = Depends(get_db),
) -> List[ZoneAnalyticsResponse]:
    """
    Retrieve operational risk metrics and priority breakdown grouped by municipal zone.
    """
    return get_analytics_zones(db=db)
