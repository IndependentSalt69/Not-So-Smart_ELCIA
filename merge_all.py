import os
import json
import shutil
from pathlib import Path

# 1. Source directories
water_dir = Path("data_raw/waterlogging_dataset")
pothole_dir = Path("data_raw/pothole_dataset")
drain_dir = Path("data_raw/drain_overflow_dataset")
kaggle_dir = Path("data_raw/kaggle_cracks/data")

unified_dir = Path("unified_4class_dataset")

# 2. Reset / clean target directory to remove any old cached files
if unified_dir.exists():
    shutil.rmtree(unified_dir)

for split in ["train", "valid", "test"]:
    (unified_dir / split / "images").mkdir(parents=True, exist_ok=True)
    (unified_dir / split / "labels").mkdir(parents=True, exist_ok=True)

def get_split_dir(base_dir, split):
    if not base_dir.exists(): return None
    if (base_dir / split).exists(): return base_dir / split
    for subdir in base_dir.iterdir():
        if subdir.is_dir() and (subdir / split).exists():
            return subdir / split
    return None

def convert_line_to_seg(parts, target_class_id):
    """Guarantees every line has valid polygon segment format."""
    if len(parts) == 5:
        # Convert standard bbox (xc, yc, w, h) to 4-point polygon (x1 y1 x2 y2 x3 y3 x4 y4)
        xc, yc, w, h = map(float, parts[1:])
        x1, y1 = max(0.0, xc - w/2), max(0.0, yc - h/2)
        x2, y2 = min(1.0, xc + w/2), max(0.0, yc - h/2)
        x3, y3 = min(1.0, xc + w/2), min(1.0, yc + h/2)
        x4, y4 = max(0.0, xc - w/2), min(1.0, yc + h/2)
        return f"{target_class_id} {x1:.6f} {y1:.6f} {x2:.6f} {y2:.6f} {x3:.6f} {y3:.6f} {x4:.6f} {y4:.6f}"
    elif len(parts) >= 7 and len(parts) % 2 == 1:
        # Already a polygon (class + 2N coordinates)
        parts[0] = str(target_class_id)
        return " ".join(parts)
    return None

def process_coco_seg(source_dir, target_class_id, prefix):
    for split in ["train", "valid", "test", "val"]:
        split_dir = get_split_dir(source_dir, split)
        if not split_dir: continue
        
        target_split = "valid" if split == "val" else split
        json_file = split_dir / "_annotations.coco.json"
        
        if not json_file.exists():
            jsons = list(split_dir.glob("*.json"))
            if jsons: json_file = jsons[0]
            else: continue

        with open(json_file, "r") as f:
            coco_data = json.load(f)

        img_map = {img["id"]: img for img in coco_data.get("images", [])}
        ann_map = {}
        for ann in coco_data.get("annotations", []):
            ann_map.setdefault(ann["image_id"], []).append(ann)

        for img_id, img_info in img_map.items():
            img_filename = img_info["file_name"]
            src_img_path = split_dir / img_filename
            if not src_img_path.exists(): continue

            dest_img_name = f"{prefix}_{img_filename}"
            lbl_lines = []

            for ann in ann_map.get(img_id, []):
                seg = ann.get("segmentation", [])
                if not seg:
                    # If bbox only in COCO, fallback to bbox bbox conversion
                    bbox = ann.get("bbox", [])
                    if len(bbox) == 4:
                        x, y, w, h = bbox
                        xc, yc = (x + w/2) / img_info['width'], (y + h/2) / img_info['height']
                        norm_w, norm_h = w / img_info['width'], h / img_info['height']
                        line = convert_line_to_seg([0, xc, yc, norm_w, norm_h], target_class_id)
                        if line: lbl_lines.append(line)
                    continue

                for poly in seg:
                    if len(poly) < 6: continue
                    norm_poly = [f"{max(0.0, min(1.0, poly[i] / img_info['width'])):.6f}" if i%2==0 else 
                                 f"{max(0.0, min(1.0, poly[i] / img_info['height'])):.6f}" for i in range(len(poly))]
                    lbl_lines.append(f"{target_class_id} {' '.join(norm_poly)}")

            if lbl_lines:
                shutil.copy(src_img_path, unified_dir / target_split / "images" / dest_img_name)
                with open(unified_dir / target_split / "labels" / f"{Path(dest_img_name).stem}.txt", "w") as f_out:
                    f_out.write("\n".join(lbl_lines) + "\n")

