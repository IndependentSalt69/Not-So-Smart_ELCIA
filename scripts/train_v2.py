"""
scripts/train_v2.py
Trains a production-grade model locally on Apple Silicon.
"""
from roboflow import Roboflow
from ultralytics import YOLO
import os
from dotenv import load_dotenv

# Load secret variables from the local .env file
load_dotenv()
api_key = os.getenv("ROBOFLOW_API_KEY")

def main():
    print("[INFO] Connecting to Roboflow...")
    rf = Roboflow(api_key=api_key)
    project = rf.workspace("pothole-ipd").project("ipd-pothole-detection-2")
    version = project.version(4)
    
    print("[INFO] Downloading massive dataset...")
    dataset = version.download("yolov8")

    print("[INFO] Initializing YOLOv8 Segmentation Model...")
    model = YOLO('yolov8s-seg.pt') 

    print("[INFO] Starting Deep Training on M4 Pro...")
    results = model.train(
        data=f"{dataset.location}/data.yaml",
        epochs=300,           # Let it train until it's perfect
        imgsz=640,
        batch=32,             # Increased batch size because you have 48GB of RAM!
        patience=25,          # Will automatically stop when accuracy peaks
        device="mps",         # Use Apple Silicon GPU
        name='civicpulse_v2_model'
    )
    
    print("[INFO] Training Complete! Best weights saved in runs/segment/civicpulse_v2_model/weights/best.pt")

if __name__ == "__main__":
    main()