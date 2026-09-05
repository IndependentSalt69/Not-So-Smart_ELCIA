# CivicPulse — P0 Fix: Restore Real YOLO Confidence Through Telemetry

## 1. Executive Summary
- **Issue**: YOLOv8 detection inference produces a dynamic confidence score (`det["confidence"]`), but `video_tracker.py` omitted the `"confidence"` field when constructing hazard `log_entry` dictionaries in `hazard_telemetry.json`. Consequently, `ml_ingestion_service.py` defaulted missing confidence values to a static `0.95` (`item.get("confidence", 0.95)`), causing all ingested incidents to show a fake `95%` confidence on the UI.
- **Resolution**: Restored exact end-to-end data propagation from YOLO detection output through video tracking telemetry, database models (`Incident.confidence` and `Detection.confidence`), API responses, and frontend display (`Math.round(confidence * 100)`).
- **Scope Compliance**: Strictly pipeline/propagation changes. No YOLO model weights, architecture, training scripts, `yolo_segmentation.py` inference code, `SeverityAnalyzer` logic, DPT depth estimation, `configs/config.yaml`, database seed scripts, or frontend UI calculations were altered.

---

## 2. End-to-End Data Pipeline Architecture

```
YOLOv8 Segmentation (det["confidence"] e.g. 0.8742)
                    │
                    ▼
src/detection/video_tracker.py ("confidence": round(float(det["confidence"]), 4))
                    │
                    ▼
outputs/jobs/<job_id>/hazard_telemetry.json ("confidence": 0.8742)
                    │
                    ▼
src/services/ml_ingestion_service.py (strict validation: 0.0 <= conf <= 1.0; no 0.95 default)
                    │
                    ▼
PostgreSQL Database (incidents.confidence = 0.8742, detections.confidence = 0.8742)
                    │
                    ▼
FastAPI Backend (/api/v1/incidents -> confidence: 0.8742)
                    │
                    ▼
React Dashboard Frontend (Math.round(incident.confidence * 100) -> "87%")
```

---

## 3. Files Changed and Exact Modifications

### File 1: `src/detection/video_tracker.py`
- **Location**: Lines 248–262 (Hazard telemetry `log_entry` serialization)
- **Change**: Added `"confidence": round(float(det["confidence"]), 4)` using the already-produced `det["confidence"]`.

```python
# Before
log_entry = {
    "hazard_id": track_id,
    "frame_logged": frame_idx,
    "timestamp_sec": round(current_time_sec, 2),
    "latitude": gps_loc["lat"],
    "longitude": gps_loc["lon"],
    "class_name": det["class_name"],
    "risk_level": metrics["risk_level"],
    "severity_score": metrics["severity_score"],
    "relative_depth_drop": metrics["relative_depth"],
    "area_coverage_pct": metrics["area_percentage"],
    "mask_pixels": area,
    "evidence_file": evidence_filename
}

# After
log_entry = {
    "hazard_id": track_id,
    "frame_logged": frame_idx,
    "timestamp_sec": round(current_time_sec, 2),
    "latitude": gps_loc["lat"],
    "longitude": gps_loc["lon"],
    "class_name": det["class_name"],
    "confidence": round(float(det["confidence"]), 4),
    "risk_level": metrics["risk_level"],
    "severity_score": metrics["severity_score"],
    "relative_depth_drop": metrics["relative_depth"],
    "area_coverage_pct": metrics["area_percentage"],
    "mask_pixels": area,
    "evidence_file": evidence_filename
}
```

---

### File 2: `src/services/ml_ingestion_service.py`
- **Location**: Lines 153–166, 193, 209
- **Change**: Replaced `item.get("confidence", 0.95)` with strict extraction and validation of `raw_confidence`. If `confidence` is missing or out of bounds `[0.0, 1.0]`, ingestion raises a descriptive `ValueError` and marks the item failed. Set both `Incident.confidence` and `Detection.confidence` to the validated float.