def process_generic_yolo(source_dir, target_class_id, prefix, is_flat=False, filter_class=None):
    if is_flat:
        lbl_src_dir, img_src_dir = source_dir / "labels-YOLO", source_dir / "images"
        if not lbl_src_dir.exists() or not img_src_dir.exists(): return
        
        for lbl_file in lbl_src_dir.glob("*.txt"):
            if "README" in lbl_file.name: continue
            img_file = next((img_src_dir / f"{lbl_file.stem}{ext}" for ext in [".jpg", ".png", ".jpeg", ".JPG"]), None)
            if not img_file or not img_file.exists(): continue
                
            unique_name = f"{prefix}_{lbl_file.stem}"
            valid_lines = []
            with open(lbl_file, "r") as f_in:
                for line in f_in:
                    parts = line.strip().split()
                    if not parts: continue
                    if filter_class is not None and parts[0] != str(filter_class): continue
                    seg_line = convert_line_to_seg(parts, target_class_id)
                    if seg_line: valid_lines.append(seg_line)
            
            if valid_lines:
                shutil.copy(img_file, unified_dir / "train" / "images" / f"{unique_name}{img_file.suffix}")
                with open(unified_dir / "train" / "labels" / f"{unique_name}.txt", "w") as f_out:
                    f_out.write("\n".join(valid_lines) + "\n")
    else:
        for split in ["train", "valid", "test", "val"]:
            split_dir = get_split_dir(source_dir, split)
            if not split_dir: continue
            
            lbl_src_dir, img_src_dir = split_dir / "labels", split_dir / "images"
            if not lbl_src_dir.exists(): continue
            target_split = "valid" if split == "val" else split
            
            for lbl_file in lbl_src_dir.glob("*.txt"):
                if "README" in lbl_file.name: continue
                img_file = next((img_src_dir / f"{lbl_file.stem}{ext}" for ext in [".jpg", ".png", ".jpeg", ".JPG"]), None)
                if not img_file or not img_file.exists(): continue
                    
                unique_name = f"{prefix}_{lbl_file.stem}"
                valid_lines = []
                with open(lbl_file, "r") as f_in:
                    for line in f_in:
                        parts = line.strip().split()
                        if not parts: continue
                        seg_line = convert_line_to_seg(parts, target_class_id)
                        if seg_line: valid_lines.append(seg_line)
                
                if valid_lines:
                    shutil.copy(img_file, unified_dir / target_split / "images" / f"{unique_name}{img_file.suffix}")
                    with open(unified_dir / target_split / "labels" / f"{unique_name}.txt", "w") as f_out:
                        f_out.write("\n".join(valid_lines) + "\n")

# 3. Execute All
print("1/4 Merging Waterlogging (COCO Segmentation) -> Class 0...")
process_coco_seg(water_dir, 0, "water")

print("2/4 Merging Potholes -> Class 1...")
process_generic_yolo(pothole_dir, 1, "pothole")

print("3/4 Merging Drainage Overflow -> Class 2...")
process_generic_yolo(drain_dir, 2, "drain")

print("4/4 Merging Damaged Footpaths (Kaggle) -> Class 3...")
process_generic_yolo(kaggle_dir, 3, "footpath", is_flat=True, filter_class=1)

# 4. Generate data.yaml
yaml_content = f"""path: {unified_dir.resolve().as_posix()}
train: train/images
val: valid/images
test: test/images

nc: 4
names: ['waterlogging', 'pothole', 'drainage_overflow', 'damaged_footpath']
"""
with open(unified_dir / "data.yaml", "w") as f:
    f.write(yaml_content)

print(f"\n[SUCCESS] Unified 4-class segmentation dataset created without any plain bboxes!")