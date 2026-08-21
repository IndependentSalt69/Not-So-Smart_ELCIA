"""
src/detection/video_tracker.py
Orchestrates the YOLOSegmentor, DepthEstimator, and SeverityAnalyzer.
Reads video feeds and logs comprehensive 3D hazard telemetry.
"""
import cv2
import json
from pathlib import Path

from src.detection.yolo_segmentation import YOLOSegmentor
from src.detection.depth_estimator import DepthEstimator
from src.detection.severity_analyzer import SeverityAnalyzer

class HazardVideoPipeline:
    def __init__(self, weights_path="models/production/civicpulse_best.pt", output_dir="outputs"):
        self.output_dir = Path(output_dir)
        self.evidence_dir = self.output_dir / "evidence"
        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize modules
        self.segmentor = YOLOSegmentor(model_path=weights_path)
        self.depth_estimator = DepthEstimator(model_type="DPT_Large")
        self.severity_analyzer = SeverityAnalyzer()
        
        # State tracking
        self.logged_hazard_ids = set()
        self.telemetry_log = []

    def process_video(self, video_path: str, output_video_path: str = "outputs/demo_tracked_output.mp4"):
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[ERROR] Cannot open video file: {video_path}")
            return

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

        frame_idx = 0
        print(f"[INFO] Starting end-to-end pipeline on: {video_path}...")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_idx += 1
            
            # 1. Get tracked detections and draw standard annotations
            detections = self.segmentor.track_frame(frame, persist=True)
            annotated_frame = self.segmentor.draw_detections(frame, detections)

            for det in detections:
                track_id = det["track_id"]
                poly = det["mask_polygon"]

                # 2. If it is a newly discovered hazard with a valid ID and mask
                if track_id is not None and poly is not None and track_id not in self.logged_hazard_ids:
                    self.logged_hazard_ids.add(track_id)
                    
                    # 3. Compute Depth and Severity
                    depth_map = self.depth_estimator.estimate_depth(frame)
                    metrics = self.severity_analyzer.calculate_hazard_severity(poly, depth_map, frame.shape)
                    
                    # 4. Extract Evidence Snapshot (Saved without bounding boxes for pure evidence)
                    evidence_filename = f"hazard_{track_id}_{metrics['risk_level']}.jpg"
                    evidence_filepath = self.evidence_dir / evidence_filename
                    cv2.imwrite(str(evidence_filepath), frame)

                    # 5. Append to Telemetry Record
                    log_entry = {
                        "hazard_id": track_id,
                        "frame_first_detected": frame_idx,
                        "class_name": det["class_name"],
                        "risk_level": metrics["risk_level"],
                        "severity_score": metrics["severity_score"],
                        "relative_depth_drop": metrics["relative_depth"],
                        "area_coverage_pct": metrics["area_percentage"],
                        "evidence_file": evidence_filename
                    }
                    self.telemetry_log.append(log_entry)
                    print(f"[ALERT] New {det['class_name'].upper()} (ID: {track_id}) | Severity: {metrics['severity_score']}/100 [{metrics['risk_level']}]")

                    # Draw Severity Label next to standard YOLO label
                    x, y = int(det["bbox"][0]), int(det["bbox"][1])
                    cv2.putText(annotated_frame, f"Sev: {metrics['severity_score']}", 
                                (x, max(35, y + 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

            # Write fully processed frame to output video
            out.write(annotated_frame)

        cap.release()
        out.release()
        
        # Save Final Telemetry JSON
        json_path = self.output_dir / "hazard_telemetry.json"
        with open(json_path, "w") as f:
            json.dump(self.telemetry_log, f, indent=4)

        print(f"\n[COMPLETE] Video Processing Finished.")
        print(f" - Exported Video: {output_video_path}")
        print(f" - Telemetry Data: {json_path}")
        print(f" - Evidence Logged: {len(self.telemetry_log)} unique hazards found.")