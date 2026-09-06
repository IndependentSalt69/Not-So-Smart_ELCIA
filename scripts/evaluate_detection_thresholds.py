"""
Evaluate YOLO11m-seg NMS IoU thresholds on the CivicPulse validation set.

Confidence thresholds are fixed using the previous confidence experiment.
This experiment isolates the effect of YOLO NMS IoU.

The experiment:
    - uses fixed class-specific confidence thresholds
    - sweeps NMS IoU thresholds
    - runs YOLO11m-seg on the validation set for each NMS IoU
    - matches segmentation predictions to ground-truth masks
    - calculates TP / FP / FN / Precision / Recall / F1
    - calculates macro F1 across the five classes
    - recommends the best NMS IoU
"""

from pathlib import Path
import csv

import cv2
import numpy as np
from ultralytics import YOLO


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

MODEL_PATH = Path("models/production/best.pt")

DATASET_ROOT = Path("/Users/manthan/Downloads/final_dataset")
IMAGE_DIR = DATASET_ROOT / "val" / "images"
LABEL_DIR = DATASET_ROOT / "val" / "labels"

OUTPUT_DIR = Path("outputs/threshold_evaluation")
OUTPUT_CSV = OUTPUT_DIR / "nms_iou_results.csv"


# ---------------------------------------------------------------------------
# CivicPulse class contract
# DO NOT CHANGE
# ---------------------------------------------------------------------------

CLASS_NAMES = {
    0: "damaged_footpath",
    1: "drainage_overflow",
    2: "open_manhole",
    3: "pothole",
    4: "waterlogging",
}


# ---------------------------------------------------------------------------
# Fixed confidence thresholds
# Obtained from the previous confidence sweep.
# ---------------------------------------------------------------------------

CLASS_CONF_THRESHOLDS = {
    0: 0.15,  # damaged_footpath
    1: 0.30,  # drainage_overflow
    2: 0.60,  # open_manhole
    3: 0.30,  # pothole
    4: 0.30,  # waterlogging
}


# ---------------------------------------------------------------------------
# NMS IoU experiment
# ---------------------------------------------------------------------------

GLOBAL_CANDIDATE_CONF = 0.05

# Prediction-to-ground-truth mask IoU required for TP.
MATCH_IOU = 0.50

# NMS IoU values to evaluate.
NMS_IOU_THRESHOLDS = np.round(
    np.arange(0.30, 0.71, 0.05),
    2,
)


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def polygon_to_mask(points, height, width):
    """Convert normalized YOLO polygon coordinates to a binary mask."""

    if len(points) < 3:
        return None

    polygon = np.asarray(points, dtype=np.float32)

    polygon[:, 0] *= width
    polygon[:, 1] *= height

    polygon = np.round(polygon).astype(np.int32)

    polygon[:, 0] = np.clip(polygon[:, 0], 0, width - 1)
    polygon[:, 1] = np.clip(polygon[:, 1], 0, height - 1)

    mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(mask, [polygon], 1)

    return mask


def mask_iou(mask_a, mask_b):
    """Calculate binary mask IoU."""

    intersection = np.logical_and(mask_a, mask_b).sum()
    union = np.logical_or(mask_a, mask_b).sum()

    if union == 0:
        return 0.0

    return float(intersection / union)


