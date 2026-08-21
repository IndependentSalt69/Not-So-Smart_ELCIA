"""initial_schema

Revision ID: 20260821_001
Revises: 
Create Date: 2026-08-21 16:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry

# revision identifiers, used by Alembic.
revision: str = "20260821_001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Ensure PostGIS extension is created if running on PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # 1. Create zones table
    op.create_table(
        "zones",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "geometry",
            Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_zones_id", "zones", ["id"], unique=False)
    op.create_index("ix_zones_code", "zones", ["code"], unique=True)

    # 2. Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("ADMIN", "OPERATOR", "INSPECTOR", name="userrole", native_enum=False, length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    # 3. Create incidents table
    op.create_table(
        "incidents",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("incident_code", sa.String(length=64), nullable=False),
        sa.Column("incident_type", sa.Enum("WATERLOGGING", "POTHOLE", "DRAINAGE_OVERFLOW", name="incidenttype", native_enum=False, length=32), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("severity_score", sa.Float(), nullable=False),
        sa.Column("priority", sa.Enum("P1", "P2", "P3", name="prioritylevel", native_enum=False, length=10), nullable=False),
        sa.Column("status", sa.Enum("DETECTED", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RE_INSPECTION", "CLOSED", "REJECTED", name="incidentstatus", native_enum=False, length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("recommended_action", sa.Text(), nullable=True),
        sa.Column("zone_id", sa.UUID(), nullable=False),
        sa.Column(
            "location",
            Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="chk_incident_confidence_range"),
        sa.CheckConstraint("severity_score >= 0.0 AND severity_score <= 10.0", name="chk_incident_severity_range"),
        sa.ForeignKeyConstraint(["zone_id"], ["zones.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("incident_code"),
    )
    op.create_index("ix_incidents_id", "incidents", ["id"], unique=False)
    op.create_index("ix_incidents_incident_code", "incidents", ["incident_code"], unique=True)
    op.create_index("ix_incidents_incident_type", "incidents", ["incident_type"], unique=False)
    op.create_index("ix_incidents_priority", "incidents", ["priority"], unique=False)
    op.create_index("ix_incidents_status", "incidents", ["status"], unique=False)
    op.create_index("ix_incidents_started_at", "incidents", ["started_at"], unique=False)
    op.create_index("ix_incidents_created_at", "incidents", ["created_at"], unique=False)
    op.create_index("ix_incidents_zone_id", "incidents", ["zone_id"], unique=False)
    op.create_index("ix_incidents_status_priority", "incidents", ["status", "priority"], unique=False)
    op.create_index("ix_incidents_zone_status", "incidents", ["zone_id", "status"], unique=False)

    # 4. Create detections table
    op.create_table(
        "detections",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("incident_id", sa.UUID(), nullable=False),
        sa.Column("detection_type", sa.String(length=64), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("frame_number", sa.Integer(), nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "location",
            Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
            nullable=True,
        ),
        sa.Column("metadata", postgresql.JSONB().with_variant(sa.JSON(), "sqlite"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="chk_detection_confidence_range"),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_detections_id", "detections", ["id"], unique=False)
    op.create_index("ix_detections_incident_id", "detections", ["incident_id"], unique=False)
    op.create_index("ix_detections_detection_type", "detections", ["detection_type"], unique=False)
    op.create_index("ix_detections_detected_at", "detections", ["detected_at"], unique=False)
    op.create_index("ix_detections_incident_detected_at", "detections", ["incident_id", "detected_at"], unique=False)

    # 5. Create evidence table
    op.create_table(
        "evidence",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("incident_id", sa.UUID(), nullable=False),
        sa.Column("evidence_type", sa.Enum("IMAGE", "VIDEO", "CLIP", name="evidencetype", native_enum=False, length=16), nullable=False),
        sa.Column("file_path", sa.String(length=512), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evidence_id", "evidence", ["id"], unique=False)
    op.create_index("ix_evidence_incident_id", "evidence", ["incident_id"], unique=False)
    op.create_index("ix_evidence_evidence_type", "evidence", ["evidence_type"], unique=False)
    op.create_index("ix_evidence_incident_type", "evidence", ["incident_id", "evidence_type"], unique=False)

    # 6. Create assignments table
    op.create_table(
        "assignments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("incident_id", sa.UUID(), nullable=False),
        sa.Column("assigned_to", sa.UUID(), nullable=False),
        sa.Column("assigned_team", sa.String(length=128), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_assignments_id", "assignments", ["id"], unique=False)
    op.create_index("ix_assignments_incident_id", "assignments", ["incident_id"], unique=False)
    op.create_index("ix_assignments_assigned_to", "assignments", ["assigned_to"], unique=False)
    op.create_index("ix_assignments_assigned_at", "assignments", ["assigned_at"], unique=False)
    op.create_index("ix_assignments_incident_assignee", "assignments", ["incident_id", "assigned_to"], unique=False)

    # 7. Create incident_status_history table
    op.create_table(
        "incident_status_history",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("incident_id", sa.UUID(), nullable=False),
        sa.Column("old_status", sa.Enum("DETECTED", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RE_INSPECTION", "CLOSED", "REJECTED", name="incidentstatus", native_enum=False, length=32), nullable=True),
        sa.Column("new_status", sa.Enum("DETECTED", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RE_INSPECTION", "CLOSED", "REJECTED", name="incidentstatus", native_enum=False, length=32), nullable=False),
        sa.Column("changed_by", sa.UUID(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["changed_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_incident_status_history_id", "incident_status_history", ["id"], unique=False)
    op.create_index("ix_incident_status_history_incident_id", "incident_status_history", ["incident_id"], unique=False)
    op.create_index("ix_incident_status_history_changed_by", "incident_status_history", ["changed_by"], unique=False)
    op.create_index("ix_incident_status_history_changed_at", "incident_status_history", ["changed_at"], unique=False)
    op.create_index("ix_history_incident_changed_at", "incident_status_history", ["incident_id", "changed_at"], unique=False)

    # 8. Create inspections table
    op.create_table(
        "inspections",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("incident_id", sa.UUID(), nullable=False),
        sa.Column("inspector_id", sa.UUID(), nullable=False),
        sa.Column("inspection_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("result", sa.Enum("RESOLVED", "NOT_RESOLVED", "PARTIALLY_RESOLVED", name="inspectionresult", native_enum=False, length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "location",
            Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
            nullable=True,
        ),
        sa.Column("evidence_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["evidence_id"], ["evidence.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspections_id", "inspections", ["id"], unique=False)
    op.create_index("ix_inspections_incident_id", "inspections", ["incident_id"], unique=False)
    op.create_index("ix_inspections_inspector_id", "inspections", ["inspector_id"], unique=False)
    op.create_index("ix_inspections_inspection_time", "inspections", ["inspection_time"], unique=False)
    op.create_index("ix_inspections_result", "inspections", ["result"], unique=False)
    op.create_index("ix_inspections_incident_result", "inspections", ["incident_id", "result"], unique=False)


def downgrade() -> None:
    # Drop tables in reverse dependency order
    op.drop_table("inspections")
    op.drop_table("incident_status_history")
    op.drop_table("assignments")
    op.drop_table("evidence")
    op.drop_table("detections")
    op.drop_table("incidents")
    op.drop_table("users")
    op.drop_table("zones")
