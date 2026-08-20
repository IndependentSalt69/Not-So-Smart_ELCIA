"""
src/severity/scoring_engine.py
Calculates civic severity scores (0-10) and assigns priority (P1/P2/P3)
based on mask geometry, coverage, and road criticality.
"""

from typing import Dict, Any, List


class SeverityEngine:
    def __init__(
        self,
        weight_coverage: float = 0.45,
        weight_confidence: float = 0.25,
        weight_criticality: float = 0.30,
    ):
        """
        Initialize weights for the explainable severity formula.
        """
        self.w_cov = weight_coverage
        self.w_conf = weight_confidence
        self.w_crit = weight_criticality

    def compute_incident_severity(
        self, 
        detection: Dict[str, Any], 
        road_criticality: float = 0.8  # E.g., Arterial Road = 1.0, Sector Road = 0.8, Alley = 0.4
    ) -> Dict[str, Any]:
        """
        Calculates normalized severity (0-10) and maps to Priority (P1/P2/P3).
        """
        coverage_ratio = detection.get("coverage_ratio", 0.0)
        confidence = detection.get("confidence", 0.5)
        cls_name = detection.get("class_name", "waterlogging").lower()

        # 1. Normalize coverage impact (even 5-10% road coverage is huge in civic context)
        normalized_coverage = min(1.0, coverage_ratio * 10.0)

        # 2. Heuristic Severity Score (0.0 to 10.0)
        raw_score = (
            (self.w_cov * normalized_coverage) +
            (self.w_conf * confidence) +
            (self.w_crit * road_criticality)
        ) * 10.0

        # Class multiplier: deep potholes have direct vehicle damage risk
        if "pothole" in cls_name:
            raw_score *= 1.1

        severity_score = round(min(10.0, max(1.0, raw_score)), 1)

        # 3. Operational Priority & Action Assignment
        if severity_score >= 6.5:
            priority = "P1"
            action = "Immediate Intervention: Deploy Dewatering Pump / Emergency Patching"
        elif severity_score >= 4.0:
            priority = "P2"
            action = "Scheduled Maintenance: Add to 24-Hour Road Repair Queue"
        else:
            priority = "P3"
            action = "Monitoring Queue: Inspect Drainage Flow & Surface Erosion"

        return {
            "severity_score": severity_score,
            "priority": priority,
            "recommended_action": action,
            "road_criticality": road_criticality,
        }