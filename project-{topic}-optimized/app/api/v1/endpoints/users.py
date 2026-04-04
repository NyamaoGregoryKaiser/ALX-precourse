import logging
from typing import List

from fastapi import APIRouter, Depends, status, Query, HTTPException
from fastapi_limiter.depends import RateLimiter
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, UserRole
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.pagination import PaginatedResponse
from app.services.user_service import UserService
from app.utils.security import get_current_active_user, get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[UserResponse],
            dependencies=[Depends(RateLimiter(times=10, seconds=60))], # 10 requests per minute
            summary="Get all users",
            description="Retrieve a paginated list of all users. Requires admin privileges.")
async def read_users(
    skip: int = Query(0, ge=0, description="Number of items to skip (offset)."),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of items to return."),
    is_active: bool | None = Query(None, description="Filter users by active status."),
    role: UserRole | None = Query(None, description="Filter users by role (admin or user)."),
    current_admin_user: User = Depends(get_current_admin_user), # Admin access required
    user_service: UserService = Depends(lambda db=Depends(get_db): UserService(db))
):
    """
    Retrieve a paginated list of all users.
    Filters can be applied by `is_active` status and `role`.
    Only users with `admin` role can access this endpoint.
    """
    logger.info(f"Admin user {current_admin_user.email} accessing all users list.")
    users = await user_service.get_all_users(skip=skip, limit=limit, is_active=is_active, role=role)
    return users

@router.get("/{user_id}", response_model=UserResponse,
            dependencies=[Depends(RateLimiter(times=15, seconds=60))], # 15 requests per minute
            summary="Get user by ID",
            description="Retrieve a single user's details by ID. Can be self or any user if admin.")
async def read_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_active_user), # Any active user can access their own profile
    user_service: UserService = Depends(lambda db=Depends(get_db): UserService(db))
):
    """
    Retrieve details of a specific user by ID.
    A user can retrieve their own profile. An admin can retrieve any user's profile.
    """
    logger.info(f"User {current_user.email} attempting to retrieve user ID {user_id}.")
    if user_id == current_user.id:
        return current_user # Direct return if asking for self
    
    # Check if current user is admin to retrieve other users
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's profile"
        )
    
    # If admin, retrieve the requested user
    user = await user_service.get_user_by_id(user_id)
    return user

@router.put("/{user_id}", response_model=UserResponse,
            dependencies=[Depends(RateLimiter(times=10, seconds=60))], # 10 requests per minute
            summary="Update user by ID",
            description="Update details of a user. Can be self or any user if admin.")
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    user_service: UserService = Depends(lambda db=Depends(get_db): UserService(db))
):
    """
    Update details of a specific user.
    A user can update their own profile. An admin can update any user's profile.
    Non-admin users cannot change their own role or active/verified status.
    """
    logger.info(f"User {current_user.email} attempting to update user ID {user_id}.")
    updated_user = await user_service.update_user(user_id, user_in, current_user)
    return updated_user

@router.delete("/{user_id}", response_model=UserResponse,
            dependencies=[Depends(RateLimiter(times=5, seconds=300))], # 5 requests per 5 minutes
            summary="Delete user by ID",
            description="Delete a user. Requires admin privileges.")
async def delete_user(
    user_id: int,
    current_admin_user: User = Depends(get_current_admin_user), # Admin access required
    user_service: UserService = Depends(lambda db=Depends(get_db): UserService(db))
):
    """
    Delete a specific user by ID.
    Only users with `admin` role can delete users.
    An admin cannot delete their own account.
    """
    logger.info(f"Admin user {current_admin_user.email} attempting to delete user ID {user_id}.")
    deleted_user = await user_service.delete_user(user_id, current_admin_user)
    return deleted_user
```