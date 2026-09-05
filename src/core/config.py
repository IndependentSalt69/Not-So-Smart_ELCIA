"""
src/core/config.py
Application and Database Configuration management using Pydantic Settings.
"""

from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL
import yaml
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application Settings
    APP_NAME: str = "CivicPulse API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS Settings
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            import json
            return json.loads(v)
        return v

    # PostgreSQL & PostGIS Settings
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "civicpulse_db"

    # SQLAlchemy 2.x Database URL constructed safely via URL.create()
    @property
    def DATABASE_URL(self) -> str:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            database=self.POSTGRES_DB,
        ).render_as_string(hide_password=False)

    # Storage Settings (Canonical absolute paths relative to PROJECT_ROOT)
    EVIDENCE_DIR: str = str(PROJECT_ROOT / "outputs" / "evidence")
    JOBS_DIR: str = str(PROJECT_ROOT / "outputs" / "jobs")
    PREDICTIONS_DIR: str = str(PROJECT_ROOT / "outputs" / "predictions")

settings = Settings()

# --- NEW: AI/ML Dynamic Configuration Loader ---
CONFIG_PATH = PROJECT_ROOT / "configs" / "config.yaml"

def load_app_config():
    # If the file doesn't exist yet, return an empty dict to prevent crashes
    if not CONFIG_PATH.exists():
        return {"classes": {}, "filters": {}}
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)

APP_CONFIG = load_app_config()