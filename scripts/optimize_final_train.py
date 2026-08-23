from ultralytics import YOLO

# Load your latest weights so you don't lose any learned progress
model = YOLO("runs/segment/civicpulse_4class_max-2/weights/last.pt")

if __name__ == '__main__':
    print("[AI Engine] Restarting with AutoBatch (batch=-1) to maximize RTX 5070 VRAM...")
    results = model.train(
        data="unified_4class_dataset/data.yaml",
        epochs=300,               # Total target epochs
        imgsz=640,
        batch=24,                 # AutoBatch: pushes your 5070 to absolute max capacity safely
        device=0,
        workers=4,
        patience=25,
        name="civicpulse_4class_max", # Keeps writing to your existing run folder
        exist_ok=True             # Overwrites/appends safely to the same run directory
    )
    print("\n[SUCCESS] Training resumed at maximum capacity!")