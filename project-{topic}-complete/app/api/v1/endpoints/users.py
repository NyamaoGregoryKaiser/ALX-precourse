```python
from typing import List
from uuid import UUID

from fastapi import APIRouter, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.crud.user import user as crud_user
from app.dependencies import CurrentUser, CurrentSuperUser, DBSession
from app.schemas.user import User, UserCreate, UserUpdate, UserPublic

router = APIRouter()


@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED, summary="Create new user (admin only)")
async def create_user(
    *,
    db: DBSession,
    user_in: UserCreate,
    current_superuser: CurrentSuperUser, # Requires admin role
) -> User:
    """
    Create new user.
    """
    new_user = await crud_user.create(db, obj_in=user_in)
    return new_user


@router.get("/", response_model=List[UserPublic], summary="Get all users (admin only)")
async def read_users(
    db: DBSession,
    skip: int = 0,
    limit: int = 100,
    current_superuser: CurrentSuperUser, # Requires admin role
) -> List[UserPublic]:
    """
    Retrieve users.
    """
    users = await crud_user.get_multi(db, skip=skip, limit=limit)
    return users


@router.get("/me", response_model=User, summary="Get current user profile")
async def read_user_me(
    current_user: CurrentUser,
) -> User:
    """
    Get current user profile.
    """
    return current_user


@router.put("/me", response_model=User, summary="Update current user profile")
async def update_user_me(
    db: DBSession,
    user_in: UserUpdate,
    current_user: CurrentUser,
) -> User:
    """
    Update current user.
    """
    updated_user = await crud_user.update(db, db_obj=current_user, obj_in=user_in)
    return updated_user


@router.get("/{user_id}", response_model=UserPublic, summary="Get user by ID (admin only)")
async def read_user_by_id(
    user_id: UUID,
    db: DBSession,
    current_superuser: CurrentSuperUser, # Requires admin role
) -> UserPublic:
    """
    Get a specific user by ID.
    """
    user = await crud_user.get(db, user_id)
    if not user:
        raise NotFoundException(detail="User not found")
    return user


@router.put("/{user_id}", response_model=User, summary="Update user by ID (admin only)")
async def update_user(
    *,
    db: DBSession,
    user_id: UUID,
    user_in: UserUpdate,
    current_superuser: CurrentSuperUser, # Requires admin role
) -> User:
    """
    Update a user.
    """
    user = await crud_user.get(db, user_id)
    if not user:
        raise NotFoundException(detail="User not found")
    updated_user = await crud_user.update(db, db_obj=user, obj_in=user_in)
    return updated_user


@router.delete("/{user_id}", response_model=UserPublic, summary="Delete user by ID (admin only)")
async def delete_user(
    user_id: UUID,
    db: DBSession,
    current_superuser: CurrentSuperUser, # Requires admin role
) -> UserPublic:
    """
    Delete a user.
    """
    user = await crud_user.get(db, user_id)
    if not user:
        raise NotFoundException(detail="User not found")
    await crud_user.remove(db, id=user_id)
    return user
```