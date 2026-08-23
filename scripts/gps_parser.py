import re
from pathlib import Path

def parse_dji_srt(srt_path: str):
    """
    Extracts timestamps and GPS coordinates from DJI drone SRT sidecar files.
    Supports modern bracket formats and legacy formats.
    """
    srt_file = Path(srt_path)
    if not srt_file.exists():
        print(f"[ERROR] SRT file not found: {srt_path}")
        return []

    pattern_new = re.compile(r'\[latitude:\s*([\-\d\.]+)\].*?\[longitude:\s*([\-\d\.]+)\]')
    pattern_old = re.compile(r'GPS\s*\(([\-\d\.]+),\s*([\-\d\.]+)')
    
    gps_data = []
    
    with open(srt_file, 'r', encoding='utf-8') as f:
        blocks = f.read().strip().split('\n\n')
        
    for block in blocks:
        lines = block.split('\n')
        if len(lines) >= 3:
            timestamp_line = lines[1]
            metadata = " ".join(lines[2:])
            
            match = pattern_new.search(metadata) or pattern_old.search(metadata)
            
            if match:
                start_time = timestamp_line.split(" --> ")[0].strip()
                gps_data.append({
                    "time": start_time,
                    "lat": float(match.group(1)),
                    "lon": float(match.group(2))
                })
                
    return gps_data

if __name__ == "__main__":
    test_file = "data_raw/full_demo_video.srt"
    data = parse_dji_srt(test_file)
    print(f"Successfully extracted {len(data)} GPS points!")
    if data:
        print(f"Sample Point: Lat {data[0]['lat']}, Lon {data[0]['lon']} at {data[0]['time']}")