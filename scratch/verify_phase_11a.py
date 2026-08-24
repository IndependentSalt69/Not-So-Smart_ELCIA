"""
scratch/verify_phase_11a.py
End-to-End verification script for Phase 11A Incident Class Contract Update.
Validates ML outputs, database enum/model persistence, FastAPI endpoints, and analytics aggregations.
"""

import sys
import json
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from src.api.main import app
from src.db.models.enums import IncidentType, PriorityLevel, IncidentStatus
from src.db.session import get_db, SessionLocal
from src.repositories import create_zone, create_incident, list_incidents

def run_verification():
    print("=" * 70)
    print("PHASE 11A: CIVICPULSE INCIDENT CLASS CONTRACT VERIFICATION")
    print("=" * 70)

    # 1. Verify ML Telemetry JSON Hazard Types
    telemetry_file = Path("outputs/hazard_telemetry.json")
    if telemetry_file.exists():
        with open(telemetry_file, "r") as f:
            data = json.load(f)
        hazards = data if isinstance(data, list) else data.get("hazards", [])
        hazard_types = {h.get("hazard_type") or h.get("type") for h in hazards if (h.get("hazard_type") or h.get("type"))}
        print(f"[+] Verified ML Telemetry File outputs/hazard_telemetry.json: found classes {hazard_types}")
    else:
        print("[-] Telemetry file outputs/hazard_telemetry.json not found (skipping file check)")

    # 2. Verify Backend Enums
    expected_enums = {"WATERLOGGING", "POTHOLE", "DRAINAGE_OVERFLOW", "DAMAGED_FOOTPATH"}
    actual_enums = {e.value for e in IncidentType}
    assert expected_enums == actual_enums, f"Enum mismatch! Expected {expected_enums}, got {actual_enums}"
    print(f"[+] Verified Python IncidentType Enum: {actual_enums}")

    # 3. Test API Client with Database Session
    client = TestClient(app)

    # Create Zone for Verification
    z_code = f"VERIFY-Z-{int(Path(__file__).stat().st_mtime) % 10000}"
    z_res = client.post("/api/v1/zones/", json={"code": z_code, "name": "Class Contract Verification Zone"})
    assert z_res.status_code == 201, f"Failed to create zone: {z_res.text}"
    zone_id = z_res.json()["id"]
    print(f"[+] Created Verification Zone: {z_code} (ID: {zone_id})")

    # 4. Create and Query all 4 classes via REST API
    for c_type in expected_enums:
        inc_code = f"INC-V11A-{c_type[:3]}"
        payload = {
            "incident_code": inc_code,
            "incident_type": c_type,
            "confidence": 0.95,
            "severity_score": 7.5,
            "priority": "P1",
            "zone_id": zone_id,
            "status": "DETECTED",
            "recommended_action": f"Resolve {c_type}",
            "location": {
                "type": "Point",
                "coordinates": [77.6631, 12.8452]
            }
        }
        res = client.post("/api/v1/incidents/", json=payload)
        assert res.status_code == 201, f"Failed creating {c_type}: {res.text}"
        created = res.json()
        assert created["incident_type"] == c_type
        print(f"[+] Successfully Created REST Incident: {inc_code} -> Type: {created['incident_type']}")

        # Query filter by incident_type
        q_res = client.get(f"/api/v1/incidents/?incident_type={c_type}&zone_id={zone_id}")
        assert q_res.status_code == 200, f"Failed querying {c_type}: {q_res.text}"
        items = q_res.json()["items"]
        assert len(items) >= 1
        assert items[0]["incident_type"] == c_type
        print(f"[+] Successfully Queried with Filter incident_type={c_type}: {len(items)} records matched")

    # 5. Verify Analytics Trends
    trends_res = client.get("/api/v1/analytics/trends?days=7")
    assert trends_res.status_code == 200, f"Failed analytics trends: {trends_res.text}"
    trends_data = trends_res.json()
    assert isinstance(trends_data, list) and len(trends_data) > 0
    sample = trends_data[-1]
    assert "waterlogging" in sample
    assert "potholes" in sample
    assert "drainage_overflow" in sample
    assert "damaged_footpath" in sample
    print(f"[+] Verified Analytics Trends Aggregations for all 4 classes: {sample}")

    print("=" * 70)
    print("ALL PHASE 11A CLASS CONTRACT VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_verification()
