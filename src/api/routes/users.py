"""
src/api/routes/users.py
User and dispatcher operations route endpoints skeleton.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/",
    summary="List users",
    status_code=status.HTTP_200_OK,
    response_model=List[Dict[str, Any]],
)
def list_users(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    List municipal command and dispatch operators.
    (Skeleton placeholder)
    """
    return []
