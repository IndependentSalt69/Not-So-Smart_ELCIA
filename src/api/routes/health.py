"""
src/api/routes/health.py
Health check endpoint providing API operational status and database connectivity.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.core.config import settings
from src.api.dependencies import get_db
from src.schemas.health import HealthResponse, DatabaseHealthResponse

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Health check",
    status_code=status.HTTP_200_OK,
    response_model=HealthResponse,
)
def check_health(db: Session = Depends(get_db)) -> HealthResponse:
    """
    Check API operational health and database connectivity.
    """
    db_status = "connected"
    db_error = None

    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = "disconnected"
        db_error = str(exc)

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        app_name=settings.APP_NAME,
        environment=settings.APP_ENV,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=DatabaseHealthResponse(
            status=db_status,
            error=db_error,
        ),
    )
