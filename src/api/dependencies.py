"""
src/api/dependencies.py
FastAPI common dependencies.
"""

from typing import Generator
from sqlalchemy.orm import Session

from src.db.session import get_db

# Re-export get_db for route dependency injection
__all__ = ["get_db"]
