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

    def calculate_hazard_severity(self, polygon_coords: np.ndarray, depth_map: np.ndarray, frame_shape: tuple) -> dict:
        """
        Calculates depth drop, surface area coverage, and a unified severity score.
        """
        h, w = frame_shape[:2]
        poly_mask = np.zeros((h, w), dtype=np.uint8)
        
        # Fill polygon mask
        pts = np.array(polygon_coords, dtype=np.int32).reshape((-1, 1, 2))
        cv2.fillPoly(poly_mask, [pts], 255)

        # Create outer rim mask (dilated rim around the pothole)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        dilated_mask = cv2.dilate(poly_mask, kernel, iterations=2)
        rim_mask = cv2.subtract(dilated_mask, poly_mask)

        # Extract depth values
        pothole_depth_values = depth_map[poly_mask == 255]
        rim_depth_values = depth_map[rim_mask == 255]

        if len(pothole_depth_values) == 0 or len(rim_depth_values) == 0:
            return {"severity_score": 0.0, "relative_depth": 0.0, "area_percentage": 0.0, "risk_level": "LOW"}

        mean_pothole_depth = float(np.mean(pothole_depth_values))
        mean_rim_depth = float(np.mean(rim_depth_values))

        # Relative depression delta
        depth_delta = max(0.0, mean_rim_depth - mean_pothole_depth)
        
        # Hazard surface area coverage relative to frame
        area_pixels = np.sum(poly_mask == 255)
        area_percentage = (area_pixels / (h * w)) * 100.0

        # Normalized scoring (0-100)
        norm_depth = min(100.0, (depth_delta / 50.0) * 100.0)
        norm_area = min(100.0, (area_percentage / 5.0) * 100.0)

        severity_score = (self.depth_weight * norm_depth) + (self.area_weight * norm_area)
        severity_score = round(min(100.0, severity_score), 2)

        # Categorize risk
        if severity_score >= 65:
            risk_level = "CRITICAL"
        elif severity_score >= 35:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        return {
            "severity_score": severity_score,
            "relative_depth": round(depth_delta, 2),
            "area_percentage": round(area_percentage, 2),
            "risk_level": risk_level
        }