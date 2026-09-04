"""
src/repositories/zones.py
Repository functions for Zone entity management.
"""

import uuid
from typing import Optional, List, Union, Any, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session
from shapely.geometry import Point, shape

from src.db.models.zone import Zone
from src.core.spatial import (
    geojson_to_geoalchemy,
    geoalchemy_to_geojson,
    parse_srt_gps_points,
)


def parse_uuid(val: Union[uuid.UUID, str]) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except ValueError:
        return None


def create_zone(
    db: Session,
    code: str,
    name: str,
    description: Optional[str] = None,
    geometry: Optional[Any] = None,
) -> Zone:
    """Create a new municipal operational zone."""
    geom_elem = geojson_to_geoalchemy(geometry)
    zone = Zone(
        code=code,
        name=name,
        description=description,
        geometry=geom_elem,
    )
    try:
        db.add(zone)
        db.commit()
        db.refresh(zone)
        return zone
    except Exception:
        db.rollback()
        raise


def get_zone(db: Session, zone_id: Union[uuid.UUID, str]) -> Optional[Zone]:
    """Get zone by primary key UUID or zone code."""
    uid = parse_uuid(zone_id)
    if uid:
        stmt = select(Zone).where(Zone.id == uid)
        result = db.scalars(stmt).first()
        if result:
            return result
    # Fallback lookup by zone code
    stmt = select(Zone).where(Zone.code == str(zone_id))
    return db.scalars(stmt).first()


def list_zones(db: Session, skip: int = 0, limit: int = 100) -> List[Zone]:
    """List operational zones with pagination."""
    stmt = select(Zone).offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


def update_zone(
    db: Session,
    zone_id: Union[uuid.UUID, str],
    **kwargs: Any,
) -> Optional[Zone]:
    """Update fields on an existing zone."""
    zone = get_zone(db, zone_id)
    if not zone:
        return None

    try:
        for key, value in kwargs.items():
            if hasattr(zone, key) and key not in ("id", "created_at"):
                if key == "geometry" and value is not None:
                    value = geojson_to_geoalchemy(value)
                setattr(zone, key, value)
        db.commit()
        db.refresh(zone)
        return zone
    except Exception:
        db.rollback()
        raise


def resolve_zone_from_telemetry(
    db: Session,
    srt_content: Union[str, bytes, None] = None,
    points: Optional[List[Tuple[float, float]]] = None,
) -> dict:
    """
    Evaluates GPS coordinates against configured surveillance zones.
    Returns structured detection outcome (AUTO_DETECTED, MULTI_ZONE, NO_MATCH, or NO_GPS).
    """
    if points is None:
        points = parse_srt_gps_points(srt_content)

    if not points:
        return {
            "status": "NO_GPS",
            "detected_zone_id": None,
            "detected_zone_code": None,
            "detected_zone_name": None,
            "confidence": None,
            "total_points": 0,
            "matched_points": 0,
            "breakdown": [],
            "message": "GPS telemetry unavailable — select zone manually.",
        }

    all_zones = list_zones(db, limit=500)
    zone_polygons = []
    for z in all_zones:
        if z.geometry is not None:
            try:
                geom_dict = geoalchemy_to_geojson(z.geometry)
                if geom_dict:
                    poly = shape(geom_dict)
                    if not poly.is_valid:
                        poly = poly.buffer(0)
                    zone_polygons.append((z, poly))
            except Exception:
                pass

    if not zone_polygons:
        return {
            "status": "NO_MATCH",
            "detected_zone_id": None,
            "detected_zone_code": None,
            "detected_zone_name": None,
            "confidence": None,
            "total_points": len(points),
            "matched_points": 0,
            "breakdown": [],
            "message": "No configured surveillance zone matched the flight path.",
        }

    # Count matching points per zone
    zone_matches = {}
    total_matched_points = 0

    for pt_coords in points:
        pt = Point(pt_coords[0], pt_coords[1])  # (lng, lat)
        matched_for_point = False
        for z, poly in zone_polygons:
            if poly.covers(pt) or poly.contains(pt):
                if z.id not in zone_matches:
                    zone_matches[z.id] = {"zone": z, "count": 0}
                zone_matches[z.id]["count"] += 1
                matched_for_point = True
        if matched_for_point:
            total_matched_points += 1

    if not zone_matches:
        return {
            "status": "NO_MATCH",
            "detected_zone_id": None,
            "detected_zone_code": None,
            "detected_zone_name": None,
            "confidence": None,
            "total_points": len(points),
            "matched_points": 0,
            "breakdown": [],
            "message": "No configured surveillance zone matched the flight path.",
        }

    # Sort matched zones by point count descending
    sorted_matches = sorted(
        zone_matches.values(),
        key=lambda x: x["count"],
        reverse=True,
    )

    breakdown = [
        {
            "zone_id": str(item["zone"].id),
            "zone_code": item["zone"].code,
            "zone_name": item["zone"].name,
            "point_count": item["count"],
            "percentage": round(item["count"] / len(points), 2),
        }
        for item in sorted_matches
    ]

    dominant = sorted_matches[0]
    dominant_zone = dominant["zone"]
    dominant_count = dominant["count"]
    confidence = round(dominant_count / len(points), 2)

    if len(sorted_matches) == 1 or dominant_count == total_matched_points:
        return {
            "status": "AUTO_DETECTED",
            "detected_zone_id": str(dominant_zone.id),
            "detected_zone_code": dominant_zone.code,
            "detected_zone_name": dominant_zone.name,
            "confidence": confidence,
            "total_points": len(points),
            "matched_points": total_matched_points,
            "breakdown": breakdown,
            "message": "Zone automatically detected from SRT telemetry",
        }
    else:
        dom_pct = int((dominant_count / total_matched_points) * 100)
        return {
            "status": "MULTI_ZONE",
            "detected_zone_id": str(dominant_zone.id),
            "detected_zone_code": dominant_zone.code,
            "detected_zone_name": dominant_zone.name,
            "confidence": confidence,
            "total_points": len(points),
            "matched_points": total_matched_points,
            "breakdown": breakdown,
            "message": f"Flight path spans multiple zones ({dominant_zone.code} dominant: {dom_pct}% of matched telemetry). Please confirm or select manually.",
        }

