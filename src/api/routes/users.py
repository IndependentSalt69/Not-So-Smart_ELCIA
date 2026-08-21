"""
src/api/routes/users.py
User management REST API endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from src.api.dependencies import get_db
from src.db.models.enums import UserRole
from src.schemas.user import UserCreate, UserResponse
from src.repositories import (
    create_user,
    get_user as repo_get_user,
    list_users as repo_list_users,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/",
    summary="Create user",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
)
def create_new_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Create a new system user or dispatcher operator."""
    try:
        user = create_user(
            db=db,
            name=payload.name,
            email=payload.email,
            role=payload.role,
            is_active=payload.is_active,
        )
        return user
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{payload.email}' already exists.",
        )


@router.get(
    "/",
    summary="List users",
    status_code=status.HTTP_200_OK,
    response_model=List[UserResponse],
)
def list_all_users(
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
) -> List[UserResponse]:
    """List users with optional role and status filtering."""
    return repo_list_users(db=db, role=role, is_active=is_active, skip=skip, limit=limit)


@router.get(
    "/{user_id}",
    summary="Get user details",
    status_code=status.HTTP_200_OK,
    response_model=UserResponse,
)
def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Get details for a system user by ID or email."""
    user = repo_get_user(db=db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )
    return user
