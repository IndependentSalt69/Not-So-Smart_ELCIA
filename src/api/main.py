"""
src/api/main.py
CivicPulse FastAPI Application Entrypoint.
"""

from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.core.config import settings
from src.api.routes import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for startup and shutdown hooks.
    """
    # Ensure evidence output directories exist
    os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
    os.makedirs(settings.PREDICTIONS_DIR, exist_ok=True)

    # Initialize tables automatically for SQLite
    if settings.DATABASE_URL.startswith("sqlite"):
        from src.db.base import Base
        from src.db.session import engine
        Base.metadata.create_all(bind=engine)

    yield
    # Shutdown cleanups if needed


def create_application() -> FastAPI:
    """
    Factory creating and configuring the FastAPI application.
    """
    app = FastAPI(
        title=settings.APP_NAME,
        description="AI-Assisted Monsoon Civic Risk Intelligence & Response System API",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API Routers (supporting both /api/v1 and /api)
    app.include_router(api_router, prefix="/api/v1")
    if settings.API_V1_PREFIX != "/api/v1":
        app.include_router(api_router, prefix=settings.API_V1_PREFIX)
    app.include_router(api_router, prefix="/api")
    # Also expose /health at root level for orchestrators/load balancers
    from src.api.routes.health import router as health_router
    app.include_router(health_router)

    # Mount static files for evidence and prediction previews if directory exists
    if os.path.exists(settings.EVIDENCE_DIR):
        app.mount("/evidence", StaticFiles(directory=settings.EVIDENCE_DIR), name="evidence")

    @app.get("/", tags=["root"])
    def root():
        return {
            "name": settings.APP_NAME,
            "version": "1.0.0",
            "docs_url": "/docs",
            "health_url": "/health",
        }

    return app


app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.api.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
