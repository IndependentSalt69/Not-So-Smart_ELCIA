import cv2
import numpy as np
from pathlib import Path
import random

img_dir = Path("unified_4class_dataset/train/images")
lbl_dir = Path("unified_4class_dataset/train/labels")
out_dir = Path("sanity_check_visuals")
out_dir.mkdir(exist_ok=True)

# Define your 4 classes and distinct colors for visualization
classes = {
    0: ("Waterlogging", (255, 0, 0)),     # Blue
    1: ("Pothole", (0, 0, 255)),          # Red
    2: ("Drainage", (0, 255, 255)),       # Yellow
    3: ("Footpath", (0, 255, 0))          # Green
}

prefixes = ['water_', 'pothole_', 'drain_', 'footpath_']
sample_images = []

# Randomly select up to 3 images from each category
for pref in prefixes:
    images_for_class = list(img_dir.glob(f"{pref}*.*"))
    if images_for_class:
        sample_images.extend(random.sample(images_for_class, min(3, len(images_for_class))))

print("Generating visual sanity checks for all 4 classes...")

for img_path in sample_images:
    img = cv2.imread(str(img_path))
    if img is None: continue
    h, w = img.shape[:2]
    
    lbl_path = lbl_dir / f"{img_path.stem}.txt"
    if lbl_path.exists():
        with open(lbl_path, "r") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) < 5: continue
                
                cls_id = int(parts[0])
                name, color = classes.get(cls_id, ("Unknown", (255, 255, 255)))
                
                # Convert normalized coordinates back to pixels
                coords = [float(x) for x in parts[1:]]
                pts = np.array(coords).reshape(-1, 2)
                pts[:, 0] *= w
                pts[:, 1] *= h
                pts = pts.astype(np.int32)
                
                # Draw polygon and text
                cv2.polylines(img, [pts], isClosed=True, color=color, thickness=3)
                cv2.putText(img, name, (pts[0][0], max(20, pts[0][1] - 10)), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                
    cv2.imwrite(str(out_dir / img_path.name), img)

print(f"[SUCCESS] Saved balanced sample images to the '{out_dir}' folder!")