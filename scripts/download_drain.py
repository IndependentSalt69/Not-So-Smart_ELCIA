from roboflow import Roboflow
import os
from dotenv import load_dotenv

# Load secret variables from the local .env file
load_dotenv()
api_key = os.getenv("ROBOFLOW_API_KEY")

# Initialize Roboflow safely using the environment variable
rf = Roboflow(api_key=api_key)

# Create the folder and move into it
os.makedirs("data_raw/drain_overflow_dataset", exist_ok=True)
os.chdir("data_raw/drain_overflow_dataset")

# Download drainage overflow dataset
project = rf.workspace("chaitanya-kharche").project("drain-overflow")
version = project.version(1)
dataset = version.download("yolov8")

print(f"Drainage dataset downloaded to: {dataset.location}")