```python
# Before
incident = Incident(
    incident_code=incident_code,
    incident_type=incident_type,
    confidence=float(item.get("confidence", 0.95)),
    severity_score=backend_severity,
    ...
)
detection = Detection(
    incident_id=incident.id,
    detection_type=raw_class,
    confidence=float(item.get("confidence", 0.95)),
    ...
)

# After
# 6. Confidence Extraction & Validation
raw_confidence = item.get("confidence")
if raw_confidence is None:
    summary["failed"] += 1
    raise ValueError(f"Telemetry item for hazard '{hazard_id}' is missing required 'confidence' field.")

try:
    confidence = float(raw_confidence)
    if not (0.0 <= confidence <= 1.0):
        raise ValueError(f"Confidence value {confidence} is out of bounds [0.0, 1.0].")
except (ValueError, TypeError) as conf_err:
    summary["failed"] += 1
    raise ValueError(f"Invalid confidence for hazard '{hazard_id}': {conf_err}")

# Incident and Detection creation
incident = Incident(
    incident_code=incident_code,
    incident_type=incident_type,
    confidence=confidence,
    severity_score=backend_severity,
    ...
)
detection = Detection(
    incident_id=incident.id,
    detection_type=raw_class,
    confidence=confidence,
    ...
)
```

---

### File 3: `tests/services/test_ml_ingestion.py`
- **Location**: Test fixtures and new unit test functions
- **Changes**:
  1. Updated test telemetry fixtures with distinct non-0.95 confidence values (`0.8742`, `0.9234`, `0.8123`, `0.7456`, `0.9678`, `0.8850`, `0.7654`, `0.8990`).
  2. Added assertion checks for `inc.confidence` matching exact input values.
  3. Added `test_missing_confidence_raises_error`: Proves missing confidence fails with `ValueError` rather than falling back to `0.95`.
  4. Added `test_invalid_confidence_range_raises_error`: Proves values outside `[0.0, 1.0]` are rejected.
  5. Added `test_confidence_end_to_end_propagation`: Proves dynamic confidence (`0.8742`) propagates through DB records and associated detections.

---

## 4. Verification and Test Results

### 4.1. Unit & Service Tests (`tests/services/test_ml_ingestion.py`)
```bash
pytest tests/services/test_ml_ingestion.py -v
```
**Results**:
- `test_severity_normalization` — **PASSED**
- `test_priority_mapping` — **PASSED**
- `test_incident_code_formatting` — **PASSED**
- `test_five_class_ingestion_and_spatial_coordinates` — **PASSED** (confidences: `0.8742`, `0.9234`, `0.8123`, `0.7456`, `0.9678`)
- `test_idempotent_duplicate_ingestion` — **PASSED** (confidence: `0.8850`)
- `test_null_gps_location_handling` — **PASSED** (confidence: `0.7654`)
- `test_missing_telemetry_file` — **PASSED**
- `test_malformed_telemetry_json` — **PASSED**
- `test_invalid_hazard_class` — **PASSED**
- `test_missing_evidence_file_skips_evidence_record` — **PASSED** (confidence: `0.8990`)
- `test_missing_confidence_raises_error` — **PASSED** (strictly rejects missing field)
- `test_invalid_confidence_range_raises_error` — **PASSED** (strictly rejects >1.0)
- `test_confidence_end_to_end_propagation` — **PASSED** (verifies `0.8742` end-to-end)

**Outcome**: `13 passed in 8.97s (100% pass rate)`

---

### 4.2. Full Repository Test Suite
```bash
pytest
```
**Outcome**: `75 passed, 16 warnings in 34.92s (100% pass rate across all 75 tests)`

---

## 5. Explicit Safety & Non-Regression Confirmation
- [x] **No ML model weights changed** (`models/` untouched)
- [x] **No ML training code changed** (`train*.py` untouched)
- [x] **No YOLO inference code modified** (`src/detection/yolo_segmentation.py` untouched)
- [x] **No SeverityAnalyzer / depth calculation changed** (`src/detection/severity_analyzer.py`, `src/detection/depth_estimator.py` untouched)
- [x] **No config files changed** (`configs/config.yaml` untouched)
- [x] **No database resets, deletions, or reseeding performed**
- [x] **No frontend UI formula altered** (frontend retains standard `Math.round(confidence * 100)`)
