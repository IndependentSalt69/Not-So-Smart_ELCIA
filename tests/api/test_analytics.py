"""
tests/api/test_analytics.py
Unit and Integration tests for backend analytics endpoints and repositories.
"""

import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.db.models.incident import Incident
from src.db.models.zone import Zone
from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus
from src.repositories.analytics import (
    get_analytics_summary,
    get_analytics_trends,
    get_analytics_zones,
)


def test_analytics_endpoints_empty_db(client: TestClient):
    """Test analytics endpoints when database contains no incidents or zones."""
    # 1. Summary
    resp_sum = client.get("/api/v1/analytics/summary")
    assert resp_sum.status_code == 200
    data_sum = resp_sum.json()
    assert "kpis" in data_sum
    assert "status_distribution" in data_sum
    assert "priority_distribution" in data_sum
    assert data_sum["kpis"]["waterlogged_area_sqm"] is None

    # 2. Trends default 7 days
    resp_trends = client.get("/api/v1/analytics/trends")
    assert resp_trends.status_code == 200
    data_trends = resp_trends.json()
    assert len(data_trends) == 7
    for item in data_trends:
        assert item["rainfall_mm"] is None

    # 3. Zones
    resp_zones = client.get("/api/v1/analytics/zones")
    assert resp_zones.status_code == 200


def test_analytics_trends_invalid_days(client: TestClient):
    """Test trends endpoint with out-of-bound days parameters."""
    # days = 0 (below min 1)
    resp_zero = client.get("/api/v1/analytics/trends?days=0")
    assert resp_zero.status_code in (400, 422)

    # days = 100 (above max 90)
    resp_over = client.get("/api/v1/analytics/trends?days=100")
    assert resp_over.status_code in (400, 422)


def test_analytics_trends_custom_days_range(client: TestClient):
    """Test trends endpoint with valid days parameters (days=1 and days=30)."""
    resp_1 = client.get("/api/v1/analytics/trends?days=1")
    assert resp_1.status_code == 200
    assert len(resp_1.json()) == 1

    resp_30 = client.get("/api/v1/analytics/trends?days=30")
    assert resp_30.status_code == 200
    assert len(resp_30.json()) == 30


def test_analytics_summary_with_known_fixtures(client: TestClient, db_session: Session):
    """
    Test analytics summary, priority distribution, status distribution,
    pothole counts, and mean resolution calculation against known DB records.
    """
    zone = Zone(
        id=uuid.uuid4(),
        code=f"TST-Z-{uuid.uuid4().hex[:6]}",
        name="Test Zone Alpha",
    )
    db_session.add(zone)
    db_session.commit()

    now = datetime.now(timezone.utc)

    inc1 = Incident(
        incident_code=f"TST-INC-{uuid.uuid4().hex[:6]}",
        incident_type=IncidentType.WATERLOGGING,
        confidence=0.9,
        severity_score=8.5,
        priority=PriorityLevel.P1,
        status=IncidentStatus.DETECTED,
        zone_id=zone.id,
        started_at=now,
    )
    inc2 = Incident(
        incident_code=f"TST-INC-{uuid.uuid4().hex[:6]}",
        incident_type=IncidentType.POTHOLE,
        confidence=0.8,
        severity_score=5.0,
        priority=PriorityLevel.P2,
        status=IncidentStatus.VERIFIED,
        zone_id=zone.id,
        started_at=now,
    )
    inc3 = Incident(
        incident_code=f"TST-INC-{uuid.uuid4().hex[:6]}",
        incident_type=IncidentType.POTHOLE,
        confidence=0.7,
        severity_score=3.0,
        priority=PriorityLevel.P3,
        status=IncidentStatus.DETECTED,
        zone_id=zone.id,
        started_at=now,
    )
    inc4 = Incident(
        incident_code=f"TST-INC-{uuid.uuid4().hex[:6]}",
        incident_type=IncidentType.WATERLOGGING,
        confidence=0.95,
        severity_score=9.0,
        priority=PriorityLevel.P1,
        status=IncidentStatus.CLOSED,
        zone_id=zone.id,
        started_at=now - timedelta(hours=3),
        ended_at=now - timedelta(hours=1),
        duration_seconds=7200.0,
    )

    db_session.add_all([inc1, inc2, inc3, inc4])
    db_session.commit()

    try:
        resp = client.get("/api/v1/analytics/summary")
        assert resp.status_code == 200
        data = resp.json()

        kpis = data["kpis"]
        assert kpis["total_active_incidents"] == 3
        assert kpis["critical_p1_count"] == 2
        assert kpis["high_p2_count"] == 1
        assert kpis["routine_p3_count"] == 1
        assert kpis["pending_verification_count"] == 2
        assert kpis["pothole_clusters_count"] == 2
        assert kpis["mean_time_to_resolution_hours"] == 2.0
        assert kpis["waterlogged_area_sqm"] is None

        status_map = {item["status"]: item["count"] for item in data["status_distribution"]}
        assert status_map["DETECTED"] == 2
        assert status_map["VERIFIED"] == 1
        assert status_map["CLOSED"] == 1

        priority_map = {item["priority"]: item["count"] for item in data["priority_distribution"]}
        assert priority_map["P1"] == 2
        assert priority_map["P2"] == 1
        assert priority_map["P3"] == 1
    finally:
        db_session.delete(inc1)
        db_session.delete(inc2)
        db_session.delete(inc3)
        db_session.delete(inc4)
        db_session.delete(zone)
        db_session.commit()


def test_zone_analytics(client: TestClient, db_session: Session):
    """Test GET /api/v1/analytics/zones with multiple zones and active incident breakdown."""
    z1 = Zone(id=uuid.uuid4(), code=f"Z-AN-01-{uuid.uuid4().hex[:4]}", name="North Zone")
    z2 = Zone(id=uuid.uuid4(), code=f"Z-AN-02-{uuid.uuid4().hex[:4]}", name="South Zone")
    db_session.add_all([z1, z2])
    db_session.commit()

    now = datetime.now(timezone.utc)
    inc_z1_p1 = Incident(
        incident_code=f"Z1-P1-{uuid.uuid4().hex[:4]}",
        incident_type=IncidentType.WATERLOGGING,
        confidence=0.9,
        severity_score=7.0,
        priority=PriorityLevel.P1,
        status=IncidentStatus.IN_PROGRESS,
        zone_id=z1.id,
        started_at=now,
    )
    inc_z1_p2 = Incident(
        incident_code=f"Z1-P2-{uuid.uuid4().hex[:4]}",
        incident_type=IncidentType.POTHOLE,
        confidence=0.8,
        severity_score=5.0,
        priority=PriorityLevel.P2,
        status=IncidentStatus.VERIFIED,
        zone_id=z1.id,
        started_at=now,
    )

    db_session.add_all([inc_z1_p1, inc_z1_p2])
    db_session.commit()

    try:
        resp = client.get("/api/v1/analytics/zones")
        assert resp.status_code == 200
        zones_data = resp.json()

        z1_data = next(item for item in zones_data if item["zone_id"] == str(z1.id))
        assert z1_data["zone_code"] == z1.code
        assert z1_data["active_incidents"] == 2
        assert z1_data["p1_count"] == 1
        assert z1_data["p2_count"] == 1
        assert z1_data["p3_count"] == 0
        assert z1_data["waterlogged_area_sqm"] is None

        z2_data = next(item for item in zones_data if item["zone_id"] == str(z2.id))
        assert z2_data["zone_code"] == z2.code
        assert z2_data["active_incidents"] == 0
        assert z2_data["p1_count"] == 0
    finally:
        db_session.delete(inc_z1_p1)
        db_session.delete(inc_z1_p2)
        db_session.delete(z1)
        db_session.delete(z2)
        db_session.commit()


def test_repository_direct_functions(db_session: Session):
    """Direct repository unit test to verify database queries independently of FastAPI routing."""
    z = Zone(id=uuid.uuid4(), code=f"REPO-Z-{uuid.uuid4().hex[:4]}", name="Repo Test Zone")
    db_session.add(z)
    db_session.commit()

    try:
        summary = get_analytics_summary(db_session)
        assert summary.kpis.total_active_incidents >= 0

        trends = get_analytics_trends(db_session, days=7)
        assert len(trends) == 7

        zones = get_analytics_zones(db_session)
        assert any(item.zone_id == z.id for item in zones)
    finally:
        db_session.delete(z)
        db_session.commit()
