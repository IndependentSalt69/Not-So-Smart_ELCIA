# Section 2 Implementation Log — Database Migration (Alembic)

- **Timestamp**: 2026-09-04T13:30:00+05:30
- **Status**: Completed
- **Target Revision**: `20260904_003`
- **Down Revision**: `20260825_002`

---

## 1. Section 2 Objective
Create the Alembic migration revision script to support the new `OPEN_MANHOLE` incident type across environments while preserving full backward compatibility with existing data in the active PostgreSQL/Supabase database.

---

## 2. Files Inspected Before Making Changes
- `alembic/versions/20260825_002_add_incident_types.py`: Inspected revision identifier format, branching structure, and defensive PostgreSQL `ALTER TYPE ... ADD VALUE IF NOT EXISTS` syntax.
- `alembic/versions/20260821_001_initial_schema.py`: Inspected initial table creation for `incidents.incident_type` (`sa.Enum(..., native_enum=False, length=32)`).
- `alembic/env.py`: Verified dynamic configuration loading from `src.core.config.settings.DATABASE_URL`.
- `alembic.ini`: Verified version locations and script directory configuration.
- `docs/CURRENT_5CLASS_MIGRATION_AUDIT.md`: Re-verified database empirical findings (PostgreSQL `VARCHAR(32)`, no native enum type in Supabase, 19 existing incident records).

---

## 3. Exact File Created
- **File**: `alembic/versions/20260904_003_add_open_manhole.py`

---

## 4. Full Migration Revision Identifiers
- **`revision: str`**: `"20260904_003"`
- **`down_revision: Union[str, None]`**: `"20260825_002"`
- **`branch_labels`**: `None`
- **`depends_on`**: `None`

---

## 5. Exact Migration Logic Implemented
```python
"""add_open_manhole

Revision ID: 20260904_003
Revises: 20260825_002
Create Date: 2026-09-04 13:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260904_003"
down_revision: Union[str, None] = "20260825_002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Safely update the incident_type definition in PostgreSQL if native enum is present,
    and ensure OPEN_MANHOLE is fully supported.
    """
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Check if native enum 'incidenttype' exists in pg_type
        op.execute(
            """
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incidenttype') THEN
                    BEGIN
                        ALTER TYPE incidenttype ADD VALUE IF NOT EXISTS 'OPEN_MANHOLE';
                    EXCEPTION
                        WHEN duplicate_object THEN NULL;
                    END;
                END IF;
            END$$;
            """
        )


def downgrade() -> None:
    """
    Downgrade migration. Removing enum values from PostgreSQL enums or varchar columns
    is generally non-destructive / no-op to preserve data integrity.
    """
    pass
```

---

## 6. Why No `incidents` Table Alteration Was Made
1. In the initial schema migration (`20260821_001`), the `incident_type` column was declared as `sa.Enum(..., native_enum=False, length=32)`.
2. In PostgreSQL, `native_enum=False` maps directly to `VARCHAR(32)` (`character varying`).
3. Empirical database inspection confirmed that:
   - `incidents.incident_type` is stored as `character varying(32)`.
   - There are no PostgreSQL `CHECK` constraints on `incident_type` in the active database.
   - There is no PostgreSQL native enum `incidenttype` in `pg_type`.
4. As a result, PostgreSQL accepts `'OPEN_MANHOLE'` as a valid string value without requiring an `ALTER TABLE` statement or column rewrite.
5. The migration includes a defensive `DO $$ ... BEGIN ALTER TYPE incidenttype ADD VALUE ... END $$;` block specifically for local development or staging instances that might use native PostgreSQL ENUMs.

---

## 7. Confirmation That Existing Database Data Was Not Touched
- No `alembic upgrade` was executed against the Supabase database.
- No `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `TRUNCATE`, or table rebuilds were executed.
- All 19 existing records in the live Supabase database (`WATERLOGGING: 9`, `POTHOLE: 6`, `DAMAGED_FOOTPATH: 2`, `DRAINAGE_OVERFLOW: 2`) remain untouched and valid.

---

## 8. Validation Commands Executed
1. **Alembic Revision Chain Validation (Python)**:
   ```bash
   .venv\Scripts\python.exe -c "
   from alembic.config import Config
   from alembic.script import ScriptDirectory
   config = Config('alembic.ini')
   script = ScriptDirectory.from_config(config)
   assert script.get_heads() == ['20260904_003']
   revs = [r.revision for r in reversed(list(script.walk_revisions('base', 'head')))]
   assert revs == ['20260821_001', '20260825_002', '20260904_003']
   "
   ```
2. **Alembic Full Lifecycle Test (In-Memory SQLite)**:
   ```bash
   .venv\Scripts\python.exe -m pytest tests/db/test_migrations.py
   ```
3. **Git Status & Working Tree Isolation Check**:
   ```bash
   git status
   ```

---

## 9. Validation Results
- **Script Directory Heads**: `['20260904_003']` (Single linear head).
- **Revision Chain**: `['20260821_001', '20260825_002', '20260904_003']` (Clean, unbroken linear DAG).
- **Migration Test Lifecycle**: `tests/db/test_migrations.py` passed cleanly (1 passed in 0.16s), verifying:
  - `upgrade head` creates all 8 tables and columns.
  - `downgrade base` drops all tables.
  - `upgrade head` re-applies cleanly without errors.

---

## 10. Git Status & Changed Files Summary
```text
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/db/models/enums.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	alembic/versions/20260904_003_add_open_manhole.py
	docs/CURRENT_5CLASS_MIGRATION_AUDIT.md
	docs/SECTION_2_DATABASE_MIGRATION.md
```

---

## 11. Section 3 Status
- Section 3 (**Backend Ingestion Contract**) has **NOT** been started.
- `src/services/ml_ingestion_service.py` remains untouched.
- No further changes will be made until requested.

---

## 12. Warnings, Limitations, & Follow-up
- When deploying to production environments that track migration state via `alembic_version`, `alembic upgrade head` can safely be run to advance `version_num` from `20260825_002` to `20260904_003`.
- The live database already accepts `'OPEN_MANHOLE'` text strings due to its `VARCHAR(32)` column type.
