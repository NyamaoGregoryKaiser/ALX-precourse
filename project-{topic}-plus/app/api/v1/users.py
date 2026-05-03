```python
"""
API endpoints for managing users.

This module provides routes for retrieving, updating, and deleting user accounts.
It includes authorization checks to ensure only administrators or the user
themselves can access/modify their data.
"""

import logging
from typing import List, Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.schemas.user import UserRead, UserUpdate, UserRole
from app.services import user_service
from app.core.security import get_current_active_user, get_current_active_admin
from app.schemas.user import UserRead
from app.core.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get(
    "/users",
    response_model=List[UserRead],
    summary="List all users",
    description="Retrieves a list of all registered users. Requires admin privileges.",
)
@RateLimiter(times=10, seconds=60) # Allow 10 user list requests per minute from an IP
async def read_users(
    current_admin: Annotated[UserRead, Depends(get_current_active_admin)],
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=200, description="Maximum number of items to return"),
    search: Optional[str] = Query(None, description="Search term for user email or full name"),
):
    """
    Retrieves a paginated list of all users. Accessible only by administrators.

    Args:
        current_admin (UserRead): The authenticated admin user (dependency injection).
        skip (int): The number of records to skip for pagination.
        limit (int): The maximum number of records to return.
        search (Optional[str]): A search string to filter users by email or full name.

    Returns:
        List[UserRead]: A list of user details.
    """
    logger.info(f"Admin {current_admin.email} fetching all users with skip={skip}, limit={limit}, search='{search}'.")
    users = await user_service.get_users(skip=skip, limit=limit, search=search)
    logger.debug(f"Returned {len(users)} users to admin {current_admin.email}.")
    return users

@router.get(
    "/users/{user_id}",
    response_model=UserRead,
    summary="Get user by ID",
    description="Retrieves a single user by their ID. Accessible by admin or the user themselves."
)
@RateLimiter(times=10, seconds=60) # Allow 10 user detail requests per minute from an IP
async def read_user(
    user_id: int,
    current_user: Annotated[UserRead, Depends(get_current_active_user)]
):
    """
    Retrieves a single user by ID.

    Accessible by:
    - The user themselves (if user_id matches their ID).
    - An administrator.

    Args:
        user_id (int): The ID of the user to retrieve.
        current_user (UserRead): The authenticated user (dependency injection).

    Returns:
        UserRead: The user's details.

    Raises:
        HTTPException: If the user is not found or if the current user is not authorized.
    """
    logger.info(f"User {current_user.email} attempting to fetch user ID: {user_id}")
    user = await user_service.get_user_by_id(user_id)
    if not user:
        logger.warning(f"User with ID {user_id} not found by {current_user.email}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Authorization check: only admin or the user themselves can view this user
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        logger.warning(f"Unauthorized access attempt to user {user_id} by user {current_user.email}.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user's details"
        )
    logger.debug(f"User {user_id} retrieved by {current_user.email}.")
    return user

@router.put(
    "/users/{user_id}",
    response_model=UserRead,
    summary="Update a user",
    description="Updates an existing user's details. Accessible by admin or the user themselves."
)
@RateLimiter(times=5, seconds=60) # Allow 5 user updates per minute from an IP
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: Annotated[UserRead, Depends(get_current_active_user)]
):
    """
    Updates an existing user's details.

    Accessible by:
    - The user themselves (if user_id matches their ID).
    - An administrator.

    Args:
        user_id (int): The ID of the user to update.
        user_in (UserUpdate): The updated user data.
        current_user (UserRead): The authenticated user (dependency injection).

    Returns:
        UserRead: The updated user's details.

    Raises:
        HTTPException: If the user is not found, or if the current user is not authorized.
    """
    logger.info(f"User {current_user.email} attempting to update user ID: {user_id}")
    user = await user_service.get_user_by_id(user_id)
    if not user:
        logger.warning(f"User with ID {user_id} not found for update by {current_user.email}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Authorization check: only admin or the user themselves can update this user
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        logger.warning(f"Unauthorized update attempt to user {user_id} by user {current_user.email}.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user's details"
        )

    # Prevent non-admin users from changing their own role or active status
    if current_user.role != UserRole.ADMIN:
        if user_in.role is not None and user_in.role != user.role:
            logger.warning(f"Non-admin user {current_user.email} attempted to change role for user {user_id}.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to change user role")
        if user_in.is_active is not None and user_in.is_active != user.is_active:
             logger.warning(f"Non-admin user {current_user.email} attempted to change active status for user {user_id}.")
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to change user active status")

    updated_user = await user_service.update_user(user_id, user_in)
    logger.info(f"User ID {user_id} updated by {current_user.email}.")
    return updated_user

@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user",
    description="Deletes a user by ID. Requires admin privileges."
)
@RateLimiter(times=2, seconds=300) # Allow 2 user deletions per 5 minutes from an IP
async def delete_user(
    user_id: int,
    current_admin: Annotated[UserRead, Depends(get_current_active_admin)]
):
    """
    Deletes a user from the database. Accessible only by administrators.

    Args:
        user_id (int): The ID of the user to delete.
        current_admin (UserRead): The authenticated admin user (dependency injection).

    Raises:
        HTTPException: If the user is not found or if the current user is not an admin.
    """
    logger.info(f"Admin {current_admin.email} attempting to delete user ID: {user_id}")
    user = await user_service.get_user_by_id(user_id)
    if not user:
        logger.warning(f"User with ID {user_id} not found for deletion by admin {current_admin.email}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await user_service.delete_user(user_id)
    logger.info(f"User ID {user_id} deleted by admin {current_admin.email}.")
    # No content to return on successful deletion
    return

```