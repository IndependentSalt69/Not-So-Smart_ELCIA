"""
src/detection/video_tracker.py
Orchestrates YOLOSegmentor, DepthEstimator, and SeverityAnalyzer.
Features temporal persistence, texture variance validation, and H.264 encoding.
"""
import cv2
import json
import datetime
import subprocess
import shutil
from pathlib import Path
from typing import Optional

from src.detection.yolo_segmentation import YOLOSegmentor
from src.detection.depth_estimator import DepthEstimator
from src.detection.severity_analyzer import SeverityAnalyzer
from scripts.gps_parser import parse_dji_srt

import torch
from src.core.config import APP_CONFIG
from src.core import classes as hazard_classes


class HazardVideoPipeline:
    def __init__(
        self, 
        weights_path: str = "models/production/civicpulse_best.pt", 
        output_dir: str = "outputs", 
        srt_path: Optional[str] = None, 
        device: Optional[str] = None
    ):
        self.output_dir = Path(output_dir)
        self.evidence_dir = self.output_dir / "evidence"
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        
        # Hardware target resolution (MPS -> CUDA -> CPU)
        if device is not None:
            self.device = device
        elif torch.cuda.is_available():
            self.device = "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"

        print(f"[AI Engine] Initializing HazardVideoPipeline on device={self.device}")

        # Core ML Submodules
        self.segmentor = YOLOSegmentor(model_path=weights_path, device=self.device)
        self.depth_estimator = DepthEstimator(model_type="DPT_Large", device=self.device)
        self.severity_analyzer = SeverityAnalyzer()

        # State tracking
        self.logged_hazard_ids = set()
        self.track_hit_counter = {}  # {track_id: hit_count}
        self.telemetry_log = []
        
        # Dynamically load from YAML, fallback to your original 50.0
        self.min_area_pixels = APP_CONFIG.get("filters", {}).get("min_area_pixels", 50.0)

        # DJI Telemetry Parser
        self.gps_data = []
        if srt_path and Path(srt_path).exists():
            self.gps_data = parse_dji_srt(srt_path)
            print(f"[INFO] Parsed {len(self.gps_data)} GPS telemetry points from: {srt_path}")

    def _get_gps_for_time(self, seconds: float):
        """Matches video frame timestamp to closest SRT GPS coordinate."""
        if not self.gps_data:
            return {"lat": None, "lon": None}
            
        target_time = str(datetime.timedelta(seconds=int(seconds)))
        if len(target_time) < 8:
            target_time = "0" + target_time
            
        for point in self.gps_data:
            if point["time"].startswith(target_time):
                return {"lat": point["lat"], "lon": point["lon"]}
                
        return {"lat": self.gps_data[-1]["lat"], "lon": self.gps_data[-1]["lon"]}

    def _is_surface_smooth(self, frame, bbox) -> bool:
        """
        Validates whether a region of interest (ROI) exhibits the optical smoothness 
        characteristic of standing water vs. the grain/texture of dry asphalt.
        """
        x1, y1, x2, y2 = [int(v) for v in bbox]
        h, w = frame.shape[:2]
        roi = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
        
        if roi.size == 0:
            return False

        gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()
        
        # Dry textured asphalt typically scores > 600; true standing water is smoother (< 550)
        return laplacian_var < 550.0

    def _encode_h264(self, temp_input_path: str, final_output_path: str) -> None:
        """Transcodes raw OpenCV video to browser-compatible H.264 (yuv420p)."""
        temp_raw_p = Path(temp_input_path)
        final_p = Path(final_output_path)
        temp_h264_p = final_p.with_name(f"_h264_{final_p.name}")

        if not temp_raw_p.exists() or temp_raw_p.stat().st_size == 0:
            raise RuntimeError(f"Raw OpenCV output video not found or empty at '{temp_input_path}'.")

        ffmpeg_cmd = shutil.which("ffmpeg") or "ffmpeg"
        ffprobe_cmd = shutil.which("ffprobe") or "ffprobe"

        cmd = [
            ffmpeg_cmd,
            "-y",
            "-i", str(temp_raw_p),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(temp_h264_p)
        ]

        print(f"[AI Engine] Transcoding annotated video to H.264 / AVC (yuv420p, +faststart)...")
        
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        except Exception as err:
            if temp_h264_p.exists():
                temp_h264_p.unlink()
            raise RuntimeError(f"FFmpeg transcoding failed: {err}") from err

        # Verify codec output
        probe_cmd = [
            ffprobe_cmd,
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=codec_name",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(temp_h264_p)
        ]
        try:
            probe_res = subprocess.run(probe_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            detected_codec = probe_res.stdout.strip().lower()
            if detected_codec != "h264":
                if temp_h264_p.exists():
                    temp_h264_p.unlink()
                raise RuntimeError(f"Expected codec 'h264', got '{detected_codec}'")
        except Exception as err:
            raise RuntimeError(f"ffprobe verification failed: {err}") from err

        if final_p.exists():
            final_p.unlink()
        temp_h264_p.rename(final_p)

        if temp_raw_p.exists():
            temp_raw_p.unlink()

        print(f"[AI Engine] H.264 encoding verified: {final_output_path}")

    def process_video(self, video_path: str, output_video_path: str = "outputs/demo_tracked_output.mp4"):
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[ERROR] Cannot open video file: {video_path}")
            return

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        
        output_path_obj = Path(output_video_path)
        temp_raw_path = str(output_path_obj.with_name(f"_raw_{output_path_obj.name}"))

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(temp_raw_path, fourcc, fps, (width, height))

        # Reset run state
        self.logged_hazard_ids.clear()
        self.track_hit_counter.clear()
        self.telemetry_log.clear()

        frame_idx = 0
        print(f"[INFO] Starting Drone-Optimized Pipeline on: {video_path}...")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_idx += 1
            current_time_sec = frame_idx / fps
            
            # Run segmentation and tracking
            detections = self.segmentor.track_frame(frame, persist=True)
            annotated_frame = self.segmentor.draw_detections(frame, detections)

            for det in detections:
                track_id = det["track_id"]
                poly = det["mask_polygon"]
                area = det["mask_area_px"]
                cls_id = det["class_id"]
                cls_name = det["class_name"].lower()

                if track_id is None or poly is None or area < self.min_area_pixels:
                    continue

                # Track temporal persistence
                self.track_hit_counter[track_id] = self.track_hit_counter.get(track_id, 0) + 1
                hits = self.track_hit_counter[track_id]

                hazard = hazard_classes.get(cls_id) or hazard_classes.get(cls_name)
                if hazard is None:
                    print(f"[AI Engine] WARNING: class id={cls_id} '{cls_name}' not in configs/config.yaml - skipping")
                    continue

                # --- VALIDATION GATES ---
                # 1. Temporal persistence: how many frames before we trust the track.
                if hits < hazard["min_hits"]:
                    continue

                # 2. Surface texture check (rejects wet tarmac read as standing water).
                if hazard["requires_smooth_surface"] and not self._is_surface_smooth(frame, det["bbox"]):
                    continue

                # --- INCIDENT INGESTION ---
                if track_id not in self.logged_hazard_ids:
                    self.logged_hazard_ids.add(track_id)
            
                    depth_map = None
            
                    # Depth estimation, for classes that opt in via config.
                    if hazard["needs_depth"]:
                        print(f"[AI Engine] {hazard['name']} confirmed (ID: {track_id}). Running depth estimation...")
                        depth_map = self.depth_estimator.estimate_depth(frame)
            
                    # Severity evaluation
                    metrics = self.severity_analyzer.calculate_hazard_severity(poly, depth_map, frame.shape)
                    
                    # Save Evidence Snapshot
                    evidence_filename = f"hazard_{track_id}_{metrics['risk_level']}.jpg"
                    evidence_filepath = self.evidence_dir / evidence_filename
                    cv2.imwrite(str(evidence_filepath), frame)

                    # Lookup GPS Coordinates
                    gps_loc = self._get_gps_for_time(current_time_sec)

                    # Append to Telemetry Record
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
                    self.telemetry_log.append(log_entry)
                    print(f"[DRONE CAPTURE] {det['class_name'].upper()} (ID: {track_id}) @ Lat: {gps_loc['lat']}, Lon: {gps_loc['lon']}")

                # Overlay status label
                if track_id in self.logged_hazard_ids:
                    x, y = int(det["bbox"][0]), int(det["bbox"][1])
                    cv2.putText(
                        annotated_frame, 
                        "Logged", 
                        (x, max(35, y + 15)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 
                        0.5, 
                        (0, 0, 255), 
                        2
                    )

            out.write(annotated_frame)

        cap.release()
        out.release()
        
        # Save Final Telemetry JSON
        json_path = self.output_dir / "hazard_telemetry.json"
        with open(json_path, "w") as f:
            json.dump(self.telemetry_log, f, indent=4)

        # Transcode raw output video to browser-compatible H.264
        self._encode_h264(temp_raw_path, output_video_path)

        print(f"\n[COMPLETE] Video Processing Finished.")
        print(f" - Exported Video (H.264): {output_video_path}")
        print(f" - Evidence Logged: {len(self.telemetry_log)} accurate hazards found.")