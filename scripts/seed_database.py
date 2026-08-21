"""
scripts/seed_database.py
Initializes database tables and seeds initial municipal reference data.
"""

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from src.core.config import settings
from src.db.session import engine, SessionLocal
from src.db.base import Base


def seed_database():
    """
    Checks database connection and initializes metadata.
    """
    print(f"[CivicPulse DB] Connecting to database at: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();")).scalar()
            print(f"[CivicPulse DB] Connection successful! PostgreSQL Version:\n  {result}")

            # Verify PostGIS extension if available
            try:
                postgis_version = connection.execute(text("SELECT PostGIS_Version();")).scalar()
                print(f"[CivicPulse DB] PostGIS Extension enabled. Version: {postgis_version}")
            except Exception:
                print("[CivicPulse DB] Notice: PostGIS extension not yet created or queried.")

            # Create registered tables
            print("[CivicPulse DB] Creating table schemas via SQLAlchemy metadata...")
            Base.metadata.create_all(bind=connection)
            connection.commit()
            print("[CivicPulse DB] Schema initialization complete.")

    except Exception as exc:
        print(f"[CivicPulse DB ERROR] Could not connect to database: {exc}")
        print("[CivicPulse DB] Please verify your PostgreSQL connection in .env or environment variables.")


if __name__ == "__main__":
    seed_database()
