import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.detection.video_tracker import HazardVideoPipeline

def main():
    # Update this to your demo video's path
    video_path = "data_raw/full_demo_video.mp4"

    pipeline = HazardVideoPipeline(
        weights_path="runs/segment/civicpulse_4class_max-2/weights/best.pt",
        output_dir="outputs",
        srt_path="data_raw/full_demo_video.srt"
    )
    
    pipeline.process_video(
        video_path=video_path,
        output_video_path="outputs/full_demo_tracked_output.mp4"
    )

if __name__ == "__main__":
    main()