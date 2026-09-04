# SECTION 3: BACKEND INGESTION CONTRACT

## 1. Objective
Update the backend ML pipeline ingestion service (`src/services/ml_ingestion_service.py`) to fully support the new `open_manhole` hazard class as part of the CivicPulse 5-class contract migration, while preserving all existing class mappings, recommended action templates, and ingestion logic.

---

## 2. Files Inspected
- `src/services/ml_ingestion_service.py` (Canonical ML class mapping contract `CLASS_MAPPING` and action templates `RECOMMENDED_ACTIONS`)
- `src/db/models/enums.py` (Verified `IncidentType.OPEN_MANHOLE` definition from Section 1)
- `tests/services/test_ml_ingestion.py` (Existing ingestion service unit and integration tests)
- `docs/CURRENT_5CLASS_MIGRATION_AUDIT.md` (Baseline audit of ingestion mappings and fatal validation error points)

---

## 3. Exact Source File Modified
- `src/services/ml_ingestion_service.py`

---

## 4. Previous Ingestion Mappings & Recommended Actions
Prior to Section 3, `src/services/ml_ingestion_service.py` supported only 4 classes:

```python
CLASS_MAPPING: Dict[str, IncidentType] = {
    "waterlogging": IncidentType.WATERLOGGING,
    "pothole": IncidentType.POTHOLE,
    "drainage_overflow": IncidentType.DRAINAGE_OVERFLOW,
    "damaged_footpath": IncidentType.DAMAGED_FOOTPATH,
}

RECOMMENDED_ACTIONS: Dict[IncidentType, str] = {
    IncidentType.WATERLOGGING: "Deploy high-capacity mobile dewatering pump to clear water accumulation.",
    IncidentType.POTHOLE: "Apply cold mix asphalt patch and set up warning cones.",
    IncidentType.DRAINAGE_OVERFLOW: "Deploy excavator to clear culvert silt and trash blockage.",
    IncidentType.DAMAGED_FOOTPATH: "Inspect footpath slab damage and install barrier tape.",
}
```

Any incoming detection with `class_name: "open_manhole"` previously triggered a fatal `ValueError("Unsupported ML hazard class: 'open_manhole'")` at line 147.

---

## 5. `OPEN_MANHOLE` Mapping Added
Added the exact semantic mapping to `CLASS_MAPPING`:
```python
"open_manhole": IncidentType.OPEN_MANHOLE,
```

---

## 6. Recommended Action Added
Added the exact recommended action template to `RECOMMENDED_ACTIONS`:
```python
IncidentType.OPEN_MANHOLE: "Install immediate high-visibility barricade and dispatch sewer maintenance crew to replace manhole lid.",
```

---

## 7. Confirmation of Preserved Mappings & Architecture
- **Preserved Existing Mappings**: `waterlogging`, `pothole`, `drainage_overflow`, and `damaged_footpath` mappings and action strings remain completely unchanged.
- **Preserved Ingestion Architecture**:
  - Normalized severity score calculation (`normalize_severity_score`) unchanged.
  - Priority level mapping (`map_priority_level`) unchanged.
  - Deterministic incident code formatting (`format_incident_code`) unchanged.
  - Idempotency checks, location GeoJSON conversion, database transactions, detection metadata extraction, and evidence file handling remain untouched.
  - No numeric class IDs were introduced or altered in the ingestion layer.

---

## 8. Validation Performed

### A. Python Contract Assertions
Executed programmatic validation in `.venv`:
```python
from src.db.models.enums import IncidentType
from src.services.ml_ingestion_service import CLASS_MAPPING, RECOMMENDED_ACTIONS

assert set(CLASS_MAPPING.keys()) == {
    "waterlogging",
    "pothole",
    "drainage_overflow",
    "damaged_footpath",
    "open_manhole",
}
assert CLASS_MAPPING["open_manhole"] == IncidentType.OPEN_MANHOLE
assert (
    RECOMMENDED_ACTIONS[IncidentType.OPEN_MANHOLE]
    == "Install immediate high-visibility barricade and dispatch sewer maintenance crew to replace manhole lid."
)
```

### B. Ingestion Service Test Suite
Ran targeted pytest test suite:
```powershell
.\.venv\Scripts\pytest -q tests/services/test_ml_ingestion.py
```

### C. Full Test Suite Regression Check
Ran complete backend test suite:
```powershell
.\.venv\Scripts\pytest -q
```

---

## 9. Validation Results
- **Python Ingestion Contract Assertion**: Passed with 0 errors.
- **Ingestion Service Tests (`test_ml_ingestion.py`)**: 10 passed in 1.40s.
- **Full Backend Test Suite**: 64 passed in 9.02s (0 failures).
- **Test Modifications**: No existing tests required modification because existing fixtures (`test_four_class_ingestion_and_spatial_coordinates`) test valid 4-class telemetry ingestion without constraining `CLASS_MAPPING` keys to a length of 4.

---

## 10. Git Status
```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/db/models/enums.py
	modified:   src/services/ml_ingestion_service.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	alembic/versions/20260904_003_add_open_manhole.py
	docs/CURRENT_5CLASS_MIGRATION_AUDIT.md
	docs/SECTION_2_DATABASE_MIGRATION.md
	docs/SECTION_3_BACKEND_INGESTION.md

no changes added to commit (use "git add" and/or "git commit -a")
```

---

## 11. Exact Changed-File Summary
- `src/services/ml_ingestion_service.py`: Modified to include `"open_manhole"` in `CLASS_MAPPING` and `RECOMMENDED_ACTIONS`.
- `docs/SECTION_3_BACKEND_INGESTION.md`: Created Section 3 log.
- Previous Section 1 & 2 files:
  - `src/db/models/enums.py` (Section 1 enum update)
  - `alembic/versions/20260904_003_add_open_manhole.py` (Section 2 Alembic migration)
  - `docs/CURRENT_5CLASS_MIGRATION_AUDIT.md` (Audit baseline)
  - `docs/SECTION_2_DATABASE_MIGRATION.md` (Section 2 log)

---

## 12. Confirmation of Section Boundaries
- Section 3 is complete.
- **Section 4 (Backend Analytics Contract) was NOT started.**
- No changes made to `src/schemas/analytics.py` or `src/repositories/analytics.py`.
- No changes made to ML weights, configs, database contents, or frontend code.

---

## 13. Warnings, Limitations & Follow-Up
- ML production weights at `models/production/best.pt` remain 4-class until promoted in Section 5.
- Analytics endpoints (`src/schemas/analytics.py` and `src/repositories/analytics.py`) still aggregate across 4 classes until updated in Section 4.
