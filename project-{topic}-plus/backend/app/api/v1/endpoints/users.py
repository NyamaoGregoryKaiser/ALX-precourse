```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_active_user
from app.schemas.user import UserPublic, UserUpdate
from app.models.user import User # Import the ORM model User
from app.crud.user import crud_user # Import CRUD operations for User

router = APIRouter()

@router.get("/", response_model=List[UserPublic])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user) # Requires authentication
):
    """
    Retrieve multiple users.
    (Requires authentication)
    """
    users = await crud_user.get_multi(db, skip=skip, limit=limit)
    return [UserPublic.model_validate(user) for user in users]

@router.get("/me", response_model=UserPublic)
async def read_users_me(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current active user's details.
    (Requires authentication)
    """
    return UserPublic.model_validate(current_user)


@router.patch("/me", response_model=UserPublic)
async def update_user_me(
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update current active user's details.
    (Requires authentication)
    """
    updated_user = await crud_user.update(db, db_obj=current_user, obj_in=user_in)
    return UserPublic.model_validate(updated_user)


@router.get("/{user_id}", response_model=UserPublic)
async def read_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user) # Requires authentication
):
    """
    Retrieve a specific user by ID.
    (Requires authentication)
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserPublic.model_validate(user)
```