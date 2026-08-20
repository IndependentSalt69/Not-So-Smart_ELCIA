import sys
import cv2
import numpy as np
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from ultralytics import YOLO
from src.detection.depth_estimator import DepthEstimator
from src.detection.severity_analyzer import SeverityAnalyzer

def main():
    image_path = "data/sample/depth_test.png"
    frame = cv2.imread(image_path)
    if frame is None:
        print(f"[ERROR] Image not found at {image_path}")
        return

    # 1. Run detection (using existing checkpoint)
    # Using your currently available model weights
    model = YOLO("runs/segment/civicpulse_v2_model/weights/last.pt")
    results = model(frame, conf=0.15)[0]

    # 2. Run depth estimation
    depth_estimator = DepthEstimator(model_type="DPT_Large")
    depth_map = depth_estimator.estimate_depth(frame)

    # 3. Analyze severity per detection
    analyzer = SeverityAnalyzer()

    if results.masks is not None:
        for idx, polygon in enumerate(results.masks.xy):
            if len(polygon) > 0:
                metrics = analyzer.calculate_hazard_severity(polygon, depth_map, frame.shape)
                print(f"\n--- Hazard #{idx + 1} Analysis ---")
                print(f"Risk Level    : {metrics['risk_level']}")
                print(f"Severity Score: {metrics['severity_score']}/100")
                print(f"Area Coverage : {metrics['area_percentage']}% of frame")
                print(f"Depth Delta   : {metrics['relative_depth']}")
    else:
        print("[INFO] No segmentation masks detected on this test frame.")

if __name__ == "__main__":
    main()