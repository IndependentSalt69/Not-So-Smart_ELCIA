"""
scratch/verify_phase_11b_api.py
Verification script for Phase 11B FastAPI ML processing job endpoints.
Submits data_raw/full_demo_video.mp4 + data_raw/full_demo_video.srt and polls until completion.
"""

import time
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from src.api.main import app


def main():
    print("[1] Initializing FastAPI TestClient for Phase 11B verification...")
    client = TestClient(app)

    video_path = Path("data_raw/full_demo_video.mp4")
    srt_path = Path("data_raw/full_demo_video.srt")

    assert video_path.exists(), "Demo video missing"
    assert srt_path.exists(), "Demo SRT missing"

    print(f"[2] Submitting POST /api/v1/process with {video_path} and {srt_path}...")
    with open(video_path, "rb") as vf, open(srt_path, "rb") as sf:
        res = client.post(
            "/api/v1/process",
            files={
                "video": ("full_demo_video.mp4", vf, "video/mp4"),
                "srt": ("full_demo_video.srt", sf, "text/plain"),
            },
            data={
                "zone_id": "EC-01",
                "drone_id": "DRONE-SWARM-ALPHA-1",
            },
        )

    print(f"[+] Status Code: {res.status_code}")
    if res.status_code != 202:
        print(f"[-] Response detail: {res.json()}")
    assert res.status_code == 202, f"Expected 202 Accepted, got {res.status_code}: {res.text}"

    payload = res.json()
    job_id = payload["job_id"]
    print(f"[+] Job ID Created: {job_id}")
    assert payload["status"] == "QUEUED"

    print(f"[3] Polling GET /api/v1/process/{job_id} until COMPLETED...")
    poll_count = 0
    start_time = time.time()
    
    while True:
        poll_res = client.get(f"/api/v1/process/{job_id}")
        assert poll_res.status_code == 200
        data = poll_res.json()
        status = data["status"]
        elapsed = round(time.time() - start_time, 1)

        print(f"    [{elapsed}s] Poll #{poll_count+1}: Status={status}, Stage={data['current_stage']}, Hazards={data['hazards_detected']}")

        if status == "COMPLETED":
            print("\n[SUCCESS] Job finished with COMPLETED status!")
            print(f" - Hazards Detected: {data['hazards_detected']}")
            print(f" - Evidence Count: {data['evidence_count']}")
            print(f" - Output Video Path: {data['results']['output_video_path']}")
            print(f" - Telemetry File: {data['results']['telemetry_file']}")
            assert data["hazards_detected"] > 0
            assert data["evidence_count"] > 0
            assert Path(data["results"]["output_video_path"]).exists()
            assert Path(data["results"]["telemetry_file"]).exists()
            break
        elif status == "FAILED":
            print(f"\n[ERROR] Job failed: {data.get('error')}")
            sys.exit(1)

        time.sleep(3)
        poll_count += 1

if __name__ == "__main__":
    main()
