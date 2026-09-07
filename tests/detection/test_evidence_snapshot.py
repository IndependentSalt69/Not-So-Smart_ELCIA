"""
tests/detection/test_evidence_snapshot.py
Unit test verifying that HazardVideoPipeline saves the annotated frame to disk.
"""

from unittest.mock import MagicMock, patch
from pathlib import Path
import numpy as np
import pytest

from src.detection.video_tracker import HazardVideoPipeline


def test_evidence_snapshot_saves_annotated_frame(tmp_path):
    """
    Verify that when an incident is logged, HazardVideoPipeline writes
    annotated_frame (with AI overlays) to the evidence snapshot filepath.
    """
    output_dir = tmp_path / "job_output"
    output_dir.mkdir(parents=True, exist_ok=True)

    with patch("src.detection.video_tracker.YOLOSegmentor") as mock_segmentor_cls, \
         patch("src.detection.video_tracker.DepthEstimator") as mock_depth_cls, \
         patch("src.detection.video_tracker.SeverityAnalyzer") as mock_severity_cls, \
         patch("src.detection.video_tracker.cv2.VideoCapture") as mock_video_cap_cls, \
         patch("src.detection.video_tracker.cv2.VideoWriter") as mock_video_writer_cls, \
         patch("src.detection.video_tracker.cv2.imwrite") as mock_imwrite:

        mock_seg_instance = MagicMock()
        mock_segmentor_cls.return_value = mock_seg_instance

        # Fake raw frame and fake annotated frame
        raw_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        annotated_frame = np.full((480, 640, 3), 255, dtype=np.uint8)

        # Segmentor returns 1 valid detection and distinct annotated_frame
        dummy_polygon = np.array([[10, 10], [50, 10], [50, 50], [10, 50]], dtype=np.int32)
        mock_seg_instance.track_frame.return_value = [
            {
                "track_id": 1,
                "class_id": 0,
                "class_name": "waterlogging",
                "confidence": 0.88,
                "bbox": [10.0, 10.0, 50.0, 50.0],
                "centroid": (30, 30),
                "mask_polygon": dummy_polygon,
                "mask_area_px": 500.0,
                "coverage_ratio": 0.05,
            }
        ]
        mock_seg_instance.draw_detections.return_value = annotated_frame

        # Severity returns HIGH risk
        mock_sev_instance = MagicMock()
        mock_severity_cls.return_value = mock_sev_instance
        mock_sev_instance.calculate_hazard_severity.return_value = {
            "risk_level": "HIGH",
            "severity_score": 8.5,
            "relative_depth": 0.3,
            "area_percentage": 5.0,
        }

        # Mock video capture yielding 3 frames to satisfy min_hits temporal persistence
        mock_cap = MagicMock()
        mock_cap.isOpened.side_effect = [True, True, True, True, False]
        mock_cap.read.side_effect = [(True, raw_frame), (True, raw_frame), (True, raw_frame), (False, None)]
        mock_cap.get.return_value = 30
        mock_video_cap_cls.return_value = mock_cap

        # Initialize pipeline and bypass transcode
        pipeline = HazardVideoPipeline(output_dir=str(output_dir))
        pipeline._encode_h264 = MagicMock()
        pipeline._is_surface_smooth = MagicMock(return_value=True)

        pipeline.process_video("fake_video.mp4", str(output_dir / "annotated_output.mp4"))

        # Verify cv2.imwrite was called with annotated_frame, NOT raw_frame
        assert mock_imwrite.called, "cv2.imwrite was not called for evidence snapshot"
        saved_path_arg = mock_imwrite.call_args[0][0]
        saved_img_arg = mock_imwrite.call_args[0][1]

        assert "hazard_1_HIGH.jpg" in saved_path_arg
        # Verify the saved image array is the annotated_frame (all 255s) and not raw_frame (all 0s)
        assert np.array_equal(saved_img_arg, annotated_frame)
        assert not np.array_equal(saved_img_arg, raw_frame)
