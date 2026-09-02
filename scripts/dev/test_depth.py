import sys
import cv2
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.detection.depth_estimator import DepthEstimator

def main():
    estimator = DepthEstimator()
    frame = cv2.imread("data/sample/depth_test.png")

    if frame is None:
        print("Error loading image!")
        return

    print("[INFO] Running Depth Estimation...")
    depth_map = estimator.estimate_depth(frame)

    depth_colormap = cv2.applyColorMap(depth_map, cv2.COLORMAP_MAGMA)
    cv2.imwrite("outputs/predictions/depth_test.jpg", depth_colormap)
    print("[INFO] Saved depth map to outputs/predictions/depth_test.jpg")

if __name__ == "__main__":
    main()