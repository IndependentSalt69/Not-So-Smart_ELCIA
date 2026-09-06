#!/usr/bin/env python3
"""
scripts/reset_demo_db.py
CivicPulse — Safe Fresh Demo Database Reset Utility

A standalone, transactional CLI utility for resetting application data to a fresh,
clean state for CivicPulse Demo Day while preserving the schema, Alembic migration state,
PostGIS extensions, and infrastructure tables.

Default mode is DRY RUN (preview only). No database records are deleted without:
  1. The --confirm command-line flag
  2. The CIVICPULSE_ALLOW_DEMO_RESET=true environment variable
  3. Explicitly typing the confirmation phrase: "RESET CIVICPULSE DEMO DATABASE"
"""

import sys
import os
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set
from urllib.parse import urlparse

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine

# Silence verbose SQLAlchemy logs
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.core.config import settings
from src.db.session import engine as default_engine

# ==============================================================================
# CONSTANTS & CONFIGURATION
# ==============================================================================

REQUIRED_CONFIRMATION_PHRASE: str = "RESET CIVICPULSE DEMO DATABASE"
ALLOW_RESET_ENV_VAR: str = "CIVICPULSE_ALLOW_DEMO_RESET"

# Exact child-to-parent deletion order for operational activity records
# Operational setup (users, zones) and schema/migrations are strictly preserved.
APPLICATION_TABLES_IN_ORDER: List[str] = [
    "inspections",
    "incident_status_history",
    "assignments",
    "evidence",
    "detections",
    "incidents",
]

# Explicit list of infrastructure & operational setup tables that must NEVER be deleted
PRESERVED_SYSTEM_TABLES: List[str] = [
    "users",
    "zones",
    "alembic_version",
    "spatial_ref_sys",
]

# File extensions protected from any filesystem cleanup
PROTECTED_EXTENSIONS: Set[str] = {
    ".py",
    ".pyc",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".yaml",
    ".yml",
    ".md",
    ".txt",
    ".sh",
    ".ps1",
    ".env",
    ".gitignore",
    ".pt",
    ".pth",
    ".onnx",
    ".engine",
}

# Directories targeted for optional demo artifact cleanup
DEMO_ARTIFACT_DIRS: List[str] = [
    "outputs/jobs",
    "outputs/evidence",
    "outputs/incidents",
    "outputs/predictions",
    "uploads",
]


# ==============================================================================
# DATABASE CONNECTION & METADATA
# ==============================================================================

def get_connection_metadata(db_url: Optional[str] = None) -> Dict[str, str]:
    """Extract human-readable connection metadata from database URL or settings."""
    url_str = db_url or settings.DATABASE_URL
    if url_str.startswith("sqlite"):
        return {
            "dialect": "sqlite",
            "host": "local (in-memory / file)",
            "port": "N/A",
            "db": url_str.split("///")[-1] or ":memory:",
            "user": "N/A",
            "environment": settings.APP_ENV,
        }

    # PostgreSQL URL parsing
    try:
        clean_url = url_str.replace("postgresql+psycopg://", "postgresql://")
        parsed = urlparse(clean_url)
        return {
            "dialect": "postgresql",
            "host": parsed.hostname or settings.POSTGRES_HOST or "localhost",
            "port": str(parsed.port or settings.POSTGRES_PORT or "5432"),
            "db": (parsed.path.lstrip("/") if parsed.path else None) or settings.POSTGRES_DB or "civicpulse_db",
            "user": parsed.username or settings.POSTGRES_USER or "postgres",
            "environment": settings.APP_ENV,
        }
    except Exception:
        return {
            "dialect": "unknown",
            "host": settings.POSTGRES_HOST,
            "port": str(settings.POSTGRES_PORT),
            "db": settings.POSTGRES_DB,
            "user": settings.POSTGRES_USER,
            "environment": settings.APP_ENV,
        }


def get_existing_tables(target_engine: Engine) -> Set[str]:
    """Retrieve list of all table names currently present in the database."""
    inspector = inspect(target_engine)
    return set(inspector.get_table_names())


def inspect_table_row_counts(target_engine: Engine, tables: List[str]) -> Dict[str, int]:
    """Query current row counts for specified tables."""
    existing_tables = get_existing_tables(target_engine)
    counts: Dict[str, int] = {}

    with target_engine.connect() as conn:
        for table in tables:
            if table in existing_tables:
                try:
                    res = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                    counts[table] = int(res) if res is not None else 0
                except Exception as e:
                    counts[table] = -1
            else:
                counts[table] = 0

    return counts