def load_ground_truth(label_path, height, width):
    """Load YOLO segmentation ground-truth labels."""

    ground_truth = []

    if not label_path.exists():
        return ground_truth

    with label_path.open("r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()

            if len(parts) < 7:
                continue

            class_id = int(parts[0])
            coords = list(map(float, parts[1:]))

            if len(coords) % 2 != 0:
                continue

            points = [
                [coords[i], coords[i + 1]]
                for i in range(0, len(coords), 2)
            ]

            mask = polygon_to_mask(
                points,
                height,
                width,
            )

            if mask is not None and mask.sum() > 0:
                ground_truth.append(
                    (class_id, mask)
                )

    return ground_truth


def extract_predictions(result, height, width):
    """Extract YOLO segmentation predictions."""

    predictions = []

    if result.boxes is None or len(result.boxes) == 0:
        return predictions

    if result.masks is None:
        return predictions

    for i in range(len(result.boxes)):

        class_id = int(
            result.boxes.cls[i].item()
        )

        confidence = float(
            result.boxes.conf[i].item()
        )

        if i >= len(result.masks.xy):
            continue

        polygon = result.masks.xy[i]

        if polygon is None or len(polygon) < 3:
            continue

        polygon = np.asarray(
            polygon,
            dtype=np.float32,
        )

        polygon = np.round(
            polygon
        ).astype(np.int32)

        polygon[:, 0] = np.clip(
            polygon[:, 0],
            0,
            width - 1,
        )

        polygon[:, 1] = np.clip(
            polygon[:, 1],
            0,
            height - 1,
        )

        mask = np.zeros(
            (height, width),
            dtype=np.uint8,
        )

        cv2.fillPoly(
            mask,
            [polygon],
            1,
        )

        if mask.sum() == 0:
            continue

        predictions.append(
            {
                "class_id": class_id,
                "confidence": confidence,
                "mask": mask,
            }
        )

    return predictions


def evaluate_class(
    predictions,
    ground_truth,
    class_id,
):
    """
    Evaluate one class.

    Predictions are already NMS-filtered by YOLO.
    Confidence filtering happens here using the fixed
    class-specific threshold.
    """

    threshold = CLASS_CONF_THRESHOLDS[class_id]

    class_predictions = [
        p
        for p in predictions
        if p["class_id"] == class_id
        and p["confidence"] >= threshold
    ]

    class_ground_truth = [
        gt_mask
        for gt_class_id, gt_mask in ground_truth
        if gt_class_id == class_id
    ]

    class_predictions.sort(
        key=lambda p: p["confidence"],
        reverse=True,
    )

    matched_gt = set()

    tp = 0
    fp = 0

    for prediction in class_predictions:

        best_iou = 0.0
        best_gt_index = None

        for gt_index, gt_mask in enumerate(
            class_ground_truth
        ):

            if gt_index in matched_gt:
                continue

            iou = mask_iou(
                prediction["mask"],
                gt_mask,
            )

            if iou > best_iou:
                best_iou = iou
                best_gt_index = gt_index

        if best_iou >= MATCH_IOU:
            tp += 1
            matched_gt.add(best_gt_index)
        else:
            fp += 1

    fn = (
        len(class_ground_truth)
        - len(matched_gt)
    )

    return tp, fp, fn


def calculate_metrics(tp, fp, fn):
    """Calculate precision, recall and F1."""

    precision = (
        tp / (tp + fp)
        if (tp + fp) > 0
        else 0.0
    )

    recall = (
        tp / (tp + fn)
        if (tp + fn) > 0
        else 0.0
    )

    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    return precision, recall, f1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():

    print("=" * 80)
    print("CivicPulse YOLO11m-seg NMS IoU Evaluation")
    print("=" * 80)

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}"
        )

    if not IMAGE_DIR.exists():
        raise FileNotFoundError(
            f"Validation image directory not found: {IMAGE_DIR}"
        )

    if not LABEL_DIR.exists():
        raise FileNotFoundError(
            f"Validation label directory not found: {LABEL_DIR}"
        )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    image_paths = sorted(
        list(IMAGE_DIR.glob("*.jpg"))
        + list(IMAGE_DIR.glob("*.jpeg"))
        + list(IMAGE_DIR.glob("*.png"))
    )

    print(f"Model:             {MODEL_PATH}")
    print(f"Validation images: {IMAGE_DIR}")
    print(f"Images found:      {len(image_paths)}")
    print(f"Candidate conf:    {GLOBAL_CANDIDATE_CONF}")
    print(f"Mask match IoU:    {MATCH_IOU}")
    print(
        f"NMS IoU sweep:     "
        f"{NMS_IOU_THRESHOLDS[0]:.2f}"
        f" -> "
        f"{NMS_IOU_THRESHOLDS[-1]:.2f}"
    )

    print()
    print("Fixed class confidence thresholds:")

    for class_id, class_name in CLASS_NAMES.items():
        print(
            f"  {class_name:<20} "
            f"{CLASS_CONF_THRESHOLDS[class_id]:.2f}"
        )

    print()

    if not image_paths:
        raise RuntimeError(
            "No validation images found."
        )

    print("Loading YOLO model...")
    model = YOLO(str(MODEL_PATH))
    print("Model loaded.")
    print()

    # -----------------------------------------------------------------------
    # Evaluate each NMS IoU independently.
    # -----------------------------------------------------------------------

    rows = []

    for iou_index, nms_iou in enumerate(
        NMS_IOU_THRESHOLDS,
        start=1,
    ):

        print()
        print("=" * 80)
        print(
            f"NMS IoU {nms_iou:.2f} "
            f"({iou_index}/{len(NMS_IOU_THRESHOLDS)})"
        )
        print("=" * 80)

        class_stats = {
            class_id: {
                "tp": 0,
                "fp": 0,
                "fn": 0,
            }
            for class_id in CLASS_NAMES
        }

        for image_index, image_path in enumerate(
            image_paths,
            start=1,
        ):

            image = cv2.imread(
                str(image_path)
            )

            if image is None:
                print(
                    f"[WARNING] Could not read: "
                    f"{image_path}"
                )
                continue

            height, width = image.shape[:2]

            results = model.predict(
                source=image,
                conf=GLOBAL_CANDIDATE_CONF,
                iou=float(nms_iou),
                imgsz=640,
                device=None,
                verbose=False,
            )

            result = results[0]

            predictions = extract_predictions(
                result,
                height,
                width,
            )

            label_path = (
                LABEL_DIR
                / f"{image_path.stem}.txt"
            )

            ground_truth = load_ground_truth(
                label_path,
                height,
                width,
            )

            for class_id in CLASS_NAMES:

                tp, fp, fn = evaluate_class(
                    predictions,
                    ground_truth,
                    class_id,
                )

                class_stats[class_id]["tp"] += tp
                class_stats[class_id]["fp"] += fp
                class_stats[class_id]["fn"] += fn

            if (
                image_index % 100 == 0
                or image_index == len(image_paths)
            ):
                print(
                    f"Processed "
                    f"{image_index}/{len(image_paths)}"
                )

        # -------------------------------------------------------------------
        # Calculate class metrics.
        # -------------------------------------------------------------------

        class_f1_values = []

        for class_id, class_name in CLASS_NAMES.items():

            stats = class_stats[class_id]

            precision, recall, f1 = calculate_metrics(
                stats["tp"],
                stats["fp"],
                stats["fn"],
            )

            class_f1_values.append(f1)

            rows.append(
                {
                    "nms_iou": float(nms_iou),
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence_threshold":
                        CLASS_CONF_THRESHOLDS[class_id],
                    "tp": stats["tp"],
                    "fp": stats["fp"],
                    "fn": stats["fn"],
                    "precision": precision,
                    "recall": recall,
                    "f1": f1,
                }
            )

        macro_f1 = float(
            np.mean(class_f1_values)
        )

        print()
        print(
            f"Macro F1 at NMS IoU "
            f"{nms_iou:.2f}: {macro_f1:.4f}"
        )

        for class_id, class_name in CLASS_NAMES.items():

            stats = class_stats[class_id]

            precision, recall, f1 = calculate_metrics(
                stats["tp"],
                stats["fp"],
                stats["fn"],
            )

            print(
                f"  {class_name:<20} "
                f"P={precision:.4f} "
                f"R={recall:.4f} "
                f"F1={f1:.4f}"
            )

    # -----------------------------------------------------------------------
    # Save CSV.
    # -----------------------------------------------------------------------

    with OUTPUT_CSV.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=[
                "nms_iou",
                "class_id",
                "class_name",
                "confidence_threshold",
                "tp",
                "fp",
                "fn",
                "precision",
                "recall",
                "f1",
            ],
        )

        writer.writeheader()
        writer.writerows(rows)

    # -----------------------------------------------------------------------
    # Select best NMS IoU using macro F1.
    # -----------------------------------------------------------------------

    macro_scores = {}

    for nms_iou in NMS_IOU_THRESHOLDS:

        values = [
            row["f1"]
            for row in rows
            if abs(
                row["nms_iou"] - float(nms_iou)
            ) < 1e-9
        ]

        macro_scores[float(nms_iou)] = float(
            np.mean(values)
        )

    best_iou = max(
        macro_scores,
        key=macro_scores.get,
    )

    print()
    print("=" * 80)
    print("BEST NMS IoU")
    print("=" * 80)

    print(
        f"Best NMS IoU: {best_iou:.2f}"
    )

    print(
        f"Macro F1:     "
        f"{macro_scores[best_iou]:.4f}"
    )

    print()
    print("All NMS IoU results:")

    for iou, macro_f1 in macro_scores.items():
        print(
            f"  IoU={iou:.2f} "
            f"-> Macro F1={macro_f1:.4f}"
        )

    print()
    print(
        f"Full results saved to: "
        f"{OUTPUT_CSV}"
    )
    print("=" * 80)


if __name__ == "__main__":
    main()