"""
src/api/main.py
CivicPulse FastAPI Application Entrypoint.
"""

import asyncio
from contextlib import asynccontextmanager
import os
import sys

if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

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

    # Configure CORS driven by environment settings
    cors_origins = (
        [settings.CORS_ORIGINS]
        if isinstance(settings.CORS_ORIGINS, str)
        else settings.CORS_ORIGINS
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API Routers (exactly once for /api/v1 and /api)
    app.include_router(api_router, prefix="/api/v1")
    app.include_router(api_router, prefix="/api")
    # Also expose /health at root level for orchestrators/load balancers
    from src.api.routes.health import router as health_router
    app.include_router(health_router)

    # Ensure evidence output and job output directories exist
    os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
    os.makedirs(settings.JOBS_DIR, exist_ok=True)

    # Mount static files for evidence under /static/evidence and /evidence
    app.mount(
        "/static/evidence",
        StaticFiles(directory=settings.EVIDENCE_DIR),
        name="static_evidence",
    )
    app.mount(
        "/evidence",
        StaticFiles(directory=settings.EVIDENCE_DIR),
        name="evidence",
    )
    app.mount(
        "/static/jobs",
        StaticFiles(directory=settings.JOBS_DIR),
        name="static_jobs",
    )


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
