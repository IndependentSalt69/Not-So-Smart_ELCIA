import sys
from pathlib import Path
import torch

# Ensure project root is in sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.detection.video_tracker import HazardVideoPipeline

def main():
    # 1. Video & Telemetry Paths
    video_path = "data/samples/video_1.mp4"
    srt_path = "data/samples/video_1.srt"  # Change or set to None if you don't have an SRT

    # 2. Hardware Acceleration (MPS for Mac, CUDA for NVIDIA, fallback to CPU)
    if torch.cuda.is_available():
        device = "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"

    print(f"[RUNNER] Running inference on target device: {device}")

    # 3. Initialize Pipeline
    pipeline = HazardVideoPipeline(
        weights_path="models/production/best.pt",
        output_dir="outputs",
        srt_path=srt_path if Path(srt_path).exists() else None,
        device=device
    )
    
    # 4. Process Video
    pipeline.process_video(
        video_path=video_path,
        output_video_path="outputs/video_1_output.mp4"
    )

if __name__ == "__main__":
    main()