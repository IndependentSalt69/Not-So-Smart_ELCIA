"""
src/detection/runner.py
Safe Parameterized ML Runner for CivicPulse Drone Hazard Detection Pipeline.
Invokes the existing HazardVideoPipeline with CLI parameters and input validation.
"""

import argparse
import sys
import traceback
from pathlib import Path

from src.detection.video_tracker import HazardVideoPipeline

DEFAULT_WEIGHTS_PATH = "models/production/best.pt"

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CivicPulse ML Pipeline Job Runner (Phase 11A)"
    )
    # Required arguments
    parser.add_argument(
        "--video",
        required=True,
        type=str,
        help="Path to input drone video file (.mp4/.mov)",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        type=str,
        help="Target output directory for job artifacts",
    )
    parser.add_argument(
        "--job-id",
        required=True,
        type=str,
        help="Unique job tracking identifier string",
    )
    # Optional arguments
    parser.add_argument(
        "--srt",
        type=str,
        default=None,
        help="Path to optional DJI SRT telemetry subtitle file",
    )
    parser.add_argument(
        "--weights",
        type=str,
        default=DEFAULT_WEIGHTS_PATH,
        help="Path to YOLO segmentation model weights (.pt)",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=None,
        help="Detection confidence threshold (accepted for CLI compatibility; underlying HazardVideoPipeline uses default internal threshold)",
    )
    parser.add_argument(
        "--iou",
        type=float,
        default=None,
        help="IoU NMS threshold (accepted for CLI compatibility; underlying HazardVideoPipeline uses default internal threshold)",
    )

    return parser.parse_args()


def main():
    args = parse_args()
    job_id = args.job_id

    print(f"[JOB:{job_id}] START")
    print(f"[JOB:{job_id}] VIDEO={args.video}")
    print(f"[JOB:{job_id}] SRT={args.srt if args.srt else 'NONE'}")
    print(f"[JOB:{job_id}] OUTPUT={args.output_dir}")

    # 1. Validate --video
    video_path = Path(args.video)
    if not video_path.exists():
        msg = f"Video file does not exist: {args.video}"
        print(f"[JOB:{job_id}] ERROR={msg}")
        print(f"[JOB:{job_id}] EXIT=1")
        sys.exit(1)
    if not video_path.is_file():
        msg = f"Video path is not a file: {args.video}"
        print(f"[JOB:{job_id}] ERROR={msg}")
        print(f"[JOB:{job_id}] EXIT=1")
        sys.exit(1)

    # 2. Validate --srt (if provided)
    if args.srt:
        srt_path = Path(args.srt)
        if not srt_path.exists():
            msg = f"SRT file does not exist: {args.srt}"
            print(f"[JOB:{job_id}] ERROR={msg}")
            print(f"[JOB:{job_id}] EXIT=1")
            sys.exit(1)
        if not srt_path.is_file():
            msg = f"SRT path is not a file: {args.srt}"
            print(f"[JOB:{job_id}] ERROR={msg}")
            print(f"[JOB:{job_id}] EXIT=1")
            sys.exit(1)

    # 3. Validate --weights (if provided/default)
    if args.weights:
        weights_path = Path(args.weights)
        if not weights_path.exists():
            msg = f"Weights file does not exist: {args.weights}"
            print(f"[JOB:{job_id}] ERROR={msg}")
            print(f"[JOB:{job_id}] EXIT=1")
            sys.exit(1)
        if not weights_path.is_file():
            msg = f"Weights path is not a file: {args.weights}"
            print(f"[JOB:{job_id}] ERROR={msg}")
            print(f"[JOB:{job_id}] EXIT=1")
            sys.exit(1)

    # 4. Create job output directory and evidence/ subdirectory
    output_dir = Path(args.output_dir)
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        evidence_dir = output_dir / "evidence"
        evidence_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        msg = f"Failed to create job output directories: {e}"
        print(f"[JOB:{job_id}] ERROR={msg}")
        print(f"[JOB:{job_id}] EXIT=1")
        sys.exit(1)

    # Note if conf or iou were specified
    if args.conf is not None or args.iou is not None:
        print(
            f"[JOB:{job_id}] INFO=CLI flags --conf/--iou accepted; underlying HazardVideoPipeline utilizes default internal thresholds."
        )

    output_video_path = str(output_dir / "annotated_output.mp4")

    # 4. Select the best available compute device.
    # Previously this hard-required CUDA and exited 1 otherwise, which meant the
    # dashboard upload path could not run at all on a Mac. video_tracker.py and
    # yolo_segmentation.py already fall back cuda -> mps -> cpu, so this now
    # matches them. A demo that runs slowly beats a demo that refuses to start.
    import torch
    if torch.cuda.is_available():
        device = "cuda"
        print(f"[JOB:{job_id}] DEVICE={device}")
        print(f"[JOB:{job_id}] GPU={torch.cuda.get_device_name(0)}")
    elif getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available():
        device = "mps"
        print(f"[JOB:{job_id}] DEVICE={device}")
        print(f"[JOB:{job_id}] GPU=Apple Silicon (MPS)")
        print(f"[JOB:{job_id}] WARN=MPS is slower than CUDA; expect longer processing time.")
    else:
        device = "cpu"
        print(f"[JOB:{job_id}] DEVICE={device}")
        print(f"[JOB:{job_id}] WARN=No GPU found. CPU inference is very slow on long videos.")

    # 5. Execute HazardVideoPipeline
    print(f"[JOB:{job_id}] PIPELINE_START")
    try:
        pipeline = HazardVideoPipeline(
            weights_path=args.weights,
            output_dir=str(output_dir),
            srt_path=args.srt,
            device=device,
        )
        pipeline.process_video(
            video_path=str(video_path),
            output_video_path=output_video_path,
        )


        telemetry_path = output_dir / "hazard_telemetry.json"
        print(f"[JOB:{job_id}] PIPELINE_COMPLETE")
        print(f"[JOB:{job_id}] TELEMETRY={telemetry_path}")
        print(f"[JOB:{job_id}] EVIDENCE_DIR={evidence_dir}")
        print(f"[JOB:{job_id}] EXIT=0")

    except Exception as e:
        msg = f"Pipeline execution failed: {e}"
        print(f"[JOB:{job_id}] ERROR={msg}")
        print(f"[JOB:{job_id}] EXIT=1")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
