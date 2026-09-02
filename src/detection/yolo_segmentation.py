"""
src/detection/yolo_segmentation.py
Handles YOLOv8-seg model inference, custom ByteTrack tracking,
and smooth visualization overlays with Mac M-series (MPS) & dynamic YAML config support.
"""
import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict, Any, Optional
import torch

from src.core import classes as hazard_classes


class YOLOSegmentor:
    def __init__(
        self,
        model_path: str = "models/production/best.pt",
        conf_threshold: float = 0.35,     # Base confidence floor
        iou_threshold: float = 0.45,
        imgsz: int = 640,
        tracker_config: str = "configs/custom_bytetrack.yaml",
        target_classes: Optional[Dict[int, str]] = None,
        device: Optional[str] = None,
    ):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.imgsz = imgsz
        self.tracker_config = tracker_config

        # Class names from configs/config.yaml. target_classes stays
        # overridable for tests and one-off runs.
        self.target_classes = (
            target_classes if target_classes is not None else hazard_classes.names()
        )
        self.class_conf_thresholds = hazard_classes.conf_thresholds()

        # Device Selection: CUDA (NVIDIA) -> MPS (Apple Silicon) -> CPU
        if device is not None:
            self.device = device
        elif torch.cuda.is_available():
            self.device = "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"

        print(f"[AI Engine] Loading YOLO Segmentation Model from: {self.model_path} on device={self.device}")
        self.model = YOLO(self.model_path)

    def _parse_results(self, results, h: int, w: int) -> List[Dict[str, Any]]:
        """Parses YOLO boxes, masks, and tracking IDs into a clean dictionary list."""
        detections = []
        if not results or len(results) == 0:
            return detections

        res = results[0]
        boxes = res.boxes
        masks = res.masks

        if boxes is None or len(boxes) == 0:
            return detections

        for i in range(len(boxes)):
            box = boxes[i]
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].cpu().numpy().tolist()

            track_id = int(box.id[0].item()) if (box.id is not None) else None

            cls_name = self.target_classes.get(
                cls_id, res.names.get(cls_id, f"class_{cls_id}")
            ).lower()

            # Apply per-class confidence threshold filter
            min_required_conf = self.class_conf_thresholds.get(cls_name, self.conf_threshold)
            if conf < min_required_conf:
                continue

            mask_polygon = None
            mask_area_pixels = 0.0
            centroid = (int((xyxy[0] + xyxy[2]) / 2), int((xyxy[1] + xyxy[3]) / 2))

            if masks is not None and len(masks) > i:
                xy_coords = masks[i].xy
                if len(xy_coords) > 0 and len(xy_coords[0]) >= 3:
                    polygon_points = np.array(xy_coords[0], dtype=np.int32)
                    mask_area = float(cv2.contourArea(polygon_points))

                    # Discard microscopic artifact polygons (< 150px)
                    if mask_area >= 150.0:
                        mask_polygon = polygon_points
                        mask_area_pixels = mask_area

                        M = cv2.moments(polygon_points)
                        if M["m00"] != 0:
                            centroid = (int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"]))

            coverage_ratio = mask_area_pixels / float(h * w) if (h * w) > 0 else 0.0

            detections.append({
                "track_id": track_id,
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": round(conf, 4),
                "bbox": [round(coord, 2) for coord in xyxy],
                "centroid": centroid,
                "mask_polygon": mask_polygon,
                "mask_area_px": round(mask_area_pixels, 2),
                "coverage_ratio": round(coverage_ratio, 4),
            })

        return detections

    def track_frame(self, frame: np.ndarray, persist: bool = True) -> List[Dict[str, Any]]:
        """Continuous tracking with custom ByteTrack config."""
        h, w = frame.shape[:2]
        results = self.model.track(
            source=frame,
            persist=persist,
            tracker=self.tracker_config,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            imgsz=self.imgsz,
            device=self.device,
            verbose=False,
        )
        return self._parse_results(results, h, w)

    def draw_detections(self, frame: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
        annotated = frame.copy()
        
        color_palette = hazard_classes.colors()
        default_color = (0, 255, 0)

        for det in detections:
            cls_name = det["class_name"]
            conf = det["confidence"]
            track_id = det["track_id"]
            x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
            color = color_palette.get(cls_name.lower(), default_color)

            if det["mask_polygon"] is not None:
                overlay = annotated.copy()
                cv2.fillPoly(overlay, [det["mask_polygon"]], color=color)
                cv2.addWeighted(overlay, 0.4, annotated, 0.6, 0, annotated)
                cv2.polylines(annotated, [det["mask_polygon"]], isClosed=True, color=color, thickness=2)

            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            cx, cy = det["centroid"]
            cv2.circle(annotated, (cx, cy), 4, (0, 255, 255), -1)

            id_prefix = f"ID #{track_id} | " if track_id is not None else ""
            label = f"{id_prefix}{cls_name.upper()} {conf:.2f}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, max(0, y1 - 22)), (x1 + tw + 6, max(0, y1)), color, -1)
            cv2.putText(annotated, label, (x1 + 3, max(15, y1 - 6)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        return annotated