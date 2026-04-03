from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_active_superuser, get_current_active_user
from app.core.errors import DuplicateEntryException, NotFoundException
from app.crud.user import crud_user
from app.schemas.user import User, UserCreate, UserUpdate
from app.models.user import User as DBUser

router = APIRouter()

@router.get("/", response_model=List[User], summary="Retrieve all users (Superuser only)")
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: DBUser = Depends(get_current_active_superuser),
) -> Any:
    """
    Retrieve users. Requires superuser privileges.
    """
    users = await crud_user.get_multi(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED, summary="Create new user (Superuser only)")
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    current_user: DBUser = Depends(get_current_active_superuser),
) -> Any:
    """
    Create new user. Requires superuser privileges.
    """
    user = await crud_user.get_by_email(db, email=user_in.email)
    if user:
        raise DuplicateEntryException(detail="The user with this username already exists in the system.")
    user = await crud_user.create(db, obj_in=user_in)
    return user

@router.get("/me", response_model=User, summary="Retrieve current user's details")
async def read_user_me(
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Get current active user.
    """
    return current_user

@router.put("/me", response_model=User, summary="Update current user's details")
async def update_user_me(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserUpdate,
    current_user: DBUser = Depends(get_current_active_user),
) -> Any:
    """
    Update own user.
    """
    # Prevent regular users from changing superuser status
    if user_in.is_superuser is not None and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges to change superuser status.",
        )

    # Ensure email is not changed to an existing one by another user
    if user_in.email and user_in.email != current_user.email:
        existing_user = await crud_user.get_by_email(db, email=user_in.email)
        if existing_user:
            raise DuplicateEntryException(detail="This email is already registered by another user.")

    user = await crud_user.update(db, db_obj=current_user, obj_in=user_in)
    return user

@router.get("/{user_id}", response_model=User, summary="Retrieve user by ID (Superuser only)")
async def read_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_superuser),
) -> Any:
    """
    Get a specific user by ID. Requires superuser privileges.
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise NotFoundException(detail="User not found")
    return user

@router.put("/{user_id}", response_model=User, summary="Update user by ID (Superuser only)")
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: DBUser = Depends(get_current_active_superuser),
) -> Any:
    """
    Update a user. Requires superuser privileges.
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise NotFoundException(detail="User not found")

    # Ensure email is not changed to an existing one by another user
    if user_in.email and user_in.email != user.email:
        existing_user = await crud_user.get_by_email(db, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise DuplicateEntryException(detail="This email is already registered by another user.")

    user = await crud_user.update(db, db_obj=user, obj_in=user_in)
    return user

@router.delete("/{user_id}", response_model=User, summary="Delete user by ID (Superuser only)")
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    current_user: DBUser = Depends(get_current_active_superuser),
) -> Any:
    """
    Delete a user. Requires superuser privileges.
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise NotFoundException(detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own user account.",
        )
    user = await crud_user.remove(db, id=user_id)
    return user