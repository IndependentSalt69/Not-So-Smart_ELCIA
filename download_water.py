from roboflow import Roboflow
import os
from dotenv import load_dotenv

# Load secret variables from the local .env file
load_dotenv()
api_key = os.getenv("ROBOFLOW_API_KEY")

# Initialize Roboflow safely using the environment variable
rf = Roboflow(api_key=api_key)

# Make sure we download inside data_raw
os.chdir("data_raw")

# Download water segmentation dataset
project = rf.workspace("sahanaworkspace").project("water_seg")
version = project.version(1)
dataset = version.download("yolov8")

print(f"Waterlogging dataset downloaded to: {dataset.location}")