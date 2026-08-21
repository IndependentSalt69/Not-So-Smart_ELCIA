"""
src/repositories/users.py
Repository functions for User entity management.
"""

import uuid
from typing import Optional, List, Union, Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models.user import User
from src.db.models.enums import UserRole


def parse_uuid(val: Union[uuid.UUID, str]) -> Optional[uuid.UUID]:
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except ValueError:
        return None


def create_user(
    db: Session,
    name: str,
    email: str,
    role: UserRole = UserRole.OPERATOR,
    is_active: bool = True,
) -> User:
    """Create a new system user."""
    user = User(
        name=name,
        email=email,
        role=role,
        is_active=is_active,
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise


def get_user(db: Session, user_id: Union[uuid.UUID, str]) -> Optional[User]:
    """Get user by primary key UUID or email."""
    uid = parse_uuid(user_id)
    if uid:
        stmt = select(User).where(User.id == uid)
        result = db.scalars(stmt).first()
        if result:
            return result
    # Fallback lookup by email
    stmt = select(User).where(User.email == str(user_id))
    return db.scalars(stmt).first()


def list_users(
    db: Session,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[User]:
    """List users with optional role and active status filtering."""
    stmt = select(User)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    stmt = stmt.offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


def update_user(
    db: Session,
    user_id: Union[uuid.UUID, str],
    **kwargs: Any,
) -> Optional[User]:
    """Update fields on an existing user."""
    user = get_user(db, user_id)
    if not user:
        return None

    try:
        for key, value in kwargs.items():
            if hasattr(user, key) and key not in ("id", "created_at"):
                setattr(user, key, value)
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise
