"""
src/repositories/analytics.py
SQLAlchemy-based database repository functions for backend analytics.
"""

from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from src.db.models.incident import Incident
from src.db.models.zone import Zone
from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus
from src.schemas.analytics import (
    StatusDistributionItem,
    PriorityDistributionItem,
    AnalyticsKPI,
    AnalyticsSummaryResponse,
    AnalyticsTrendItem,
    ZoneAnalyticsResponse,
)


def get_analytics_summary(db: Session) -> AnalyticsSummaryResponse:
    """
    Computes overall summary KPIs, status distribution, and priority distribution
    using database-side SQL aggregation.
    """
    active_condition = Incident.status.notin_([IncidentStatus.CLOSED, IncidentStatus.REJECTED])

    kpi_stmt = select(
        func.count(case((active_condition, 1))).label("total_active_incidents"),
        func.count(case((Incident.priority == PriorityLevel.P1, 1))).label("critical_p1_count"),
        func.count(case((Incident.priority == PriorityLevel.P2, 1))).label("high_p2_count"),
        func.count(case((Incident.priority == PriorityLevel.P3, 1))).label("routine_p3_count"),
        func.count(case((Incident.incident_type == IncidentType.POTHOLE, 1))).label("pothole_clusters_count"),
        func.count(case((Incident.status == IncidentStatus.DETECTED, 1))).label("pending_verification_count"),
        func.avg(
            case(
                (
                    (Incident.duration_seconds.is_not(None)) & (Incident.duration_seconds > 0),
                    Incident.duration_seconds,
                )
            )
        ).label("avg_duration_sec"),
    )
    res = db.execute(kpi_stmt).one()

    mean_hours: float | None = None
    if res.avg_duration_sec is not None:
        mean_hours = round(float(res.avg_duration_sec) / 3600.0, 2)

    kpis = AnalyticsKPI(
        total_active_incidents=res.total_active_incidents or 0,
        critical_p1_count=res.critical_p1_count or 0,
        high_p2_count=res.high_p2_count or 0,
        routine_p3_count=res.routine_p3_count or 0,
        waterlogged_area_sqm=None,
        pothole_clusters_count=res.pothole_clusters_count or 0,
        pending_verification_count=res.pending_verification_count or 0,
        mean_time_to_resolution_hours=mean_hours,
    )

    # Status Distribution
    status_stmt = select(Incident.status, func.count(Incident.id).label("count")).group_by(Incident.status)
    status_rows = db.execute(status_stmt).all()
    status_dist = [StatusDistributionItem(status=row.status, count=row.count) for row in status_rows]

    # Priority Distribution
    priority_stmt = select(Incident.priority, func.count(Incident.id).label("count")).group_by(Incident.priority)
    priority_rows = db.execute(priority_stmt).all()
    priority_dist = [PriorityDistributionItem(priority=row.priority, count=row.count) for row in priority_rows]

    return AnalyticsSummaryResponse(
        kpis=kpis,
        status_distribution=status_dist,
        priority_distribution=priority_dist,
    )


def get_analytics_trends(db: Session, days: int = 7) -> List[AnalyticsTrendItem]:
    """
    Computes daily incident trends (waterlogging vs potholes) over the specified days range.
    Validates 1 <= days <= 90.
    """
    if days < 1 or days > 90:
        raise ValueError("days parameter must be between 1 and 90")

    today = datetime.now(timezone.utc).date()
    start_date = datetime.combine(today - timedelta(days=days - 1), datetime.min.time(), tzinfo=timezone.utc)

    date_col = func.date(Incident.created_at)

    stmt = (
        select(
            date_col.label("trend_date"),
            func.count(case((Incident.incident_type == IncidentType.WATERLOGGING, 1))).label("waterlogging"),
            func.count(case((Incident.incident_type == IncidentType.POTHOLE, 1))).label("potholes"),
            func.count(case((Incident.incident_type == IncidentType.DRAINAGE_OVERFLOW, 1))).label("drainage_overflow"),
            func.count(case((Incident.incident_type == IncidentType.DAMAGED_FOOTPATH, 1))).label("damaged_footpath"),
            func.count(case((Incident.incident_type == IncidentType.OPEN_MANHOLE, 1))).label("open_manhole"),
        )
        .where(Incident.created_at >= start_date)
        .group_by(date_col)
        .order_by(date_col.asc())
    )

    db_rows = db.execute(stmt).all()
    counts_by_date = {}
    for r in db_rows:
        d_str = str(r.trend_date)[:10] if r.trend_date else ""
        if d_str:
            counts_by_date[d_str] = {
                "waterlogging": r.waterlogging or 0,
                "potholes": r.potholes or 0,
                "drainage_overflow": r.drainage_overflow or 0,
                "damaged_footpath": r.damaged_footpath or 0,
                "open_manhole": r.open_manhole or 0,
            }

    trend_items = []
    for i in range(days):
        day_date = (today - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        counts = counts_by_date.get(
            day_date,
            {
                "waterlogging": 0,
                "potholes": 0,
                "drainage_overflow": 0,
                "damaged_footpath": 0,
                "open_manhole": 0,
            },
        )
        trend_items.append(
            AnalyticsTrendItem(
                date=day_date,
                waterlogging=counts["waterlogging"],
                potholes=counts["potholes"],
                drainage_overflow=counts["drainage_overflow"],
                damaged_footpath=counts["damaged_footpath"],
                open_manhole=counts["open_manhole"],
                rainfall_mm=None,
            )
        )

    return trend_items


def get_analytics_zones(db: Session) -> List[ZoneAnalyticsResponse]:
    """
    Computes active incident metrics and priority breakdown grouped per municipal zone.
    """
    active_cond = (Incident.id.is_not(None)) & (Incident.status.notin_([IncidentStatus.CLOSED, IncidentStatus.REJECTED]))

    stmt = (
        select(
            Zone.id.label("zone_id"),
            Zone.code.label("zone_code"),
            Zone.name.label("zone_name"),
            func.count(case((active_cond, 1))).label("active_incidents"),
            func.count(case(((active_cond) & (Incident.priority == PriorityLevel.P1), 1))).label("p1_count"),
            func.count(case(((active_cond) & (Incident.priority == PriorityLevel.P2), 1))).label("p2_count"),
            func.count(case(((active_cond) & (Incident.priority == PriorityLevel.P3), 1))).label("p3_count"),
        )
        .outerjoin(Incident, Zone.id == Incident.zone_id)
        .group_by(Zone.id, Zone.code, Zone.name)
        .order_by(Zone.code.asc())
    )

    rows = db.execute(stmt).all()
    results = []
    for row in rows:
        results.append(
            ZoneAnalyticsResponse(
                zone_id=row.zone_id,
                zone_code=row.zone_code,
                zone_name=row.zone_name,
                active_incidents=row.active_incidents or 0,
                waterlogged_area_sqm=None,
                p1_count=row.p1_count or 0,
                p2_count=row.p2_count or 0,
                p3_count=row.p3_count or 0,
            )
        )
    return results
