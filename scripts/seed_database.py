"""
scripts/seed_database.py
Deterministic and idempotent development seed script for CivicPulse database.
Populates realistic DEMO data for Electronics City operational zones, users,
incidents, detections, evidence, assignments, status history, and inspections.
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.db.session import SessionLocal, engine
from src.db.base import Base
from src.db.models.enums import (
    UserRole,
    IncidentType,
    PriorityLevel,
    IncidentStatus,
    EvidenceType,
    InspectionResult,
)
from src.repositories import (
    create_zone,
    get_zone,
    create_user,
    get_user,
    create_incident,
    get_incident,
    create_detection,
    list_incident_detections,
    create_evidence,
    list_incident_evidence,
    create_assignment,
    get_incident_assignments,
    create_inspection,
    list_incident_inspections,
    create_status_history,
    list_incident_status_history,
)


def seed_database():
    """
    Seed database with deterministic demo data.
    Idempotent: Safe to run repeatedly without creating duplicate entries.
    """
    print("Initializing database tables if not created...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("\n--- Seeding Operational Zones ---")
        zones_data = [
            {
                "code": "EC-01",
                "name": "Phase 1 - West (Hosur Road Corridor) [DEMO DATA]",
                "description": "DEMO DATA: Primary technology corridor along Hosur Road arterial underpass.",
                "geometry": "POLYGON((77.670 12.835, 77.680 12.835, 77.680 12.845, 77.670 12.845, 77.670 12.835))",
            },
            {
                "code": "EC-02",
                "name": "Phase 1 - East (Neeladri Road) [DEMO DATA]",
                "description": "DEMO DATA: High-density commercial and residential junction along Neeladri Road.",
                "geometry": "POLYGON((77.680 12.845, 77.690 12.845, 77.690 12.855, 77.680 12.855, 77.680 12.845))",
            },
            {
                "code": "EC-03",
                "name": "Phase 2 - North (Velankani Drive) [DEMO DATA]",
                "description": "DEMO DATA: Tech park entry corridor and culvert catchment area near Velankani Drive.",
                "geometry": "POLYGON((77.685 12.855, 77.695 12.855, 77.695 12.865, 77.685 12.865, 77.685 12.855))",
            },
            {
                "code": "EC-04",
                "name": "Main Junction Corridor (EPIC Area) [DEMO DATA]",
                "description": "DEMO DATA: Central ELCIA municipal hub and traffic management intersection.",
                "geometry": "POLYGON((77.675 12.840, 77.688 12.840, 77.688 12.850, 77.675 12.850, 77.675 12.840))",
            },
        ]

        seeded_zones = {}
        for zdef in zones_data:
            existing = get_zone(db, zdef["code"])
            if existing:
                print(f"  [SKIP] Zone '{zdef['code']}' already exists.")
                seeded_zones[zdef["code"]] = existing
            else:
                zone = create_zone(
                    db=db,
                    code=zdef["code"],
                    name=zdef["name"],
                    description=zdef["description"],
                    geometry=zdef["geometry"],
                )
                print(f"  [CREATED] Zone '{zone.code}' ({zone.name})")
                seeded_zones[zdef["code"]] = zone

        print("\n--- Seeding Demo System Users ---")
        users_data = [
            {
                "name": "Admin User",
                "email": "admin@elcia.in",
                "role": UserRole.ADMIN,
                "is_active": True,
            },
            {
                "name": "Control Room Operator",
                "email": "operator@elcia.in",
                "role": UserRole.OPERATOR,
                "is_active": True,
            },
            {
                "name": "Field Inspector Alpha",
                "email": "inspector@elcia.in",
                "role": UserRole.INSPECTOR,
                "is_active": True,
            },
        ]

        seeded_users = {}
        for udef in users_data:
            existing = get_user(db, udef["email"])
            if existing:
                print(f"  [SKIP] User '{udef['email']}' already exists.")
                seeded_users[udef["email"]] = existing
            else:
                user = create_user(
                    db=db,
                    name=udef["name"],
                    email=udef["email"],
                    role=udef["role"],
                    is_active=udef["is_active"],
                )
                print(f"  [CREATED] User '{user.email}' ({user.role})")
                seeded_users[udef["email"]] = user

        print("\n--- Seeding Demo Incidents & Sub-resources ---")
        now = datetime.now(timezone.utc)

        incidents_data = [
            {
                "incident_code": "INC-DEMO-001",
                "incident_type": IncidentType.WATERLOGGING,
                "confidence": 0.95,
                "severity_score": 8.5,
                "priority": PriorityLevel.P1,
                "zone_code": "EC-01",
                "status": IncidentStatus.IN_PROGRESS,
                "started_at": now - timedelta(hours=4),
                "recommended_action": "DEMO: Deploy 15HP mobile dewatering pump to clear Hosur Road underpass.",
                "location": "POINT(77.6750 12.8420)",
                "detections": [
                    {
                        "detection_type": "waterlogging",
                        "confidence": 0.95,
                        "frame_number": 120,
                        "detected_at": now - timedelta(hours=4),
                        "location": "POINT(77.6750 12.8420)",
                        "detection_metadata": {"is_demo": True, "bbox": [100, 200, 450, 600], "water_depth_cm_est": 25.0},
                    },
                    {
                        "detection_type": "waterlogging",
                        "confidence": 0.96,
                        "frame_number": 180,
                        "detected_at": now - timedelta(hours=3, minutes=30),
                        "location": "POINT(77.6751 12.8421)",
                        "detection_metadata": {"is_demo": True, "bbox": [110, 205, 460, 610], "water_depth_cm_est": 28.5},
                    },
                ],
                "evidence": [
                    {
                        "evidence_type": EvidenceType.IMAGE,
                        "file_path": "outputs/evidence/demo_waterlogging_ec01.jpg",
                        "description": "DEMO: Underpass waterlogging snapshot",
                        "is_primary": True,
                    },
                    {
                        "evidence_type": EvidenceType.VIDEO,
                        "file_path": "outputs/evidence/demo_waterlogging_ec01.mp4",
                        "description": "DEMO: Traffic slowdown CCTV recording clip",
                        "is_primary": False,
                    },
                ],
                "assignments": [
                    {
                        "assigned_to_email": "operator@elcia.in",
                        "assigned_team": "Monsoon Quick Response Team 1",
                        "notes": "DEMO: High priority underpass dewatering dispatch.",
                    }
                ],
                "status_history": [
                    {
                        "old_status": None,
                        "new_status": IncidentStatus.DETECTED,
                        "changed_by_email": None,
                        "comment": "DEMO: System auto-detected waterlogging event.",
                        "changed_at": now - timedelta(hours=4),
                    },
                    {
                        "old_status": IncidentStatus.DETECTED,
                        "new_status": IncidentStatus.VERIFIED,
                        "changed_by_email": "operator@elcia.in",
                        "comment": "DEMO: Control room operator verified CCTV feed.",
                        "changed_at": now - timedelta(hours=3, minutes=45),
                    },
                    {
                        "old_status": IncidentStatus.VERIFIED,
                        "new_status": IncidentStatus.ASSIGNED,
                        "changed_by_email": "operator@elcia.in",
                        "comment": "DEMO: Dispatched Response Team 1.",
                        "changed_at": now - timedelta(hours=3, minutes=30),
                    },
                    {
                        "old_status": IncidentStatus.ASSIGNED,
                        "new_status": IncidentStatus.IN_PROGRESS,
                        "changed_by_email": "operator@elcia.in",
                        "comment": "DEMO: Dewatering pump active on site.",
                        "changed_at": now - timedelta(hours=2),
                    },
                ],
                "inspections": [],
            },
            {
                "incident_code": "INC-DEMO-002",
                "incident_type": IncidentType.POTHOLE,
                "confidence": 0.88,
                "severity_score": 6.2,
                "priority": PriorityLevel.P2,
                "zone_code": "EC-02",
                "status": IncidentStatus.VERIFIED,
                "started_at": now - timedelta(hours=12),
                "recommended_action": "DEMO: Apply cold mix asphalt patch and place safety hazard cones.",
                "location": "POINT(77.6820 12.8510)",
                "detections": [
                    {
                        "detection_type": "pothole",
                        "confidence": 0.88,
                        "frame_number": 45,
                        "detected_at": now - timedelta(hours=12),
                        "location": "POINT(77.6820 12.8510)",
                        "detection_metadata": {"is_demo": True, "bbox": [200, 300, 320, 420], "estimated_diameter_cm": 45.0},
                    }
                ],
                "evidence": [
                    {
                        "evidence_type": EvidenceType.IMAGE,
                        "file_path": "outputs/evidence/demo_pothole_ec02.jpg",
                        "description": "DEMO: Neeladri road pothole visual evidence",
                        "is_primary": True,
                    }
                ],
                "assignments": [],
                "status_history": [
                    {
                        "old_status": None,
                        "new_status": IncidentStatus.DETECTED,
                        "changed_by_email": None,
                        "comment": "DEMO: Automatic detection logged.",
                        "changed_at": now - timedelta(hours=12),
                    },
                    {
                        "old_status": IncidentStatus.DETECTED,
                        "new_status": IncidentStatus.VERIFIED,
                        "changed_by_email": "inspector@elcia.in",
                        "comment": "DEMO: Field inspector verified pothole dimension.",
                        "changed_at": now - timedelta(hours=10),
                    },
                ],
                "inspections": [],
            },
            {
                "incident_code": "INC-DEMO-003",
                "incident_type": IncidentType.DRAINAGE_OVERFLOW,
                "confidence": 0.92,
                "severity_score": 9.1,
                "priority": PriorityLevel.P1,
                "zone_code": "EC-03",
                "status": IncidentStatus.ASSIGNED,
                "started_at": now - timedelta(hours=2),
                "recommended_action": "DEMO: Deploy excavator to clear heavy silt and trash accumulation blocking culvert exit.",
                "location": "POINT(77.6910 12.8630)",
                "detections": [
                    {
                        "detection_type": "drainage_overflow",
                        "confidence": 0.92,
                        "frame_number": 88,
                        "detected_at": now - timedelta(hours=2),
                        "location": "POINT(77.6910 12.8630)",
                        "detection_metadata": {"is_demo": True, "bbox": [150, 180, 480, 520], "overflow_rate_est": "HIGH"},
                    }
                ],
                "evidence": [
                    {
                        "evidence_type": EvidenceType.IMAGE,
                        "file_path": "outputs/evidence/demo_drainage_ec03.jpg",
                        "description": "DEMO: Drainage culvert overflow evidence",
                        "is_primary": True,
                    }
                ],
                "assignments": [
                    {
                        "assigned_to_email": "operator@elcia.in",
                        "assigned_team": "Heavy Drainage Equipment Clearance Crew B",
                        "notes": "DEMO: Immediate silt removal dispatch.",
                    }
                ],
                "status_history": [
                    {
                        "old_status": None,
                        "new_status": IncidentStatus.DETECTED,
                        "changed_by_email": None,
                        "comment": "DEMO: System auto-detected overflow.",
                        "changed_at": now - timedelta(hours=2),
                    },
                    {
                        "old_status": IncidentStatus.DETECTED,
                        "new_status": IncidentStatus.ASSIGNED,
                        "changed_by_email": "admin@elcia.in",
                        "comment": "DEMO: Emergency clearance assigned.",
                        "changed_at": now - timedelta(hours=1, minutes=30),
                    },
                ],
                "inspections": [],
            },
            {
                "incident_code": "INC-DEMO-004",
                "incident_type": IncidentType.WATERLOGGING,
                "confidence": 0.82,
                "severity_score": 4.5,
                "priority": PriorityLevel.P3,
                "zone_code": "EC-04",
                "status": IncidentStatus.CLOSED,
                "started_at": now - timedelta(days=1, hours=6),
                "ended_at": now - timedelta(hours=5),
                "duration_seconds": 75600.0,
                "recommended_action": "DEMO: Cleared water accumulation verified by field inspector.",
                "location": "POINT(77.6850 12.8460)",
                "detections": [
                    {
                        "detection_type": "waterlogging",
                        "confidence": 0.82,
                        "frame_number": 15,
                        "detected_at": now - timedelta(days=1, hours=6),
                        "location": "POINT(77.6850 12.8460)",
                        "detection_metadata": {"is_demo": True, "bbox": [50, 100, 200, 300], "water_depth_cm_est": 8.0},
                    }
                ],
                "evidence": [
                    {
                        "evidence_type": EvidenceType.IMAGE,
                        "file_path": "outputs/evidence/demo_waterlogging_ec04.jpg",
                        "description": "DEMO: Minor puddle at EPIC junction",
                        "is_primary": True,
                    }
                ],
                "assignments": [],
                "status_history": [
                    {
                        "old_status": None,
                        "new_status": IncidentStatus.DETECTED,
                        "changed_by_email": None,
                        "comment": "DEMO: Detection logged.",
                        "changed_at": now - timedelta(days=1, hours=6),
                    },
                    {
                        "old_status": IncidentStatus.DETECTED,
                        "new_status": IncidentStatus.CLOSED,
                        "changed_by_email": "inspector@elcia.in",
                        "comment": "DEMO: Resolved naturally via drainage flow.",
                        "changed_at": now - timedelta(hours=5),
                    },
                ],
                "inspections": [
                    {
                        "inspector_email": "inspector@elcia.in",
                        "result": InspectionResult.RESOLVED,
                        "notes": "DEMO: Site inspected. Road clear and dry.",
                        "location": "POINT(77.6850 12.8460)",
                    }
                ],
            },
        ]

        for idef in incidents_data:
            existing = get_incident(db, idef["incident_code"])
            if existing:
                print(f"  [SKIP] Incident '{idef['incident_code']}' already exists.")
                incident = existing
            else:
                zone = seeded_zones[idef["zone_code"]]
                incident = create_incident(
                    db=db,
                    incident_code=idef["incident_code"],
                    incident_type=idef["incident_type"],
                    confidence=idef["confidence"],
                    severity_score=idef["severity_score"],
                    priority=idef["priority"],
                    zone_id=zone.id,
                    status=idef["status"],
                    started_at=idef.get("started_at"),
                    ended_at=idef.get("ended_at"),
                    duration_seconds=idef.get("duration_seconds"),
                    recommended_action=idef.get("recommended_action"),
                    location=idef.get("location"),
                )
                print(f"  [CREATED] Incident '{incident.incident_code}' ({incident.incident_type.value})")

            # Seed Detections
            if not list_incident_detections(db, incident.id):
                for det in idef.get("detections", []):
                    create_detection(
                        db=db,
                        incident_id=incident.id,
                        detection_type=det["detection_type"],
                        confidence=det["confidence"],
                        frame_number=det.get("frame_number"),
                        detected_at=det.get("detected_at"),
                        location=det.get("location"),
                        detection_metadata=det.get("detection_metadata"),
                    )
                print(f"    - Added {len(idef.get('detections', []))} frame detections")

            # Seed Evidence
            if not list_incident_evidence(db, incident.id):
                for ev in idef.get("evidence", []):
                    create_evidence(
                        db=db,
                        incident_id=incident.id,
                        evidence_type=ev["evidence_type"],
                        file_path=ev["file_path"],
                        description=ev.get("description"),
                        is_primary=ev.get("is_primary", False),
                    )
                print(f"    - Added {len(idef.get('evidence', []))} evidence assets")

            # Seed Assignments
            if not get_incident_assignments(db, incident.id):
                for asgn in idef.get("assignments", []):
                    assignee = seeded_users[asgn["assigned_to_email"]]
                    create_assignment(
                        db=db,
                        incident_id=incident.id,
                        assigned_to=assignee.id,
                        assigned_team=asgn.get("assigned_team"),
                        notes=asgn.get("notes"),
                    )
                print(f"    - Added {len(idef.get('assignments', []))} team assignments")

            # Seed Status History
            if not list_incident_status_history(db, incident.id):
                for sh in idef.get("status_history", []):
                    cb_user = seeded_users[sh["changed_by_email"]] if sh.get("changed_by_email") else None
                    create_status_history(
                        db=db,
                        incident_id=incident.id,
                        old_status=sh.get("old_status"),
                        new_status=sh["new_status"],
                        changed_by=cb_user.id if cb_user else None,
                        comment=sh.get("comment"),
                        changed_at=sh.get("changed_at"),
                    )
                print(f"    - Added {len(idef.get('status_history', []))} status history audit entries")

            # Seed Inspections
            if not list_incident_inspections(db, incident.id):
                for insp in idef.get("inspections", []):
                    inspector = seeded_users[insp["inspector_email"]]
                    create_inspection(
                        db=db,
                        incident_id=incident.id,
                        inspector_id=inspector.id,
                        result=insp["result"],
                        notes=insp.get("notes"),
                        location=insp.get("location"),
                    )
                print(f"    - Added {len(idef.get('inspections', []))} field inspection records")

        print("\n[SUCCESS] Database successfully seeded with Electronics City DEMO DATA!")

        print("\n--- Ingesting AI Telemetry Data ---")
        telemetry_file = Path("outputs/hazard_telemetry.json")
        
        if telemetry_file.exists():
            with open(telemetry_file, "r") as f:
                ai_data = json.load(f)

            # Map YOLO string classes to your database Enums
            type_map = {
                "pothole": IncidentType.POTHOLE,
                "waterlogging": IncidentType.WATERLOGGING,
                "drainage_overflow": IncidentType.DRAINAGE_OVERFLOW,
                "damaged_footpath": IncidentType.DAMAGED_FOOTPATH
            }

            for item in ai_data:
                # Create a unique ID for AI incidents
                incident_code = f"INC-AI-{item['hazard_id']}"
                
                existing = get_incident(db, incident_code)
                if existing:
                    print(f"  [SKIP] AI Incident '{incident_code}' already exists.")
                    continue
                
                # Convert AI severity (0-100) to Priority Level
                score = item.get("severity_score", 0)
                priority = PriorityLevel.P3
                if score > 70: 
                    priority = PriorityLevel.P1
                elif score > 40: 
                    priority = PriorityLevel.P2

                # We'll attach these to EC-01 for demo mapping purposes
                zone = seeded_zones.get("EC-01")

                # 1. Create the Incident
                incident = create_incident(
                    db=db,
                    incident_code=incident_code,
                    incident_type=type_map.get(item["class_name"].lower(), IncidentType.POTHOLE),
                    confidence=0.95,
                    severity_score=score / 10.0, # Assuming DB expects 1-10 scale based on your demo data
                    priority=priority,
                    zone_id=zone.id if zone else 1,
                    status=IncidentStatus.DETECTED,
                    started_at=datetime.now(timezone.utc),
                    location=f"POINT({item['longitude']} {item['latitude']})"
                )
                print(f"  [CREATED] AI Incident '{incident.incident_code}' at Lat: {item['latitude']}, Lon: {item['longitude']}")

                # 2. Create the Detection Record
                create_detection(
                    db=db,
                    incident_id=incident.id,
                    detection_type=item["class_name"],
                    confidence=0.95,
                    frame_number=item["frame_logged"],
                    detected_at=datetime.now(timezone.utc),
                    location=f"POINT({item['longitude']} {item['latitude']})",
                    detection_metadata={
                        "timestamp_sec": item["timestamp_sec"], 
                        "mask_pixels": item["mask_pixels"]
                    }
                )

                # 3. Link the Evidence Image
                create_evidence(
                    db=db,
                    incident_id=incident.id,
                    evidence_type=EvidenceType.IMAGE,
                    file_path=f"outputs/evidence/{item['evidence_file']}",
                    description=f"Auto-captured {item['class_name']} by Drone AI",
                    is_primary=True
                )
            print(f"  -> Successfully ingested {len(ai_data)} AI detections into the database.")
        else:
            print("  [SKIP] No hazard_telemetry.json found. Run the video pipeline first!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