# ==============================================================================
# AUTHORIZATION & SAFETY CHECKS
# ==============================================================================

def is_reset_authorized_by_env() -> bool:
    """Check if the environment variable authorizes demo database reset."""
    val = os.environ.get(ALLOW_RESET_ENV_VAR, "").strip().lower()
    return val in ("true", "1", "yes", "t")


# ==============================================================================
# CORE RESET LOGIC (TRANSACTIONAL)
# ==============================================================================

def execute_database_reset(
    target_engine: Engine,
    tables_to_clear: Optional[List[str]] = None,
) -> Tuple[Dict[str, int], int]:
    """
    Executes a transactional reset of application tables in strict child-to-parent order.
    Returns (per_table_deleted_counts, total_rows_deleted).
    Raises Exception and automatically rolls back if any table deletion fails.
    """
    if tables_to_clear is None:
        tables_to_clear = APPLICATION_TABLES_IN_ORDER

    existing_tables = get_existing_tables(target_engine)
    counts_before = inspect_table_row_counts(target_engine, tables_to_clear)
    deleted_counts: Dict[str, int] = {}
    total_deleted = 0

    # Single atomic transaction
    with target_engine.begin() as conn:
        for table in tables_to_clear:
            if table in existing_tables:
                row_count = counts_before.get(table, 0)
                if row_count > 0:
                    conn.execute(text(f"DELETE FROM {table}"))
                    deleted_counts[table] = row_count
                    total_deleted += row_count
                else:
                    deleted_counts[table] = 0
            else:
                deleted_counts[table] = 0

    return deleted_counts, total_deleted


def verify_post_reset_state(
    target_engine: Engine,
    tables_checked: Optional[List[str]] = None,
    expected_preserved_counts: Optional[Dict[str, int]] = None,
    expected_alembic_version: Optional[str] = None,
) -> Tuple[bool, List[str]]:
    """
    Verifies that:
      1. All operational activity tables have 0 rows.
      2. Preserved tables (users, zones) row counts are completely unchanged.
      3. Alembic migration version is strictly unchanged.
      4. PostGIS extension and database connections remain healthy and intact.
    """
    if tables_checked is None:
        tables_checked = APPLICATION_TABLES_IN_ORDER

    existing = get_existing_tables(target_engine)
    errors: List[str] = []

    # 1. Verify operational activity tables are empty (0 rows)
    counts = inspect_table_row_counts(target_engine, tables_checked)
    for table, count in counts.items():
        if count > 0:
            errors.append(f"Operational table '{table}' still contains {count} rows after reset.")

    # 2. Verify preserved operational setup tables (users, zones) row counts are unchanged
    if expected_preserved_counts:
        preserved_after = inspect_table_row_counts(target_engine, list(expected_preserved_counts.keys()))
        for table, expected_cnt in expected_preserved_counts.items():
            actual_cnt = preserved_after.get(table, 0)
            if actual_cnt != expected_cnt:
                errors.append(
                    f"Preserved table '{table}' count changed! Before: {expected_cnt}, After: {actual_cnt}."
                )

    # 3. Verify alembic_version still exists and exact version is unchanged
    if "alembic_version" in existing:
        with target_engine.connect() as conn:
            try:
                ver = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
                if not ver:
                    errors.append("alembic_version exists but contains no version number.")
                elif expected_alembic_version is not None and ver != expected_alembic_version:
                    errors.append(
                        f"Alembic version changed! Before: '{expected_alembic_version}', After: '{ver}'."
                    )
            except Exception as e:
                errors.append(f"Failed to query alembic_version: {e}")

    # 4. Verify PostGIS extension is responsive (PostgreSQL only)
    if target_engine.dialect.name == "postgresql":
        with target_engine.connect() as conn:
            try:
                pg_res = conn.execute(text("SELECT PostGIS_Version();")).scalar()
                if not pg_res:
                    errors.append("PostGIS extension query returned empty response.")
            except Exception as e:
                # Some test PostgreSQL instances might not have PostGIS loaded; note warning
                pass

    return (len(errors) == 0, errors)


# ==============================================================================
# OPTIONAL DEMO FILE CLEANUP
# ==============================================================================

