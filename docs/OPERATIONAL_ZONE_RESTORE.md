# CivicPulse — Operational Zone Restoration Guide

## Problem Summary
When `zones = 0` in the database, the video ingestion pipeline fails after ML processing with:
```text
ML completed successfully, database ingestion failed:
No operational zone found in database for ingestion.
```
This is because CivicPulse's spatial telemetry resolution requires authoritative operational zone polygons (`EC-01` to `EC-04`) present in the `zones` table to map GPS coordinates to municipal zones.

---

## Authoritative Operational Zone Definitions

The authoritative municipal operational zones are defined as PostGIS `POLYGON` geometries in **SRID 4326** (WGS-84 coordinate reference system):

| Code | Name | Description | Geometry (SRID 4326 WKT) |
|---|---|---|---|
| **EC-01** | Phase 1 - West (Hosur Road Corridor) | Primary technology corridor along Hosur Road arterial underpass. | `POLYGON((77.670 12.835, 77.680 12.835, 77.680 12.845, 77.670 12.845, 77.670 12.835))` |
| **EC-02** | Phase 1 - East (Neeladri Road) | High-density commercial and residential junction along Neeladri Road. | `POLYGON((77.680 12.845, 77.690 12.845, 77.690 12.855, 77.680 12.855, 77.680 12.845))` |
| **EC-03** | Phase 2 - North (Velankani Drive) | Tech park entry corridor and culvert catchment area near Velankani Drive. | `POLYGON((77.685 12.855, 77.695 12.855, 77.695 12.865, 77.685 12.865, 77.685 12.855))` |
| **EC-04** | Main Junction Corridor (EPIC Area) | Central ELCIA municipal hub and traffic management intersection. | `POLYGON((77.675 12.840, 77.688 12.840, 77.688 12.850, 77.675 12.850, 77.675 12.840))` |

**Source of Truth:** Discovered in [`scripts/seed_database.py:57-82`](../scripts/seed_database.py) and mapped via [`src/db/models/zone.py`](../src/db/models/zone.py).

---

## Safety Guarantees
The restoration utility `scripts/restore_operational_zones.py` enforces strict safety invariants:
1. **Never deletes data**: Only inserts rows for missing zones.
2. **Preserves existing zones**: Existing zones are detected and left completely untouched.
3. **Strictly idempotent**: Can be run any number of times without duplicate keys or errors.
4. **Zero side-effects**: Never creates incidents, users, detections, evidence, or inspection records.
5. **Dry Run by default**: Without `--apply`, no database mutations occur.

---

## Usage Instructions

### 1. Dry Run (Preview Mode)
Inspect the current zone status without making any changes:

```bash
python scripts/restore_operational_zones.py
```

Example Output:
```text
=================================================================
 CivicPulse -- Operational Zones Restoration Utility
=================================================================
 Database:  postgres on db.supabase.co
 Target:    4 Authoritative ELCIA Operational Zones (EC-01 to EC-04)
=================================================================

[1/3] Inspecting operational zones in database...

Authoritative Zones Status:
  [MISSING] EC-01 - Phase 1 - West (Hosur Road Corridor)
            Target Geometry: POLYGON((77.670 12.835, 77.680 12.835, 77.680 12.845, 77.670 12.845, 77.670 12.835))
  [MISSING] EC-02 - Phase 1 - East (Neeladri Road)
            Target Geometry: POLYGON((77.680 12.845, 77.690 12.845, 77.690 12.855, 77.680 12.855, 77.680 12.845))
  [MISSING] EC-03 - Phase 2 - North (Velankani Drive)
            Target Geometry: POLYGON((77.685 12.855, 77.695 12.855, 77.695 12.865, 77.685 12.865, 77.685 12.855))
  [MISSING] EC-04 - Main Junction Corridor (EPIC Area)
            Target Geometry: POLYGON((77.675 12.840, 77.688 12.840, 77.688 12.850, 77.675 12.850, 77.675 12.840))

Summary: 0 zones present, 4 zones missing.

-----------------------------------------------------------------
[DRY RUN / PREVIEW ONLY]
No changes were made to the database.
-----------------------------------------------------------------

To insert the missing operational zones, run:
  python scripts/restore_operational_zones.py --apply
```

### 2. Apply Restoration
To insert the missing zones into the PostgreSQL/PostGIS database:

```bash
python scripts/restore_operational_zones.py --apply
```

### 3. Verification Query
After restoration, verify the records via SQL:

```sql
SELECT code, name, ST_AsText(geometry) AS wkt_geom 
FROM zones 
ORDER BY code;
```

Expected result:
```
 code  |                     name                      |                               wkt_geom                               
-------+-----------------------------------------------+----------------------------------------------------------------------
 EC-01 | Phase 1 - West (Hosur Road Corridor)         | POLYGON((77.67 12.835,77.68 12.835,77.68 12.845,77.67 12.845,77.67 12.835))
 EC-02 | Phase 1 - East (Neeladri Road)                | POLYGON((77.68 12.845,77.69 12.845,77.69 12.855,77.68 12.855,77.68 12.845))
 EC-03 | Phase 2 - North (Velankani Drive)             | POLYGON((77.685 12.855,77.695 12.855,77.695 12.865,77.685 12.865,77.685 12.855))
 EC-04 | Main Junction Corridor (EPIC Area)            | POLYGON((77.675 12.84,77.688 12.84,77.688 12.85,77.675 12.85,77.675 12.84))
(4 rows)
```
