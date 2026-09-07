"""nullable_zone_and_custom_name

Revision ID: 20260907_005
Revises: 20260907_004
Create Date: 2026-09-07 22:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260907_005"
down_revision: Union[str, None] = "20260907_004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Allow nullable zone_id on incidents and add custom_zone_name to incidents
    and video_verifications to support non-predefined/custom operational zones safely.
    """
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.alter_column("incidents", "zone_id", existing_type=sa.UUID(), nullable=True)

    op.add_column("incidents", sa.Column("custom_zone_name", sa.String(length=128), nullable=True))
    op.add_column("video_verifications", sa.Column("custom_zone_name", sa.String(length=128), nullable=True))


def downgrade() -> None:
    """
    Revert nullable zone_id and drop custom_zone_name columns.
    """
    op.drop_column("video_verifications", "custom_zone_name")
    op.drop_column("incidents", "custom_zone_name")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.alter_column("incidents", "zone_id", existing_type=sa.UUID(), nullable=False)
