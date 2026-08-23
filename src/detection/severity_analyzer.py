"""
src/detection/severity_analyzer.py
Calculates 3D severity using YOLO polygon masks and MiDaS/DPT depth maps.
"""
import cv2
import numpy as np

class SeverityAnalyzer:
    def __init__(self, depth_weight=0.6, area_weight=0.4):
        self.depth_weight = depth_weight
        self.area_weight = area_weight

    def calculate_hazard_severity(self, poly, depth_map, frame_shape) -> dict:
        """Calculates severity score and safely handles hazards without depth maps."""
        import cv2
        import numpy as np
        
        area_pixels = cv2.contourArea(poly)
        frame_area = frame_shape[0] * frame_shape[1]
        area_percentage = (area_pixels / frame_area) * 100 if frame_area > 0 else 0

        relative_depth = 0.0
        # SAFETY CHECK: Only calculate depth if a depth map was actually provided!
        if depth_map is not None:
            poly_mask = np.zeros(depth_map.shape, dtype=np.uint8)
            cv2.fillPoly(poly_mask, [poly], 255)
            pothole_depth_values = depth_map[poly_mask == 255]
            if len(pothole_depth_values) > 0:
                relative_depth = float(np.mean(pothole_depth_values) / 255.0)
            
        # Basic Severity Logic 
        severity_score = min(100, int((area_percentage * 2) + (relative_depth * 50)))
        
        risk_level = "LOW"
        if severity_score > 70:
            risk_level = "CRITICAL"
        elif severity_score > 40:
            risk_level = "MODERATE"

        return {
            "risk_level": risk_level,
            "severity_score": severity_score,
            "relative_depth": round(relative_depth, 3),
            "area_percentage": round(area_percentage, 2)
        }