```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from backend.app.core.database import get_db
from backend.app.schemas.user import User, UserUpdate
from backend.app.crud.user import user as crud_user
from backend.app.api.dependencies import get_current_active_user
from backend.app.core.logger import app_logger

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=User)
async def read_current_user(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current active user's profile.
    """
    return current_user

@router.put("/me", response_model=User)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current active user's profile.
    """
    app_logger.info(f"Attempting to update user {current_user.id} profile.")
    try:
        updated_user = await crud_user.update(db, db_obj=current_user, obj_in=user_in)
        app_logger.info(f"User {current_user.id} profile updated successfully.")
        return updated_user
    except Exception as e:
        app_logger.exception(f"Failed to update user {current_user.id} profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update user profile."
        )

@router.get("/{user_id}", response_model=User)
async def read_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user) # Only authenticated users can view others
):
    """
    Get a user by ID.
    """
    app_logger.info(f"Fetching user with ID: {user_id} by user {current_user.id}")
    db_user = await crud_user.get(db, id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.get("/", response_model=List[User])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve multiple users.
    """
    app_logger.info(f"Fetching users list (skip={skip}, limit={limit}) by user {current_user.id}")
    users = await crud_user.get_multi(db, skip=skip, limit=limit)
    return users
```