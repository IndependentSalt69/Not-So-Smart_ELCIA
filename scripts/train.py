#!/usr/bin/env python3
"""
CivicPulse YOLO11m-seg training.

Run from the repository root:

    python scripts/train.py

Dataset:
    C:/Users/MANAV/Downloads/final_dataset/data.yaml

Output:
    <repository>/models/checkpoints/civicpulse_v2_yolo11m/

Model:
    YOLO11m-seg
"""

import shutil
import sys
from pathlib import Path

from ultralytics import YOLO


# ============================================================
# PATHS
# ============================================================

# Repository root:
# D:/Not-So-Smart_ELCIA/
ROOT = Path(__file__).resolve().parents[1]

# Dataset on your friend's PC
DATA = Path.home() / "Downloads" / "final_dataset" / "data.yaml"

# Training output inside the repository
PROJECT = ROOT / "models" / "checkpoints"

# Name of this training run
RUN_NAME = "civicpulse_v2_yolo11m"

# Pretrained YOLO11 segmentation model
MODEL = "yolo11m-seg.pt"


# ============================================================
# TRAINING SETTINGS
# ============================================================

EPOCHS = 150
IMAGE_SIZE = 640
BATCH_SIZE = 16
PATIENCE = 30
WORKERS = 8
DEVICE = 0


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("CivicPulse YOLO11m-seg Training")
    print("=" * 60)

    # --------------------------------------------------------
    # Check dataset
    # --------------------------------------------------------

    print(f"\n[train] Repository : {ROOT}")
    print(f"[train] Dataset    : {DATA}")
    print(f"[train] Output     : {PROJECT / RUN_NAME}")

    if not DATA.exists():
        sys.exit(
            f"\n[train] ERROR: data.yaml not found:\n"
            f"         {DATA}\n\n"
            f"Make sure the dataset exists at:\n"
            f"         {DATA.parent}"
        )

    print("\n[train] Dataset found.")

    # --------------------------------------------------------
    # Check CUDA
    # --------------------------------------------------------

    import torch

    if not torch.cuda.is_available():
        sys.exit(
            "\n[train] ERROR: CUDA GPU not available.\n"
            "This training run is intended for the RTX GPU."
        )

    print(f"[train] GPU        : {torch.cuda.get_device_name(0)}")
    print(f"[train] CUDA       : {torch.version.cuda}")

    # --------------------------------------------------------
    # Create output directory
    # --------------------------------------------------------

    PROJECT.mkdir(parents=True, exist_ok=True)

    RUN_DIR = PROJECT / RUN_NAME

    if RUN_DIR.exists():
        sys.exit(
            f"\n[train] ERROR: Training folder already exists:\n"
            f"         {RUN_DIR}\n\n"
            f"Delete/rename it before starting another run."
        )

    # --------------------------------------------------------
    # Configuration summary
    # --------------------------------------------------------

    print("\n[train] Configuration")
    print("-" * 60)
    print(f"Model       : {MODEL}")
    print(f"Epochs      : {EPOCHS}")
    print(f"Image size  : {IMAGE_SIZE}")
    print(f"Batch size  : {BATCH_SIZE}")
    print(f"Patience    : {PATIENCE}")
    print(f"Workers     : {WORKERS}")
    print(f"Device      : CUDA:{DEVICE}")
    print(f"Output      : {RUN_DIR}")
    print("-" * 60)

    # --------------------------------------------------------
    # Load pretrained YOLO11m-seg
    # --------------------------------------------------------

    print("\n[train] Loading YOLO11m-seg...")

    # If yolo11m-seg.pt is not already available,
    # Ultralytics will download the pretrained weights.
    model = YOLO(MODEL)

    print("[train] Model loaded successfully.")

    # --------------------------------------------------------
    # Train
    # --------------------------------------------------------

    print("\n[train] Starting training...\n")

    model.train(

        # Dataset
        data=str(DATA.resolve()),

        # Training
        epochs=EPOCHS,
        imgsz=IMAGE_SIZE,
        batch=BATCH_SIZE,
        device=DEVICE,

        # Early stopping
        patience=PATIENCE,

        # Windows dataloader
        workers=WORKERS,

        # Reproducibility
        seed=42,
        deterministic=True,

        # Performance
        amp=True,
        cache="disk",

        # Validation / plots
        val=True,
        plots=True,

        # Output
        project=str(PROJECT.resolve()),
        name=RUN_NAME,
        exist_ok=False,

        # ----------------------------------------------------
        # Augmentation
        # ----------------------------------------------------

        degrees=30.0,
        translate=0.12,
        scale=0.55,
        shear=2.0,
        perspective=0.0006,

        flipud=0.1,
        fliplr=0.5,

        mosaic=1.0,
        close_mosaic=10,

        mixup=0.1,
        copy_paste=0.1,
        erasing=0.2,

        hsv_h=0.015,
        hsv_s=0.9,
        hsv_v=0.55,

        auto_augment="randaugment",
    )

    # --------------------------------------------------------
    # Check best model
    # --------------------------------------------------------

    best = RUN_DIR / "weights" / "best.pt"
    last = RUN_DIR / "weights" / "last.pt"

    if not best.exists():
        sys.exit(
            f"\n[train] ERROR: best.pt was not created.\n"
            f"Check training output:\n{RUN_DIR}"
        )

    print("\n" + "=" * 60)
    print("Training completed successfully")
    print("=" * 60)

    print(f"\n[train] Best model:")
    print(f"         {best}")

    print(f"\n[train] Last model:")
    print(f"         {last}")

    # --------------------------------------------------------
    # Final validation
    # --------------------------------------------------------

    print("\n[train] Running final validation on best.pt...\n")

    best_model = YOLO(str(best))

    best_model.val(
        data=str(DATA.resolve()),
        imgsz=IMAGE_SIZE,
        device=DEVICE,
        split="val",
        plots=True,
    )

    # --------------------------------------------------------
    # Copy best model to production
    # --------------------------------------------------------

    production = ROOT / "models" / "production"
    production.mkdir(parents=True, exist_ok=True)

    production_model = production / "best_v2.pt"

    shutil.copy2(best, production_model)

    print("\n" + "=" * 60)
    print("CivicPulse training finished")
    print("=" * 60)

    print(f"\nTraining results:")
    print(f"  {RUN_DIR}")

    print(f"\nBest checkpoint:")
    print(f"  {best}")

    print(f"\nProduction checkpoint:")
    print(f"  {production_model}")

    print("\nImportant files to inspect:")
    print(f"  {RUN_DIR / 'results.csv'}")
    print(f"  {RUN_DIR / 'results.png'}")
    print(f"  {RUN_DIR / 'confusion_matrix.png'}")
    print(f"  {RUN_DIR / 'confusion_matrix_normalized.png'}")

    print("\nDone.")


