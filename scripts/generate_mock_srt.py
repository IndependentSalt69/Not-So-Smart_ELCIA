import datetime
from pathlib import Path

def generate_simulated_flight(duration_seconds: int, output_srt: str):
    """
    Generates a mock DJI SRT file simulating a drone flying over a road.
    """
    # Starting coordinates in Vadodara
    start_lat = 22.307200
    start_lon = 73.181200
    
    # How far the drone moves every second (approx 5 meters)
    lat_step = 0.000045 
    lon_step = 0.000020
    
    srt_content = ""
    
    for i in range(duration_seconds):
        # Calculate timestamps (e.g., 00:00:01,000 --> 00:00:02,000)
        start_time = str(datetime.timedelta(seconds=i)) + ",000"
        end_time = str(datetime.timedelta(seconds=i+1)) + ",000"
        
        # Format time to ensure leading zeros (0:00:01,000 -> 00:00:01,000)
        if len(start_time) < 12: start_time = "0" + start_time
        if len(end_time) < 12: end_time = "0" + end_time
        
        # Calculate moving coordinates
        current_lat = start_lat + (i * lat_step)
        current_lon = start_lon + (i * lon_step)
        
        # DJI standard metadata block
        metadata = (f"[iso : 100] [shutter : 1/120.0] [fnum : 280] "
                    f"[latitude: {current_lat:.6f}] [longitude: {current_lon:.6f}] "
                    f"[rel_alt: 15.000 abs_alt: 35.000]")
        
        # Construct SRT block
        srt_content += f"{i+1}\n"
        srt_content += f"{start_time} --> {end_time}\n"
        srt_content += f"{metadata}\n\n"
        
    # Save the file
    output_path = Path(output_srt)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        f.write(srt_content)
        
    print(f"[SUCCESS] Generated {duration_seconds} seconds of mock flight data at {output_srt}")

if __name__ == "__main__":
    # Let's say your demo internet video is x seconds long
    generate_simulated_flight(duration_seconds=32, output_srt="data_raw/demo_video.srt")