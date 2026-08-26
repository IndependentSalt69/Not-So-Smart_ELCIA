"""
src/detection/depth_estimator.py
High-precision depth estimation using DPT_Large.
"""
import torch
import cv2
import numpy as np

class DepthEstimator:
    def __init__(self, model_type="DPT_Large", device=None):
        print(f"[AI Engine] Loading {model_type} Depth Model...")
        
        if device is not None:
            self.device = torch.device(device)
            print(f"[AI Engine] Using specified device: {self.device}")
        elif torch.cuda.is_available():
            self.device = torch.device("cuda")
            print("[AI Engine] Using NVIDIA CUDA Acceleration.")
        elif torch.backends.mps.is_available():
            self.device = torch.device("mps")
            print("[AI Engine] Using Apple Silicon MPS Acceleration.")
        else:
            self.device = torch.device("cpu")
            print("[AI Engine] Warning: Using CPU for depth estimation (this will be slow).")

            
        # Load high-precision DPT model
        self.midas = torch.hub.load("intel-isl/MiDaS", model_type, trust_repo=True)
        self.midas.to(self.device)
        self.midas.eval()
        
        # Load corresponding DPT transforms
        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
        self.transform = midas_transforms.dpt_transform

    def estimate_depth(self, frame: np.ndarray) -> np.ndarray:
        """Returns a normalized relative depth map (0-255)."""
        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        input_batch = self.transform(img).to(self.device)

        with torch.no_grad():
            prediction = self.midas(input_batch)
            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=frame.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze()

        output = prediction.cpu().numpy()
        
        # Normalize to 0-255
        depth_min = output.min()
        depth_max = output.max()
        if depth_max - depth_min > 0:
            output = (output - depth_min) / (depth_max - depth_min)
        else:
            output = np.zeros_like(output)
            
        return (output * 255).astype(np.uint8)