if __name__ == "__main__":
    main()

# from pathlib import Path
# from ultralytics import YOLO


# ROOT = Path(__file__).resolve().parents[1]

# MODEL = "yolov8s-seg.pt"

# DATA = str(
#     Path.home()
#     / "Downloads"
#     / "civicpulse_yolo-20260903T172512Z-1-001"
#     / "civicpulse_yolo"
#     / "data.yaml"
# )

# PROJECT = str(ROOT / "models" / "checkpoints")


# if __name__ == "__main__":
#     print("[AI Engine] Starting CivicPulse YOLOv8-Seg training...")

#     model = YOLO(MODEL)

#     model.train(
#         data=DATA,

#         epochs=200,
#         imgsz=1024,
#         batch=4,
#         device=0,
#         workers=4,
#         patience=30,

#         project=PROJECT,
#         name="civicpulse_v1_5class",
#         exist_ok=False,

#         pretrained=True,
#         amp=True,
#         plots=True,
#         save=True,
#     )

#     print("\n[SUCCESS] Training complete!")
#     print(
#         f"Training output: "
#         f"{PROJECT}\\civicpulse_v1_5class"
#     )

# from ultralytics import YOLO

# model = YOLO("yolo8s-seg.pt")

# if __name__ == '__main__':
#     print("[AI Engine] Restarting with AutoBatch (batch=-1) to maximize RTX 5070 VRAM...")
#     results = model.train(
#         data="unified_4class_dataset/data.yaml",
#         epochs=300,               # Total target epochs
#         imgsz=640,
#         batch=24,                 # Batch: pushes your 5070 to absolute max capacity safely
#         device=0,
#         workers=4,
#         patience=25,
#         name="civicpulse_4class_max", # Keeps writing to your existing run folder
#         exist_ok=True             # Overwrites/appends safely to the same run directory
#     )
#     print("\n[SUCCESS] Training resumed at maximum capacity!")