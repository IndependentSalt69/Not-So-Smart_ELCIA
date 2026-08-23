from ultralytics import YOLO

# Load the pre-trained YOLOv8 small segmentation model
model = YOLO("yolov8s-seg.pt")

if __name__ == '__main__':
    print("Starting maximum-performance training on RTX 5070...")
    results = model.train(
        data="unified_4class_dataset/data.yaml",
        epochs=300,
        imgsz=640,
        batch=16,                 # Stable batch size for 12GB VRAM
        device=0,
        workers=4,
        patience=25,
        name="civicpulse_4class_max"
    )
    print("\n[SUCCESS] Training complete! Weights saved in runs/segment/civicpulse_4class_max/weights/best.pt")