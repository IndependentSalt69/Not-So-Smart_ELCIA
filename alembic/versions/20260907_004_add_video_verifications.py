"""add_video_verifications

Revision ID: 20260907_004
Revises: 20260904_003
Create Date: 2026-09-07 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260907_004"
down_revision: Union[str, None] = "20260904_003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Create video_verifications table for human-in-the-loop QA on aerial drone flights
    that produced zero AI-detected incidents.
    """
    op.create_table(
        "video_verifications",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("job_id", sa.String(length=64), nullable=False),
        sa.Column("video_filename", sa.String(length=255), nullable=False),
        sa.Column("video_path", sa.String(length=512), nullable=False),
        sa.Column("annotated_video_url", sa.String(length=512), nullable=True),
        sa.Column("telemetry_path", sa.String(length=512), nullable=True),
        sa.Column("zone_id", sa.UUID(), nullable=True),
        sa.Column("drone_id", sa.String(length=64), nullable=True),
        sa.Column("ai_hazard_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING_REVIEW",
                "CONFIRMED_CLEAR",
                "ANOMALY_REPORTED",
                name="verificationstatus",
                native_enum=False,
                length=32,
            ),
            nullable=False,
            server_default="PENDING_REVIEW",
        ),
        sa.Column("reviewer_id", sa.UUID(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("created_incident_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["created_incident_id"], ["incidents.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["zone_id"], ["zones.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id"),
    )
    op.create_index("ix_video_verifications_id", "video_verifications", ["id"], unique=False)
    op.create_index("ix_video_verifications_job_id", "video_verifications", ["job_id"], unique=True)
    op.create_index("ix_video_verifications_status", "video_verifications", ["status"], unique=False)
    op.create_index("ix_video_verifications_zone_id", "video_verifications", ["zone_id"], unique=False)
    op.create_index("ix_video_verifications_reviewer_id", "video_verifications", ["reviewer_id"], unique=False)
    op.create_index("ix_video_verifications_zone_status", "video_verifications", ["zone_id", "status"], unique=False)


def downgrade() -> None:
    """
    Drop video_verifications table and indices.
    """
    op.drop_index("ix_video_verifications_zone_status", table_name="video_verifications")
    op.drop_index("ix_video_verifications_reviewer_id", table_name="video_verifications")
    op.drop_index("ix_video_verifications_zone_id", table_name="video_verifications")
    op.drop_index("ix_video_verifications_status", table_name="video_verifications")
    op.drop_index("ix_video_verifications_job_id", table_name="video_verifications")
    op.drop_index("ix_video_verifications_id", table_name="video_verifications")
    op.drop_table("video_verifications")
