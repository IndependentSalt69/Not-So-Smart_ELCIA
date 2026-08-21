"""
src/db/session.py
Database engine and session setup using SQLAlchemy 2.x and psycopg 3.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from src.core.config import settings

# Engine configuration with fast connection timeout on disconnect
engine_kwargs = {
    "pool_pre_ping": True,
    "echo": settings.DEBUG,
}

if settings.DATABASE_URL.startswith("postgresql"):
    engine_kwargs["connect_args"] = {"connect_timeout": 3}
elif settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

# Create SQLAlchemy 2.x Engine
engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)

if settings.DATABASE_URL.startswith("sqlite"):
    try:
        import geoalchemy2.admin.dialects.sqlite
        geoalchemy2.admin.dialects.sqlite.after_create = lambda *args, **kwargs: None
        geoalchemy2.admin.dialects.sqlite.before_drop = lambda *args, **kwargs: None
        geoalchemy2.admin.dialects.sqlite.after_drop = lambda *args, **kwargs: None
    except Exception:
        pass

    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def _register_sqlite_spatial_udfs(dbapi_connection, connection_record):
        def dummy_spatial_udf(*args):
            return None

        spatial_funcs = [
            "GeomFromEWKT",
            "GeomFromText",
            "GeomFromWKB",
            "AsEWKB",
            "AsText",
            "AsBinary",
            "ST_AsText",
            "ST_GeomFromText",
            "ST_GeomFromEWKT",
            "ST_WKBToSQL",
            "ST_AsBinary",
            "SetSRID",
            "RecoverGeometryColumn",
            "InitSpatialMetaData",
            "AddGeometryColumn",
        ]
        for func_name in spatial_funcs:
            try:
                dbapi_connection.create_function(func_name, -1, dummy_spatial_udf)
            except Exception:
                pass

# Session factory bound to engine
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a SQLAlchemy session.
    Closes the session cleanly upon request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
