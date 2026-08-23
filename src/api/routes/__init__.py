"""
src/api/routes package
Aggregates all route modules into a single api_router.
"""

from fastapi import APIRouter

from src.api.routes.health import router as health_router
from src.api.routes.incidents import router as incidents_router
from src.api.routes.zones import router as zones_router
from src.api.routes.users import router as users_router
from src.api.routes.analytics import router as analytics_router

api_router = APIRouter()

# Include individual routers
api_router.include_router(health_router)
api_router.include_router(incidents_router)
api_router.include_router(zones_router)
api_router.include_router(users_router)
api_router.include_router(analytics_router)

__all__ = ["api_router"]

