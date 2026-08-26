"""
scratch/verify_phase_11c_real_ingestion.py
Verification script for Phase 11C Real ML Output Database Ingestion.
Tests real job ingestion into PostgreSQL/PostGIS, sub-resource verification, API retrieval, and idempotency.
"""

import sys
import json
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from src.api.main import app
from src.db.session import SessionLocal
from src.services.ml_ingestion_service import ingest_job_results
from src.repositories.incidents import get_incident, list_incidents
from src.repositories.detections import list_incident_detections
from src.repositories.evidence import list_incident_evidence


def main():
    print("[1] Locating real ML pipeline output directory...")
    job_id = "phase11a-test"
    job_dir = Path("outputs/jobs") / job_id
    telemetry_path = job_dir / "hazard_telemetry.json"

    if not telemetry_path.exists():
        print(f"[-] Telemetry path {telemetry_path} not found. Searching for available jobs in outputs/jobs...")
        jobs = list(Path("outputs/jobs").glob("*/hazard_telemetry.json"))
        if not jobs:
            print("[-] No generated jobs found in outputs/jobs.")
            sys.exit(1)
        telemetry_path = jobs[0]
        job_dir = telemetry_path.parent
        job_id = job_dir.name

    print(f"[+] Found real job telemetry: {telemetry_path}")
    with open(telemetry_path, "r") as f:
        telemetry_data = json.load(f)

    total_hazards = len(telemetry_data)
    print(f"[+] Total hazards in telemetry file: {total_hazards}")

    db = SessionLocal()
    try:
        print("\n[2] Executing ingest_job_results() for real job...")
        summary1 = ingest_job_results(db, job_id, job_dir, zone_id="EC-01")
        print(f"[+] Ingestion Summary (Run 1):")
        print(f"    - Incidents Created: {summary1['incidents_created']}")
        print(f"    - Detections Created: {summary1['detections_created']}")
        print(f"    - Evidence Created: {summary1['evidence_created']}")
        print(f"    - Skipped (Duplicates): {summary1['skipped']}")
        print(f"    - Failed: {summary1['failed']}")
        print(f"    - Missing GPS: {summary1['missing_gps']}")

        assert summary1["incidents_created"] + summary1["skipped"] + summary1["failed"] == total_hazards

        print("\n[3] Verifying created database records in PostgreSQL/PostGIS...")
        first_incident_id = summary1["incident_ids"][0] if summary1["incident_ids"] else None
        assert first_incident_id is not None, "No incident IDs returned"

        incident = get_incident(db, first_incident_id)
        assert incident is not None, "Incident not found in DB"
        print(f"[+] Sample Incident verified in DB:")
        print(f"    - Code: {incident.incident_code}")
        print(f"    - Type: {incident.incident_type.value}")
        print(f"    - Severity Score (0-10): {incident.severity_score}")
        print(f"    - Priority: {incident.priority.value}")
        print(f"    - Status: {incident.status.value}")

        # Check severity scale [0, 10]
        assert 0.0 <= incident.severity_score <= 10.0

        # Check Detections
        dets = list_incident_detections(db, incident.id)
        assert len(dets) > 0, "No detection record found for incident"
        print(f"[+] Linked Detections count: {len(dets)}")
        print(f"    - Detection Type: {dets[0].detection_type}")

        # Check Evidence
        evs = list_incident_evidence(db, incident.id)
        assert len(evs) > 0, "No evidence record found for incident"
        print(f"[+] Linked Evidence count: {len(evs)}")
        print(f"    - File Path: {evs[0].file_path}")
        assert Path(evs[0].file_path).exists(), f"Evidence file {evs[0].file_path} does not exist on disk!"

        print("\n[4] Verifying Incident retrieval via GET /api/v1/incidents/...")
        client = TestClient(app)
        api_res = client.get(f"/api/v1/incidents/{incident.id}")
        assert api_res.status_code == 200
        api_data = api_res.json()
        print(f"[+] API Response for Incident {incident.id}:")
        print(f"    - Code: {api_data['incident_code']}")
        print(f"    - Type: {api_data['incident_type']}")
        print(f"    - Location GeoJSON: {api_data['location']}")

        print("\n[5] Executing Duplicate Ingestion Test (Run 2)...")
        summary2 = ingest_job_results(db, job_id, job_dir, zone_id="EC-01")
        print(f"[+] Ingestion Summary (Run 2):")
        print(f"    - Incidents Created: {summary2['incidents_created']}")
        print(f"    - Skipped (Duplicates): {summary2['skipped']}")

        assert summary2["incidents_created"] == 0, "Duplicate ingestion created new incidents!"
        assert summary2["skipped"] == total_hazards, "Duplicate ingestion failed to skip existing hazards!"

        print("\n[SUCCESS] Phase 11C Real ML Ingestion & Idempotency fully verified!")

    finally:
        db.close()


if __name__ == "__main__":
    main()
