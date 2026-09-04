from pathlib import Path
from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]

MODEL = "yolov8s-seg.pt"

DATA = str(
    Path.home()
    / "Downloads"
    / "civicpulse_yolo-20260903T172512Z-1-001"
    / "civicpulse_yolo"
    / "data.yaml"
)

PROJECT = str(ROOT / "models" / "checkpoints")


if __name__ == "__main__":
    print("[AI Engine] Starting CivicPulse YOLOv8-Seg training...")

    model = YOLO(MODEL)

    model.train(
        data=DATA,

        epochs=200,
        imgsz=1024,
        batch=4,
        device=0,
        workers=4,
        patience=30,

        project=PROJECT,
        name="civicpulse_v1_5class",
        exist_ok=False,

        pretrained=True,
        amp=True,
        plots=True,
        save=True,
    )

    print("\n[SUCCESS] Training complete!")
    print(
        f"Training output: "
        f"{PROJECT}\\civicpulse_v1_5class"
    )

"""
from ultralytics import YOLO


MODEL = "yolov8s-seg.pt"
DATA = "C:/Users/MANAV/Downloads/civicpulse_yolo-20260903T172512Z-1-001/civicpulse_yolo/data.yaml"


if __name__ == "__main__":
    print("[AI Engine] Starting CivicPulse YOLOv8-Seg training...")

    model = YOLO(MODEL)

    results = model.train(
        data=DATA,

        epochs=2,
        imgsz=1024,
        batch=4,
        device=0,
        workers=4,
        patience=30,

        project="models/checkpoints",
        name="civicpulse_v1_5class",
        exist_ok=True,

        pretrained=True,
        amp=True,
        plots=True,
        save=True,
    )

    print("\n[SUCCESS] Training complete!")
    print(
        "Best model: "
        "models/checkpoints/civicpulse_v1_5class/weights/best.pt"
    )
    """

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