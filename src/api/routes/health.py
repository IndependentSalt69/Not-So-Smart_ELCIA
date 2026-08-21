"""
src/api/routes/health.py
Health check endpoint providing API and Database status.
"""

from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.core.config import settings
from src.db.session import get_db

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Health check",
    status_code=status.HTTP_200_OK,
    response_model=Dict[str, Any],
)
def check_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Check API operational health and database connectivity.
    Works reliably even if the database is temporarily unavailable.
    """
    db_status = "connected"
    db_error = None

    try:
        # Perform lightweight connectivity query
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = "disconnected"
        db_error = str(exc)

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": db_status,
            "error": db_error,
        },
    }
