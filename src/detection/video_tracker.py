"""
src/detection/video_tracker.py
Orchestrates the YOLOSegmentor, DepthEstimator, and SeverityAnalyzer.
Optimized for Drone Footage: Immediate capture with area-based noise filtering.
"""
import cv2
import json
import datetime
import subprocess
import shutil
from pathlib import Path

from src.detection.yolo_segmentation import YOLOSegmentor
from src.detection.depth_estimator import DepthEstimator
from src.detection.severity_analyzer import SeverityAnalyzer
from scripts.gps_parser import parse_dji_srt

import torch


class HazardVideoPipeline:
    def __init__(self, weights_path="models/production/civicpulse_best.pt", output_dir="outputs", srt_path=None, device=None):
        self.output_dir = Path(output_dir)
        self.evidence_dir = self.output_dir / "evidence"
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        
        if device is not None:
            self.device = device
        else:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # Initialize modules with explicit device target
        self.segmentor = YOLOSegmentor(model_path=weights_path, device=self.device)
        self.depth_estimator = DepthEstimator(model_type="DPT_Large", device=self.device)
        self.severity_analyzer = SeverityAnalyzer()

        
        self.logged_hazard_ids = set()
        self.telemetry_log = []
        self.min_area_pixels = 400.0  # Filter out tiny noise artifacts

        # Parse telemetry if SRT file is provided
        self.gps_data = []
        if srt_path and Path(srt_path).exists():
            self.gps_data = parse_dji_srt(srt_path)
            print(f"[INFO] Parsed {len(self.gps_data)} GPS telemetry points from: {srt_path}")

    def _get_gps_for_time(self, seconds: float):
        if not self.gps_data:
            return {"lat": None, "lon": None}
            
        target_time = str(datetime.timedelta(seconds=int(seconds)))
        if len(target_time) < 8:
            target_time = "0" + target_time
            
        for point in self.gps_data:
            if point["time"].startswith(target_time):
                return {"lat": point["lat"], "lon": point["lon"]}
                
        return {"lat": self.gps_data[-1]["lat"], "lon": self.gps_data[-1]["lon"]}

    def _encode_h264(self, temp_input_path: str, final_output_path: str) -> None:
        """
        Transcodes raw OpenCV video into browser-compatible H.264/AVC (yuv420p) format with +faststart using FFmpeg.
        Verifies codec output via ffprobe. Fails explicitly if transcoding or codec verification fails.
        """
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

        print(f"[AI Engine] Transcoding annotated video to H.264 / AVC (yuv420p, +faststart) for browser playback...")
        
        try:
            res = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        except subprocess.CalledProcessError as err:
            log_msg = (
                f"FFmpeg H.264 transcoding failed with returncode {err.returncode}.\n"
                f"Command: {' '.join(cmd)}\n"
                f"Input file: {temp_input_path}\n"
                f"Output file: {temp_h264_p}\n"
                f"Stdout: {err.stdout}\n"
                f"Stderr: {err.stderr}"
            )
            print(f"[ERROR] {log_msg}")
            if temp_h264_p.exists():
                temp_h264_p.unlink()
            raise RuntimeError(log_msg) from err
        except Exception as err:
            log_msg = f"Failed to execute FFmpeg command '{' '.join(cmd)}': {err}"
            print(f"[ERROR] {log_msg}")
            if temp_h264_p.exists():
                temp_h264_p.unlink()
            raise RuntimeError(log_msg) from err

        if not temp_h264_p.exists() or temp_h264_p.stat().st_size == 0:
            log_msg = f"FFmpeg output file missing or 0 bytes after encoding: {temp_h264_p}"
            print(f"[ERROR] {log_msg}")
            raise RuntimeError(log_msg)

        # Verify codec output using ffprobe
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
                log_msg = f"Codec verification failed for '{temp_h264_p}': expected 'h264', got '{detected_codec}'."
                print(f"[ERROR] {log_msg}")
                if temp_h264_p.exists():
                    temp_h264_p.unlink()
                raise RuntimeError(log_msg)
            print(f"[AI Engine] Verified output codec: {detected_codec} (H.264 / AVC)")
        except Exception as err:
            log_msg = f"ffprobe codec verification failed: {err}"
            print(f"[ERROR] {log_msg}")
            if temp_h264_p.exists():
                temp_h264_p.unlink()
            raise RuntimeError(log_msg) from err

        # Promote H.264 file to final output path
        if final_p.exists():
            final_p.unlink()
        temp_h264_p.rename(final_p)

        # Unlink raw temp file ONLY after verification & promotion succeeds
        if temp_raw_p.exists():
            temp_raw_p.unlink()

        print(f"[AI Engine] H.264 encoding complete & verified: {final_output_path}")


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

        frame_idx = 0
        print(f"[INFO] Starting Drone-Optimized Pipeline on: {video_path}...")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_idx += 1
            current_time_sec = frame_idx / fps
            
            # Get tracked detections and draw standard annotations
            detections = self.segmentor.track_frame(frame, persist=True)
            annotated_frame = self.segmentor.draw_detections(frame, detections)

            for det in detections:
                track_id = det["track_id"]
                poly = det["mask_polygon"]
                area = det["mask_area_px"]
                cls_id = det["class_id"]  # Get the unified class ID (0, 1, 2, or 3)

                # Check for valid ID, mask, AND that it is larger than our noise filter
                if track_id is not None and poly is not None and area > self.min_area_pixels:
            
                    # If we haven't analyzed this hazard yet, do it IMMEDIATELY
                    if track_id not in self.logged_hazard_ids:
                        self.logged_hazard_ids.add(track_id)
                
                        # Initialize default metrics
                        depth_map = None
                
                        # ONLY run MiDaS depth calculation if it's a Pothole (Class ID 1)
                        if cls_id == 1:
                            print(f"[AI Engine] Pothole detected (ID: {track_id}). Running depth estimation...")
                            depth_map = self.depth_estimator.estimate_depth(frame)
                
                        # Compute severity (handles depth_map being present or None)
                        metrics = self.severity_analyzer.calculate_hazard_severity(poly, depth_map, frame.shape)
                        
                        # Extract Evidence Snapshot
                        evidence_filename = f"hazard_{track_id}_{metrics['risk_level']}.jpg"
                        evidence_filepath = self.evidence_dir / evidence_filename
                        cv2.imwrite(str(evidence_filepath), frame)

                        # Append to Telemetry Record
                        # 1. Look up GPS location for the current video timestamp
                        gps_loc = self._get_gps_for_time(current_time_sec)

                        # 2. Append coordinates and timestamp into the dictionary
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

                # Draw a "Logged" marker on the video if we successfully recorded it
                if track_id in self.logged_hazard_ids:
                    x, y = int(det["bbox"][0]), int(det["bbox"][1])
                    cv2.putText(annotated_frame, f"Logged", 
                                (x, max(35, y + 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

            out.write(annotated_frame)

        cap.release()
        out.release()
        
        # Save Final Telemetry JSON
        json_path = self.output_dir / "hazard_telemetry.json"
        with open(json_path, "w") as f:
            json.dump(self.telemetry_log, f, indent=4)

        # Transcode raw output video to browser-compatible H.264 / AVC (yuv420p)
        self._encode_h264(temp_raw_path, output_video_path)

        print(f"\n[COMPLETE] Video Processing Finished.")
        print(f" - Exported Video (H.264): {output_video_path}")
        print(f" - Evidence Logged: {len(self.telemetry_log)} accurate hazards found.")