"""add_incident_types

Revision ID: 20260825_002
Revises: 20260821_001
Create Date: 2026-08-25 01:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260825_002"
down_revision: Union[str, None] = "20260821_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Safely update the incident_type definition in PostgreSQL if native enum is present,
    and ensure DRAINAGE_OVERFLOW and DAMAGED_FOOTPATH are fully supported.
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
                        ALTER TYPE incidenttype ADD VALUE IF NOT EXISTS 'DRAINAGE_OVERFLOW';
                    EXCEPTION
                        WHEN duplicate_object THEN NULL;
                    END;
                    BEGIN
                        ALTER TYPE incidenttype ADD VALUE IF NOT EXISTS 'DAMAGED_FOOTPATH';
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