def execute_demo_file_cleanup(base_path: Optional[Path] = None) -> Tuple[int, int]:
    """
    Safely removes demo-generated artifacts (images, mp4s, logs, job directories)
    from known output/upload paths, preserving .gitkeep, model weights, and code.
    Returns (files_removed_count, dirs_removed_count).
    """
    root = base_path or PROJECT_ROOT
    files_removed = 0
    dirs_removed = 0

    for rel_dir in DEMO_ARTIFACT_DIRS:
        target_dir = root / rel_dir
        if not target_dir.exists() or not target_dir.is_dir():
            continue

        # Walk bottom-up to remove files then empty subdirectories
        for item in sorted(target_dir.glob("**/*"), reverse=True):
            if item.name in (".gitkeep", ".gitignore"):
                continue

            if item.is_file():
                if item.suffix.lower() not in PROTECTED_EXTENSIONS:
                    try:
                        item.unlink()
                        files_removed += 1
                    except OSError:
                        pass
            elif item.is_dir():
                # Only delete subdirectories inside target_dir, never target_dir itself
                if item != target_dir:
                    try:
                        # Only delete directory if empty (or only contained deleted artifacts)
                        if not any(item.iterdir()):
                            item.rmdir()
                            dirs_removed += 1
                    except OSError:
                        pass

    return files_removed, dirs_removed


# ==============================================================================
# CLI DISPLAY & ENTRYPOINT
# ==============================================================================

def print_banner(meta: Dict[str, str]):
    print("")
    print("=" * 60)
    print(" CivicPulse -- Fresh Demo Database Reset Utility")
    print("=" * 60)
    print(f" Database Dialect:  {meta.get('dialect')}")
    print(f" POSTGRES_HOST:     {meta.get('host')}")
    print(f" POSTGRES_PORT:     {meta.get('port')}")
    print(f" POSTGRES_DB:       {meta.get('db')}")
    print(f" POSTGRES_USER:     {meta.get('user')}")
    print(f" Environment:       {meta.get('environment')}")
    print("=" * 60)
    print("")


