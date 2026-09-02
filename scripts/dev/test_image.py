"""
scripts/test_image.py
Tests the complete CivicPulse pipeline: YOLO Segmentation + Severity Scoring.
"""
import sys
from pathlib import Path
import cv2

# Add project root to sys.path so we can import from src
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.detection.yolo_segmentation import YOLOSegmentor
from src.severity.scoring_engine import SeverityEngine

def main():
    print("[INFO] Initializing CivicPulse Pipeline...")
    
    # 1. Initialize Perception & Severity Engines
    # Using 0.05 threshold temporarily to catch all detections for testing
    segmentor = YOLOSegmentor(model_path="models/production/best.pt", conf_threshold=0.05)
    severity_engine = SeverityEngine()
    
    # 2. Load Test Image
    image_path = "data/samples/test_image.jpg"
    frame = cv2.imread(image_path)
    
    if frame is None:
        print(f"Error: Could not load image at {image_path}")
        return

    # 3. Run Inference
    print("[INFO] Running Perception Engine...")
    detections = segmentor.infer_frame(frame)
    
    # 4. Process Severity & Priority for each detection
    print(f"\n--- CIVIC INCIDENT ALERTS ({len(detections)} Found) ---")
    
    for i, det in enumerate(detections, 1):
        # Calculate severity assuming it's a standard internal road (criticality 0.8)
        incident_data = severity_engine.compute_incident_severity(det, road_criticality=0.8)
        
        print(f"\nAlert #{i}: {det['class_name'].upper()}")
        print(f"  * Confidence: {det['confidence']}")
        print(f"  * Coverage:   {det['coverage_ratio']:.2%}")
        print(f"  * SEVERITY:   {incident_data['severity_score']} / 10.0")
        print(f"  * PRIORITY:   {incident_data['priority']}")
        print(f"  * ACTION:     {incident_data['recommended_action']}")

    # 5. Draw the masks and save the visual evidence
    annotated_frame = segmentor.draw_detections(frame, detections)
    output_path = "outputs/predictions/test_image_result.jpg"
    cv2.imwrite(output_path, annotated_frame)
    print(f"\n[INFO] Saved annotated evidence image to {output_path}")

if __name__ == "__main__":
    main()