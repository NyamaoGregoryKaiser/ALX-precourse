from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user, get_current_active_admin
from app.crud.user import crud_user
from app.schemas.user import UserRead, UserUpdate, UserCreate
from app.models.user import User
from app.core.logger import logger

router = APIRouter()


@router.get("/", response_model=List[UserRead])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_admin), # Only admins can list users
) -> List[UserRead]:
    """
    Retrieve users. (Admin only)
    """
    users = await crud_user.get_multi(db, skip=skip, limit=limit)
    return [UserRead.model_validate(user) for user in users]


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(get_current_active_admin), # Only admins can create users
) -> UserRead:
    """
    Create new user. (Admin only)
    """
    user = await crud_user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this username already exists in the system.",
        )
    user_created = await crud_user.create(db, obj_in=user_in)
    logger.info(f"Admin {current_user.email} created new user: {user_created.email}")
    return UserRead.model_validate(user_created)


@router.get("/me", response_model=UserRead)
async def read_user_me(
    current_user: User = Depends(get_current_active_user),
) -> UserRead:
    """
    Get current user.
    """
    return UserRead.model_validate(current_user)


@router.put("/me", response_model=UserRead)
async def update_user_me(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
) -> UserRead:
    """
    Update current user.
    """
    user_updated = await crud_user.update(db, db_obj=current_user, obj_in=user_in)
    logger.info(f"User {current_user.email} updated their profile.")
    return UserRead.model_validate(user_updated)


@router.get("/{user_id}", response_model=UserRead)
async def read_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_admin), # Only admins can read other users
) -> UserRead:
    """
    Get a specific user by ID. (Admin only)
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserRead.model_validate(user)


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_admin), # Only admins can update other users
) -> UserRead:
    """
    Update a user. (Admin only)
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The user with this username does not exist in the system",
        )
    user_updated = await crud_user.update(db, db_obj=user, obj_in=user_in)
    logger.info(f"Admin {current_user.email} updated user: {user_updated.email}")
    return UserRead.model_validate(user_updated)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_active_admin), # Only admins can delete users
) -> None:
    """
    Delete a user. (Admin only)
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account"
        )
    await crud_user.remove(db, id=user_id)
    logger.info(f"Admin {current_user.email} deleted user with ID: {user_id}")
```

#### `app/api/v1/endpoints/services.py`
```python