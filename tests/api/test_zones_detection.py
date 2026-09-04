"""
tests/api/test_zones_detection.py
Backend unit and integration tests for SRT-based surveillance zone detection.
"""

import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.repositories.zones import create_zone, resolve_zone_from_telemetry
from src.core.spatial import parse_srt_gps_points


def test_parse_srt_gps_points():
    """Test SRT parsing with modern DJI bracket formats, legacy format, and invalid lines."""
    modern_srt = """1
00:00:01,000 --> 00:00:02,000
[iso : 100] [shutter : 1/120.0] [latitude: 12.845200] [longitude: 77.663100] [rel_alt: 15.000]

2
00:00:02,000 --> 00:00:03,000
[latitude: 12.845300] [longitude: 77.663200]
"""
    pts = parse_srt_gps_points(modern_srt)
    assert len(pts) == 2
    # Verify coordinate order is [longitude, latitude]
    assert pts[0] == (77.663100, 12.845200)
    assert pts[1] == (77.663200, 12.845300)

    legacy_srt = """1
00:00:01,000 --> 00:00:02,000
GPS (12.8385, 77.6745, 45)
"""
    legacy_pts = parse_srt_gps_points(legacy_srt)
    assert len(legacy_pts) == 1
    assert legacy_pts[0] == (77.6745, 12.8385)

    invalid_srt = "Not a valid SRT format\nNo GPS lines here"
    assert parse_srt_gps_points(invalid_srt) == []
    assert parse_srt_gps_points(None) == []


def test_resolve_zone_point_inside_zone(db_session: Session):
    """1. GPS point inside zone -> returns AUTO_DETECTED with correct zone."""
    zone_payload = {
        "code": "TEST-Z-DETECT-1",
        "name": "Hosur Road Arterial Zone",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.660, 12.840],
                [77.670, 12.840],
                [77.670, 12.850],
                [77.660, 12.850],
                [77.660, 12.840],
            ]],
        },
    }
    zone = create_zone(db_session, **zone_payload)

    # Point at [77.665, 12.845] is clearly inside
    srt_content = """1
00:00:01,000 --> 00:00:02,000
[latitude: 12.845000] [longitude: 77.665000]
"""
    result = resolve_zone_from_telemetry(db_session, srt_content=srt_content)
    assert result["status"] == "AUTO_DETECTED"
    assert result["detected_zone_code"] == "TEST-Z-DETECT-1"
    assert result["detected_zone_name"] == "Hosur Road Arterial Zone"
    assert result["confidence"] == 1.0
    assert result["matched_points"] == 1
    assert result["total_points"] == 1


def test_resolve_zone_point_outside_all_zones(db_session: Session):
    """2. GPS point outside all zones -> returns NO_MATCH."""
    zone_payload = {
        "code": "TEST-Z-DETECT-2",
        "name": "Phase 2 Zone",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.670, 12.830],
                [77.680, 12.830],
                [77.680, 12.840],
                [77.670, 12.840],
                [77.670, 12.830],
            ]],
        },
    }
    create_zone(db_session, **zone_payload)

    # Point at [77.100, 28.500] (Delhi) is far outside
    srt_content = """1
00:00:01,000 --> 00:00:02,000
[latitude: 28.500000] [longitude: 77.100000]
"""
    result = resolve_zone_from_telemetry(db_session, srt_content=srt_content)
    assert result["status"] == "NO_MATCH"
    assert result["detected_zone_id"] is None
    assert result["matched_points"] == 0
    assert result["total_points"] == 1


def test_resolve_zone_multi_zone_dominant_distribution(db_session: Session):
    """3. Multiple GPS points spanning two zones -> returns MULTI_ZONE with dominant zone."""
    zone_a = create_zone(
        db_session,
        code="TEST-Z-A",
        name="Zone Alpha",
        geometry={
            "type": "Polygon",
            "coordinates": [[
                [77.600, 12.800],
                [77.610, 12.800],
                [77.610, 12.810],
                [77.600, 12.810],
                [77.600, 12.800],
            ]],
        },
    )

    zone_b = create_zone(
        db_session,
        code="TEST-Z-B",
        name="Zone Beta",
        geometry={
            "type": "Polygon",
            "coordinates": [[
                [77.610, 12.800],
                [77.620, 12.800],
                [77.620, 12.810],
                [77.610, 12.810],
                [77.610, 12.800],
            ]],
        },
    )

    # 3 points in Zone A, 1 point in Zone B
    srt_content = """1
00:00:01,000 --> 00:00:02,000
[latitude: 12.805000] [longitude: 77.605000]

2
00:00:02,000 --> 00:00:03,000
[latitude: 12.806000] [longitude: 77.606000]

3
00:00:03,000 --> 00:00:04,000
[latitude: 12.807000] [longitude: 77.607000]

4
00:00:04,000 --> 00:00:05,000
[latitude: 12.805000] [longitude: 77.615000]
"""
    result = resolve_zone_from_telemetry(db_session, srt_content=srt_content)
    assert result["status"] == "MULTI_ZONE"
    assert result["detected_zone_code"] == "TEST-Z-A"
    assert result["total_points"] == 4
    assert result["matched_points"] == 4
    assert len(result["breakdown"]) == 2
    assert result["breakdown"][0]["zone_code"] == "TEST-Z-A"
    assert result["breakdown"][0]["point_count"] == 3
    assert result["breakdown"][1]["zone_code"] == "TEST-Z-B"
    assert result["breakdown"][1]["point_count"] == 1


def test_resolve_zone_malformed_and_missing_gps(db_session: Session):
    """4 & 5. Malformed SRT and missing GPS coordinates return NO_GPS gracefully without crashing."""
    malformed_srt = "Random plain text with no subtitle blocks or timestamps"
    result_malformed = resolve_zone_from_telemetry(db_session, srt_content=malformed_srt)
    assert result_malformed["status"] == "NO_GPS"
    assert result_malformed["total_points"] == 0
    assert result_malformed["message"] == "GPS telemetry unavailable — select zone manually."

    result_empty = resolve_zone_from_telemetry(db_session, srt_content="")
    assert result_empty["status"] == "NO_GPS"
    assert result_empty["total_points"] == 0

    result_none = resolve_zone_from_telemetry(db_session, srt_content=None)
    assert result_none["status"] == "NO_GPS"


def test_detect_zone_api_endpoint(client: TestClient):
    """Test POST /api/v1/zones/detect API endpoint via multipart file and form text."""
    # Create zone first
    zone_payload = {
        "code": "API-Z-DETECT",
        "name": "API Detection Zone",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.650, 12.850],
                [77.660, 12.850],
                [77.660, 12.860],
                [77.650, 12.860],
                [77.650, 12.850],
            ]],
        },
    }
    z_res = client.post("/api/v1/zones/", json=zone_payload)
    assert z_res.status_code == 201

    srt_data = """1
00:00:01,000 --> 00:00:02,000
[latitude: 12.855000] [longitude: 77.655000]
"""
    # Test via file upload
    files = {"file": ("flight.srt", io.BytesIO(srt_data.encode("utf-8")), "text/plain")}
    resp = client.post("/api/v1/zones/detect", files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "AUTO_DETECTED"
    assert data["detected_zone_code"] == "API-Z-DETECT"

    # Test via raw srt_text form
    form_resp = client.post("/api/v1/zones/detect", data={"srt_text": srt_data})
    assert form_resp.status_code == 200
    assert form_resp.json()["status"] == "AUTO_DETECTED"
    assert form_resp.json()["detected_zone_code"] == "API-Z-DETECT"
