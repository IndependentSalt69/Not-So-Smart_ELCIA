# SECTION 4: BACKEND ANALYTICS CONTRACT

## 1. Objective
Update the backend analytics data contract and repository aggregation queries to include `OPEN_MANHOLE` across all incident trend reporting endpoints (`/api/v1/analytics/trends`), ensuring seamless 5-class incident tracking across the CivicPulse backend.

---

## 2. Files Inspected
- `src/schemas/analytics.py` (Pydantic schema definitions: `AnalyticsTrendItem`, `AnalyticsSummaryResponse`, `ZoneAnalyticsResponse`)
- `src/repositories/analytics.py` (SQLAlchemy repository functions: `get_analytics_trends`, `get_analytics_summary`, `get_analytics_zones`)
- `tests/api/test_analytics.py` (Existing analytics unit and integration tests)
- `docs/CURRENT_5CLASS_MIGRATION_AUDIT.md` (Baseline audit of analytics contracts)

---

## 3. Exact Files Modified
1. `src/schemas/analytics.py`
2. `src/repositories/analytics.py`
3. `tests/api/test_analytics.py`

---

## 4. Existing Analytics Aggregation Behavior
Prior to Section 4, `src/schemas/analytics.py` and `src/repositories/analytics.py` only supported 4 incident classes in daily trend time-series aggregation:
- `waterlogging`
- `potholes`
- `drainage_overflow`
- `damaged_footpath`

The SQL aggregation statement in `get_analytics_trends` queried only these 4 types using conditional `case()` statements, and `AnalyticsTrendItem` had no `open_manhole` field.

---

## 5. `OPEN_MANHOLE` Changes
- Added `IncidentType.OPEN_MANHOLE` condition to SQL `case()` aggregation in `src/repositories/analytics.py`.
- Added `"open_manhole"` key to the dictionary extraction and assembly loop.
- Added `open_manhole: int = Field(default=0, ge=0)` to `AnalyticsTrendItem` in `src/schemas/analytics.py`.
- Verified that all 5 hazard categories are present:
  1. `waterlogging`
  2. `potholes`
  3. `drainage_overflow`
  4. `damaged_footpath`
  5. `open_manhole`

---

## 6. Schema Changes (`src/schemas/analytics.py`)
```python
class AnalyticsTrendItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: str = Field(..., description="Calendar date string YYYY-MM-DD")
    waterlogging: int = Field(default=0, ge=0, description="Count of waterlogging incidents created on date")
    potholes: int = Field(default=0, ge=0, description="Count of pothole incidents created on date")
    drainage_overflow: int = Field(default=0, ge=0, description="Count of drainage overflow incidents created on date")
    damaged_footpath: int = Field(default=0, ge=0, description="Count of damaged footpath incidents created on date")
    open_manhole: int = Field(default=0, ge=0, description="Count of open manhole incidents created on date")
    rainfall_mm: Optional[float] = Field(
        None,
        description="Observed rainfall in mm. Currently null as weather data is not stored in backend schema.",
    )
```

---

## 7. Repository/Query Changes (`src/repositories/analytics.py`)
In `get_analytics_trends`:
```python
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
```
And mapped into `AnalyticsTrendItem`:
```python
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
```

---

## 8. Test Changes (`tests/api/test_analytics.py`)
- Added `assert hasattr(t, "open_manhole")` in `test_repository_direct_functions`.
- Added dedicated test `test_analytics_trends_five_class_aggregation` to verify end-to-end fixture creation and JSON aggregation across all 5 classes simultaneously (`waterlogging`, `potholes`, `drainage_overflow`, `damaged_footpath`, `open_manhole`).

---

## 9. Validation Commands
```powershell
# 1. Schema serialization verification
.\.venv\Scripts\python -c "from src.schemas.analytics import AnalyticsTrendItem; item = AnalyticsTrendItem(date='2026-09-04', waterlogging=1, potholes=2, drainage_overflow=3, damaged_footpath=4, open_manhole=5); data = item.model_dump(); assert data['open_manhole'] == 5; print('Schema verification passed!')"

# 2. Targeted analytics tests
.\.venv\Scripts\pytest -q tests/api/test_analytics.py

# 3. Full test suite regression
.\.venv\Scripts\pytest -q
```

---

## 10. Validation Results
- **Schema Serialization**: Verified serialization of all 5 class counts with 0 errors.
- **Analytics Tests**: 7 passed in 0.14s (100%).
- **Full Backend Test Suite**: 65 passed in 9.67s (0 failures).

---

## 11. Git Status
```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/db/models/enums.py
	modified:   src/repositories/analytics.py
	modified:   src/schemas/analytics.py
	modified:   src/services/ml_ingestion_service.py
	modified:   tests/api/test_analytics.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	alembic/versions/20260904_003_add_open_manhole.py
	docs/CURRENT_5CLASS_MIGRATION_AUDIT.md
	docs/SECTION_2_DATABASE_MIGRATION.md
	docs/SECTION_3_BACKEND_INGESTION.md
	docs/SECTION_4_BACKEND_ANALYTICS.md

no changes added to commit (use "git add" and/or "git commit -a")
```

---

## 12. Exact Changed-File Summary
- `src/schemas/analytics.py`: Added `open_manhole` field to `AnalyticsTrendItem`.
- `src/repositories/analytics.py`: Added `IncidentType.OPEN_MANHOLE` SQL `case()` aggregation and response mapping.
- `tests/api/test_analytics.py`: Added 5-class trend aggregation test.
- `docs/SECTION_4_BACKEND_ANALYTICS.md`: Created Section 4 log.

---

## 13. Confirmation of Section Boundaries
- Section 4 is complete.
- **Section 5 (Production Weights Promotion) was NOT started.**
- No modifications were made to `models/production/best.pt`, `configs/config.yaml`, `src/detection/runner.py`, or frontend files.

---

## 14. Warnings, Limitations & Follow-Up
- Production ML model weights at `models/production/best.pt` remain 4-class until promoted in Section 5.
- Frontend TypeScript types and dashboard charts still expect 4-class fields until updated in Section 7 & 8.
