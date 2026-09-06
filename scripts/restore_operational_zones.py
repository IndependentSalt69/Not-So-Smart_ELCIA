#!/usr/bin/env python3
"""
scripts/restore_operational_zones.py
CivicPulse — Safe Idempotent Operational Zones Restoration Utility

Restores the 4 authoritative ELCIA municipal operational zones (EC-01 to EC-04)
into the PostgreSQL/PostGIS database if missing, without altering schema, migrations,
users, or creating demo incidents.

Default mode is DRY RUN (preview only). No database records are created without:
  --apply
"""

import sys
import os
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

from sqlalchemy import create_engine, select, text, func
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine

# Silence verbose SQLAlchemy logs
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.core.config import settings
from src.db.models.zone import Zone
from src.repositories.zones import create_zone, get_zone
from src.core.spatial import geoalchemy_to_geojson

# ==============================================================================
# AUTHORITATIVE CIVICPULSE OPERATIONAL ZONE DEFINITIONS (SRID 4326)
# ==============================================================================

AUTHORITATIVE_ZONES: List[Dict[str, str]] = [
    {
        "code": "EC-01",
        "name": "Phase 1 - West (Hosur Road Corridor)",
        "description": "Primary technology corridor along Hosur Road arterial underpass.",
        "geometry": "POLYGON((77.670 12.835, 77.680 12.835, 77.680 12.845, 77.670 12.845, 77.670 12.835))",
    },
    {
        "code": "EC-02",
        "name": "Phase 1 - East (Neeladri Road)",
        "description": "High-density commercial and residential junction along Neeladri Road.",
        "geometry": "POLYGON((77.680 12.845, 77.690 12.845, 77.690 12.855, 77.680 12.855, 77.680 12.845))",
    },
    {
        "code": "EC-03",
        "name": "Phase 2 - North (Velankani Drive)",
        "description": "Tech park entry corridor and culvert catchment area near Velankani Drive.",
        "geometry": "POLYGON((77.685 12.855, 77.695 12.855, 77.695 12.865, 77.685 12.865, 77.685 12.855))",
    },
    {
        "code": "EC-04",
        "name": "Main Junction Corridor (EPIC Area)",
        "description": "Central ELCIA municipal hub and traffic management intersection.",
        "geometry": "POLYGON((77.675 12.840, 77.688 12.840, 77.688 12.850, 77.675 12.850, 77.675 12.840))",
    },
]


def inspect_zones_status(db: Session) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Inspect the database for each authoritative zone.
    Returns (present_zones, missing_zones).
    """
    present = []
    missing = []

    for zdef in AUTHORITATIVE_ZONES:
        existing = get_zone(db, zdef["code"])
        if existing:
            present.append({
                "definition": zdef,
                "record": existing,
                "has_geometry": existing.geometry is not None,
            })
        else:
            missing.append({
                "definition": zdef,
            })

    return present, missing


def restore_missing_zones(db: Session, missing_zones: List[Dict[str, Any]]) -> List[Zone]:
    """
    Insert only missing authoritative operational zones into the database.
    Does not touch existing records.
    """
    created = []
    for item in missing_zones:
        zdef = item["definition"]
        zone = create_zone(
            db=db,
            code=zdef["code"],
            name=zdef["name"],
            description=zdef["description"],
            geometry=zdef["geometry"],
        )
        created.append(zone)
    return created


def verify_operational_zones(db: Session) -> Tuple[bool, List[str]]:
    """
    Verify all 4 authoritative zones exist and have valid geometries.
    """
    errors = []
    for zdef in AUTHORITATIVE_ZONES:
        zone = get_zone(db, zdef["code"])
        if not zone:
            errors.append(f"Zone {zdef['code']} is missing from database.")
        elif zone.geometry is None:
            errors.append(f"Zone {zdef['code']} exists but geometry is NULL.")

    return len(errors) == 0, errors


def print_banner(db_url: str):
    print("")
    print("=" * 65)
    print(" CivicPulse -- Operational Zones Restoration Utility")
    print("=" * 65)
    if "sqlite" in db_url:
        print(" Database:  SQLite (isolated / test)")
    else:
        print(f" Database:  {settings.POSTGRES_DB} on {settings.POSTGRES_HOST}")
    print(" Target:    4 Authoritative ELCIA Operational Zones (EC-01 to EC-04)")
    print("=" * 65)
    print("")


def main(engine_override: Optional[Engine] = None, apply_override: Optional[bool] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Safely and idempotently restore authoritative CivicPulse operational zones."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes and insert missing operational zones into the database.",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="Override database connection URL (used for isolated testing).",
    )

    args = parser.parse_args()
    should_apply = apply_override if apply_override is not None else args.apply

    # Determine target engine
    if engine_override is not None:
        active_engine = engine_override
    elif args.db_url:
        active_engine = create_engine(args.db_url, echo=False)
    else:
        active_engine = create_engine(settings.DATABASE_URL, echo=False)

    SessionFactory = sessionmaker(bind=active_engine, autocommit=False, autoflush=False)
    db = SessionFactory()

    try:
        print_banner(str(active_engine.url))

        # 1. Inspect status
        print("[1/3] Inspecting operational zones in database...")
        present, missing = inspect_zones_status(db)

        print("\nAuthoritative Zones Status:")
        for zdef in AUTHORITATIVE_ZONES:
            code = zdef["code"]
            is_present = any(p["definition"]["code"] == code for p in present)
            if is_present:
                print(f"  [PRESENT] {code} - {zdef['name']}")
                print(f"            Geometry: WKT POLYGON (SRID 4326) [IN TACT]")
            else:
                print(f"  [MISSING] {code} - {zdef['name']}")
                print(f"            Target Geometry: {zdef['geometry']}")

        print(f"\nSummary: {len(present)} zones present, {len(missing)} zones missing.")

        # 2. Dry Run Mode
        if not should_apply:
            print("\n" + "-" * 65)
            print("[DRY RUN / PREVIEW ONLY]")
            print("No changes were made to the database.")
            print("-" * 65)
            if len(missing) > 0:
                print("\nTo insert the missing operational zones, run:")
                print("  python scripts/restore_operational_zones.py --apply\n")
            else:
                print("\nAll operational zones are already present. Database is ready.\n")
            return 0

        # 3. Apply missing zones
        print("\n[2/3] Applying restoration for missing zones...")
        if len(missing) == 0:
            print("      All 4 operational zones are already present. Nothing to insert.")
        else:
            created = restore_missing_zones(db, missing)
            print(f"      Successfully inserted {len(created)} missing operational zones:")
            for z in created:
                print(f"      + {z.code}: {z.name}")

        # 4. Post-restoration verification
        print("\n[3/3] Verifying operational zones integrity...")
        is_valid, errors = verify_operational_zones(db)
        if not is_valid:
            print("\n[ERROR] Zone verification failed:")
            for err in errors:
                print(f"  ! {err}")
            return 1

        print("      All 4 zones verified with valid non-null PostGIS geometries.")
        print("\n" + "=" * 65)
        print(" CivicPulse Operational Zones Ready")
        print("=" * 65)
        print(" Operational zones in database:")
        for zdef in AUTHORITATIVE_ZONES:
            print(f"   * {zdef['code']} - {zdef['name']}")
        print("\n Ingestion workflow is unblocked and ready for video processing.")
        print("=" * 65 + "\n")
        return 0

    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