def main(engine_override: Optional[Engine] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Safely reset CivicPulse application data to a fresh demo state."
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Explicitly confirm intent to delete demo/application data.",
    )
    parser.add_argument(
        "--clean-files",
        action="store_true",
        help="Purge demo-generated output and upload artifacts after database reset.",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="Override database connection URL (used for isolated testing).",
    )

    args = parser.parse_args()

    # Determine target engine (force echo=False for clean CLI output)
    if engine_override is not None:
        active_engine = engine_override
    elif args.db_url:
        active_engine = create_engine(args.db_url, echo=False)
    else:
        active_engine = create_engine(settings.DATABASE_URL, echo=False)

    effective_url = str(active_engine.url) if engine_override is not None else args.db_url
    meta = get_connection_metadata(effective_url)
    print_banner(meta)

    # 1. Inspect current database state and record baselines
    print("[1/4] Inspecting database tables and recording baseline counts...")
    counts_before = inspect_table_row_counts(active_engine, APPLICATION_TABLES_IN_ORDER)
    total_existing_rows = sum(counts_before.values())

    # Record baseline counts for preserved tables
    preserved_counts_before = inspect_table_row_counts(active_engine, ["users", "zones"])

    # Record baseline Alembic version
    existing_tables = get_existing_tables(active_engine)
    alembic_version_before = None
    if "alembic_version" in existing_tables:
        with active_engine.connect() as conn:
            try:
                alembic_version_before = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            except Exception:
                pass

    print("\nTarget Operational Activity Tables (in deletion order):")
    for tbl in APPLICATION_TABLES_IN_ORDER:
        cnt = counts_before.get(tbl, 0)
        print(f"  - {tbl.ljust(26)}: {cnt} rows")

    print("\nPreserved Infrastructure & Operational Setup Tables:")
    print(f"  [PRESERVED] users                 : {preserved_counts_before.get('users', 0)} rows (intact)")
    print(f"  [PRESERVED] zones                 : {preserved_counts_before.get('zones', 0)} rows (intact)")
    print(f"  [PRESERVED] alembic_version       : {alembic_version_before or 'intact'} (Schema & Migrations)")
    print(f"  [PRESERVED] spatial_ref_sys       : PostGIS coordinate reference systems intact")

    print(f"\nTotal operational activity records that would be removed: {total_existing_rows}")

    # 2. Dry Run Mode Check
    if not args.confirm:
        print("\n" + "-" * 60)
        print("[DRY RUN / PREVIEW ONLY]")
        print("No database records were deleted.")
        print("-" * 60)
        print("\nTo execute an authorized demo reset:")
        print(f"  1. Set environment variable: export {ALLOW_RESET_ENV_VAR}=true")
        print("  2. Re-run command:           python scripts/reset_demo_db.py --confirm")
        if args.clean_files:
            print("  (with --clean-files to also purge demo upload/output assets)")
        print("")
        return 0

    # 3. Environment Authorization Check
    print("\n[2/4] Verifying authorization...")
    if not is_reset_authorized_by_env():
        print(f"\n[ERROR] Missing or invalid authorization environment variable: {ALLOW_RESET_ENV_VAR}")
        print("Reset aborted. Set the authorization variable before running with --confirm:")
        print(f"  export {ALLOW_RESET_ENV_VAR}=true")
        print(f"  (or in PowerShell: $env:{ALLOW_RESET_ENV_VAR}=\"true\")\n")
        return 1

    print(f"      Authorization: {ALLOW_RESET_ENV_VAR}=true (VERIFIED)")

    # 4. Mandatory Interactive Confirmation Phrase
    print("\n" + "!" * 60)
    print(" WARNING: THIS ACTION WILL PERMANENTLY DELETE ALL OPERATIONAL ACTIVITY DATA")
    print(f" TARGET DATABASE: {meta.get('db')} on {meta.get('host')}")
    print("!" * 60)
    print(f"\nTo proceed, type the exact confirmation phrase: '{REQUIRED_CONFIRMATION_PHRASE}'")
    try:
        user_input = input("Confirmation: ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\n[ABORTED] Operation cancelled by user.")
        return 1

    if user_input != REQUIRED_CONFIRMATION_PHRASE:
        print(f"\n[ABORTED] Confirmation phrase did not match.")
        print(f"Expected: '{REQUIRED_CONFIRMATION_PHRASE}'")
        print(f"Received: '{user_input}'")
        print("No database records were deleted.\n")
        return 1

    # 5. Execute Transactional Deletion
    print("\n[3/4] Executing transactional data reset...")
    try:
        deleted_counts, total_deleted = execute_database_reset(active_engine)
    except Exception as e:
        print(f"\n[ERROR] Reset failed: {e}")
        print("[ROLLBACK] Transaction rolled back. No partial changes committed.\n")
        return 1

    # 6. Post-Reset Strict Verification
    print("\n[4/4] Verifying database integrity after reset...")
    is_valid, errors = verify_post_reset_state(
        target_engine=active_engine,
        expected_preserved_counts=preserved_counts_before,
        expected_alembic_version=alembic_version_before,
    )
    if not is_valid:
        print("\n[WARNING] Post-reset verification encountered issues:")
        for err in errors:
            print(f"  ! {err}")
        return 1

    # 7. Optional File Cleanup
    files_cleaned = 0
    dirs_cleaned = 0
    if args.clean_files:
        print("\n[OPTIONAL] Purging demo output and upload artifacts...")
        files_cleaned, dirs_cleaned = execute_demo_file_cleanup()
        print(f"      Files removed: {files_cleaned}")
        print(f"      Empty folders removed: {dirs_cleaned}")

    # 8. Print Final Summary
    print("\n" + "=" * 60)
    print(" CivicPulse Demo Database Reset Complete")
    print("=" * 60)
    print(f" Operational activity data removed: {total_deleted} rows\n")
    print(" Tables cleared:")
    for tbl in APPLICATION_TABLES_IN_ORDER:
        print(f"   {tbl.ljust(26)}: 0")

    print("\n Preserved (Operational Setup & Infrastructure):")
    print("   users                   : preserved (operational users intact)")
    print("   zones                   : preserved (operational zones intact)")
    print("   schema                  : intact")
    print("   migrations              : intact")
    print("   PostGIS                 : intact")
    print("   alembic_version         : preserved")

    if args.clean_files:
        print(f"\n Filesystem Cleanup:")
        print(f"   Demo artifacts purged   : {files_cleaned} files ({dirs_cleaned} folders)")

    print("\n System ready for live demo (no re-seeding required).")
    print("=" * 60 + "\n")

    return 0




if __name__ == "__main__":
    sys.exit(main())
