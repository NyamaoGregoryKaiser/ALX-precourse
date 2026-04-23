```python
import logging
from typing import Any, List

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_limiter.depends import RateLimiter

from app.core.config import settings
from app.core.deps import get_db, CurrentUser, CurrentSuperuser
from app.core.exceptions import HTTPException400, HTTPException404
from app.core.cache import cache_1_minute
from app.crud.crud_user import crud_user
from app.schemas.user import User, UserCreate, UserUpdate
from app.schemas.msg import Msg

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[User], summary="Retrieve all users (Admin only)",
            dependencies=[Depends(RateLimiter(times=10, seconds=60))])
@cache_1_minute
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_superuser: CurrentSuperuser = Depends(), # Only superusers can access
) -> Any:
    """
    Retrieve users.
    """
    users = await crud_user.get_multi(db, skip=skip, limit=limit)
    logger.info(f"Superuser {current_superuser.email} retrieved {len(users)} users.")
    return users

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED, summary="Create new user (Admin only)")
async def create_user_by_admin(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    current_superuser: CurrentSuperuser = Depends(), # Only superusers can access
) -> Any:
    """
    Create new user by an admin.
    """
    user = await crud_user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException400(
            detail="The user with this username already exists in the system."
        )
    user = await crud_user.create(db, obj_in=user_in)
    logger.info(f"Superuser {current_superuser.email} created user: {user.email}")
    return user

@router.get("/me", response_model=User, summary="Get current user's profile")
async def read_user_me(
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Get current user.
    """
    logger.info(f"User {current_user.email} accessed their own profile.")
    return current_user

@router.put("/me", response_model=User, summary="Update current user's profile")
async def update_user_me(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserUpdate,
    current_user: CurrentUser = Depends(),
) -> Any:
    """
    Update own user.
    """
    if user_in.email and user_in.email != current_user.email:
        existing_user = await crud_user.get_by_email(db, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException400(detail="Email already registered")

    user = await crud_user.update(db, db_obj=current_user, obj_in=user_in)
    logger.info(f"User {user.email} updated their profile.")
    return user

@router.get("/{user_id}", response_model=User, summary="Retrieve user by ID (Admin only)",
            dependencies=[Depends(RateLimiter(times=5, seconds=60))])
async def read_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_superuser: CurrentSuperuser = Depends(), # Only superusers can access
) -> Any:
    """
    Get a specific user by ID.
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException404(detail="The user with this ID does not exist in the system.")
    logger.info(f"Superuser {current_superuser.email} retrieved user with ID: {user_id}")
    return user

@router.put("/{user_id}", response_model=User, summary="Update user by ID (Admin only)")
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_superuser: CurrentSuperuser = Depends(), # Only superusers can access
) -> Any:
    """
    Update a user by an admin.
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException404(
            detail="The user with this ID does not exist in the system."
        )
    if user_in.email and user_in.email != user.email:
        existing_user = await crud_user.get_by_email(db, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException400(detail="Email already registered")

    user = await crud_user.update(db, db_obj=user, obj_in=user_in)
    logger.info(f"Superuser {current_superuser.email} updated user with ID: {user_id}")
    return user

@router.delete("/{user_id}", response_model=Msg, summary="Delete user by ID (Admin only)",
               status_code=status.HTTP_200_OK)
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    current_superuser: CurrentSuperuser = Depends(), # Only superusers can access
) -> Any:
    """
    Delete a user by an admin.
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException404(detail="User not found")
    await crud_user.remove(db, id=user_id)
    logger.info(f"Superuser {current_superuser.email} deleted user with ID: {user_id}")
    return Msg(message="User deleted successfully")
```