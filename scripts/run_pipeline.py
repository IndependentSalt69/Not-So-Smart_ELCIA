import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.detection.video_tracker import HazardVideoPipeline

def main():
    # Update this to your demo video's path
    video_path = "data/sample/test_video.mov" 

    pipeline = HazardVideoPipeline(
        weights_path="models/production/civicpulse_best.pt",
        output_dir="outputs"
    )
    
    pipeline.process_video(
        video_path=video_path,
        output_video_path="outputs/demo_tracked_output.mp4"
    )

if __name__ == "__main__":
    main()