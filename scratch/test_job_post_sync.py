import requests
import time
import sys

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
    print("Posting job to FastAPI...", flush=True)
    res = requests.post(url, files=files, data=data)
    print("Post status:", res.status_code, flush=True)
    print("Post response:", res.json(), flush=True)
    job_id = res.json()["job_id"]

for i in range(30):
    time.sleep(1)
    status_res = requests.get(f"{url}/{job_id}").json()
    print(f"[{i+1}s] Status: {status_res['status']} | Stage: {status_res['current_stage']} | Hazards: {status_res['hazards_detected']}", flush=True)
    if status_res["status"] in ["COMPLETED", "FAILED"]:
        print("FINAL STATUS RESPONSE:", status_res, flush=True)
        break
