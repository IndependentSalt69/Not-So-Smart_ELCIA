import requests
import time

url = "http://127.0.0.1:8000/api/v1/process"

video_path = "data_raw/full_demo_video.mp4"
srt_path = "data_raw/full_demo_video.srt"

with open(video_path, "rb") as vf, open(srt_path, "rb") as sf:
    files = {
        "video": ("full_demo_video.mp4", vf, "video/mp4"),
        "srt": ("full_demo_video.srt", sf, "text/plain"),
    }
    data = {
        "zone_id": "EC-01",
        "drone_id": "DRONE-ALPHA-01",
    }
    print("Posting real job with full_demo_video.mp4 & full_demo_video.srt...")
    res = requests.post(url, files=files, data=data)
    print("Post status:", res.status_code)
    print("Post response:", res.json())
    job_id = res.json()["job_id"]

start_t = time.time()
while True:
    time.sleep(2)
    status_res = requests.get(f"{url}/{job_id}").json()
    elapsed = time.time() - start_t
    print(f"[{elapsed:.1f}s] Status: {status_res['status']} | Stage: {status_res['current_stage']} | Progress: {status_res['progress_pct']}% | Hazards: {status_res['hazards_detected']}")
    if status_res["status"] in ["COMPLETED", "FAILED"]:
        print("FINAL STATUS RESPONSE:", status_res)
        break
