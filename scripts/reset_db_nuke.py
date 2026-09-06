import sys
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.db.session import engine
from sqlalchemy import text

def reset_database():
    """Wipes the public schema to force SQLAlchemy to rebuild updated ENUMs."""
    print("WARNING: Wiping PostgreSQL public schema...")
    with engine.connect() as conn:
        # Drop everything and recreate the schema
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        
        # --- NEW LINE: Restore PostGIS spatial features ---
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        
        conn.commit()
    print("[SUCCESS] Database wiped clean and PostGIS restored. Ready for fresh seeding!")

if __name__ == "__main__":
    reset_database()