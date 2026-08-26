# Phase 11A — Safe Parameterized ML Runner

**Document Version**: 1.0.0  
**Implementation Date**: August 26, 2026  
**Scope**: Parameterized CLI ML Pipeline Adapter (`src/detection/runner.py`)  

---

## 1. Purpose

The goal of Phase 11A is to introduce a safe, CLI-parameterized adapter script (`src/detection/runner.py`) that wraps the existing CivicPulse ML detection pipeline (`HazardVideoPipeline`) without modifying any underlying computer vision algorithms, PyTorch models, tracking logic, or database schemas.

This runner provides:
1. **CLI Parameterization**: Accepts dynamic video paths, optional telemetry files, custom output directories, and job IDs.
2. **Input Validation**: Ensures files exist and are valid before initializing heavy GPU/PyTorch neural network tensors.
3. **Job Output Isolation**: Guarantees that each processing run writes to isolated directories (`outputs/jobs/<job_id>/`), preventing output overwrites.
4. **Structured Logging**: Emits machine-parsable log tokens (`[JOB:<job_id>] ...`) for FastAPI subprocess progress tracking and exit status reporting.

---

## 2. Existing Pipeline Preserved

The core detection engine remains completely untouched:
- **ML Class Definitions**: Unchanged (`waterlogging`, `pothole`, `drainage_overflow`, `damaged_footpath`).
- **Segmentation & Tracking**: YOLOv8-seg (`src/detection/yolo_segmentation.py`) and ByteTrack (`configs/custom_bytetrack.yaml`).
- **Depth Estimation**: Intel MiDaS `DPT_Large` (`src/detection/depth_estimator.py`).
- **Severity & Evidence Analysis**: `SeverityAnalyzer` (`src/detection/severity_analyzer.py`) and evidence image snapshot generation.
- **Legacy Script**: `scripts/run_pipeline.py` remains functional.

---

## 3. CLI Usage

Run the runner as a Python module:

```bash
python -m src.detection.runner \
    --video data_raw/full_demo_video.mp4 \
    --srt data_raw/full_demo_video.srt \
    --output-dir outputs/jobs/phase11a-test \
    --job-id phase11a-test
```

### Command Line Flags:

| Flag | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `--video` | String | **Yes** | — | Path to raw input drone video file (`.mp4`, `.mov`, `.avi`) |
| `--output-dir` | String | **Yes** | — | Directory where job output artifacts will be saved |
| `--job-id` | String | **Yes** | — | Unique job tracking identifier string |
| `--srt` | String | No | `None` | Optional path to DJI SRT telemetry subtitle file |
| `--weights` | String | No | `runs/segment/civicpulse_4class_max-2/weights/best.pt` | Path to YOLOv8 segmentation model weights |
| `--conf` | Float | No | `None` | Detection confidence threshold (forward compatibility CLI flag) |
| `--iou` | Float | No | `None` | IoU NMS threshold (forward compatibility CLI flag) |

---

## 4. Input Contract & Validation

Before initializing PyTorch or loading model weights, `src/detection/runner.py` performs strict validation:

1. **Video Validation**:
   - Verifies `--video` path exists.
   - Verifies `--video` path points to a file (`is_file()`).
2. **Telemetry Subtitle Validation** (if `--srt` is provided):
   - Verifies `--srt` path exists.
   - Verifies `--srt` path points to a file (`is_file()`).
3. **Model Weights Validation** (if `--weights` is provided):
   - Verifies `--weights` path exists.
   - Verifies `--weights` path points to a file (`is_file()`).
4. **Directory Preparation**:
   - Creates `--output-dir` if it does not exist.
   - Creates `<output-dir>/evidence/` subdirectory for frame snapshots.

If any validation step fails, the runner emits a structured error log (`[JOB:<job_id>] ERROR=<message>`) and exits immediately with code `1`.

---

## 5. Output Contract

For any job with ID `<job_id>`, the runner generates the following structure:

```
outputs/jobs/<job_id>/
├── annotated_output.mp4          # Tracked video render with polygon masks and ByteTrack labels
├── hazard_telemetry.json            # Array of unique detected hazard objects with GPS coordinates
└── evidence/                        # Evidence image snapshots captured on first hazard detection
    ├── hazard_18_CRITICAL.jpg
    ├── hazard_34_CRITICAL.jpg
    ├── hazard_76_CRITICAL.jpg
    └── hazard_95_CRITICAL.jpg
```

---

## 6. Four Supported Hazard Classes

The runner preserves the four civic risk hazard classes supported by the trained YOLOv8 model:

1. **`waterlogging`**: Road surface ponding and standing water inundation.
2. **`pothole`**: Structural asphalt crater and depth drop (triggers MiDaS depth analysis).
3. **`drainage_overflow`**: Stormwater culvert blockages and sewer regurgitation.
4. **`damaged_footpath`**: Fractured pedestrian pavers and sidewalk collapses.

---

## 7. Error Handling & Structured Logging

The runner produces machine-parsable stdout logs for background process monitoring:

### Success Output Log Stream:
```text
[JOB:phase11a-test] START
[JOB:phase11a-test] VIDEO=data_raw/full_demo_video.mp4
[JOB:phase11a-test] SRT=data_raw/full_demo_video.srt
[JOB:phase11a-test] OUTPUT=outputs/jobs/phase11a-test
[JOB:phase11a-test] PIPELINE_START
... (OpenCV / YOLO / MiDaS progress logs) ...
[JOB:phase11a-test] PIPELINE_COMPLETE
[JOB:phase11a-test] TELEMETRY=outputs/jobs/phase11a-test/hazard_telemetry.json
[JOB:phase11a-test] EVIDENCE_DIR=outputs/jobs/phase11a-test/evidence
[JOB:phase11a-test] EXIT=0
```

### Failure Output Log Stream:
```text
[JOB:phase11a-test] START
[JOB:phase11a-test] ERROR=Video file does not exist: data_raw/non_existent.mp4
[JOB:phase11a-test] EXIT=1
```

Exceptions during pipeline execution are not swallowed; tracebacks are printed to `stderr` and the job exits with code `1`.

---

## 8. Verification Results

1. **Test Job Execution**:
   - Command: `venv\Scripts\python.exe -m src.detection.runner --video data_raw/full_demo_video.mp4 --srt data_raw/full_demo_video.srt --output-dir outputs/jobs/phase11a-test --job-id phase11a-test`
   - Exit status: `0`
2. **Artifact Verification**:
   - `outputs/jobs/phase11a-test/annotated_output.mp4` created ($>0$ bytes).
   - `outputs/jobs/phase11a-test/hazard_telemetry.json` created with valid JSON array.
   - `outputs/jobs/phase11a-test/evidence/` created with JPG snapshot files.
3. **Legacy Execution Verification**:
   - `scripts/run_pipeline.py` tested and confirmed fully functional.
4. **Automated Unit Tests**:
   - `python -m pytest -v` passed **44 / 44 tests (100%)**.

---

## 9. Known Limitations

- **Confidence and IoU Parameterization**: CLI flags `--conf` and `--iou` are accepted by `runner.py` for forward compatibility. However, the underlying `HazardVideoPipeline.__init__` constructor currently uses default internal confidence and IoU thresholds. Updating `HazardVideoPipeline` to accept `conf` and `iou` dynamically can be performed in a future refinement without breaking `runner.py`'s interface.
