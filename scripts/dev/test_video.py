"""
scripts/test_video.py
Renders full annotated video output with ByteTrack smoothing and saves unique evidence frames.
"""
import sys
import os
import cv2
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.detection.yolo_segmentation import YOLOSegmentor
from src.severity.scoring_engine import SeverityEngine

def main():
    print("[INFO] Initializing Real-Time Video Tracking & Render Pipeline...")
    segmentor = YOLOSegmentor(model_path="models/checkpoints/civicpulse_best.pt", conf_threshold=0.10)
    severity_engine = SeverityEngine()

    video_path = "data/samples/test_video.mov"
    if not os.path.exists(video_path):
        video_path = "data/samples/test_video.mp4"

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video at {video_path}")
        return

    # Video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    os.makedirs("outputs/evidence", exist_ok=True)
    os.makedirs("outputs/predictions", exist_ok=True)

    # Initialize Video Writer for full MP4 export
    output_video_path = "outputs/predictions/annotated_video.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

    logged_incident_ids = set()
    frame_idx = 0

    print(f"[INFO] Processing {total_frames} frames. Writing video to: {output_video_path}")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        
        # Track objects across frames
        detections = segmentor.track_frame(frame, persist=True)

        for det in detections:
            track_id = det["track_id"]

            # Log incident once per unique track ID
            if track_id is not None and track_id not in logged_incident_ids:
                logged_incident_ids.add(track_id)
                incident = severity_engine.compute_incident_severity(det, road_criticality=0.8)

                print(f"[NEW INCIDENT] ID #{track_id} | {det['class_name'].upper()} | Severity: {incident['severity_score']}")

                # Save snapshot
                evidence_frame = segmentor.draw_detections(frame, [det])
                cv2.imwrite(f"outputs/evidence/incident_id_{track_id}.jpg", evidence_frame)

        # Draw all active detections on this frame and write to video
        annotated_frame = segmentor.draw_detections(frame, detections)
        out.write(annotated_frame)

        if frame_idx % 30 == 0:
            print(f"  * Rendered {frame_idx}/{total_frames} frames...")

    cap.release()
    out.release()
    print(f"\n[SUCCESS] Full video saved to: {output_video_path}")
    print(f"[INFO] Total unique hazards logged: {len(logged_incident_ids)}")

if __name__ == "__main__":
    main()