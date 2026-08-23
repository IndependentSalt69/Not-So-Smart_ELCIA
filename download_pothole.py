from roboflow import Roboflow
import os
from dotenv import load_dotenv

# Load secret variables from the local .env file
load_dotenv()
api_key = os.getenv("ROBOFLOW_API_KEY")

# Initialize Roboflow safely using the environment variable
rf = Roboflow(api_key=api_key)

# Ensure target folder exists under data_raw
os.makedirs("data_raw/pothole_dataset", exist_ok=True)
os.chdir("data_raw/pothole_dataset")

# Download pothole dataset
project = rf.workspace("pothole-ipd").project("ipd-pothole-detection-2")
version = project.version(4)
dataset = version.download("yolov8")

print(f"Pothole dataset downloaded to: {dataset.location}")