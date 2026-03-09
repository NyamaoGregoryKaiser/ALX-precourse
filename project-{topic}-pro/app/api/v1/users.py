from typing import List, Optional
from fastapi import APIRouter, status, Query
from app.schemas.user import UserResponse, UserUpdate
from app.crud.user import crud_user
from app.core.dependencies import DBSession, CurrentUser, CurrentAdminUser
from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
from app.core.logging_config import logger

"""
API Router for user-related endpoints.
Provides endpoints for retrieving and managing user information.
Some endpoints are restricted to administrators.
"""

router = APIRouter(prefix="/users", tags=["Users"])

@router.get(
    "/",
    response_model=List[UserResponse],
    summary="Get all users (Admin only)",
    description="Retrieves a list of all users in the system. Requires administrator privileges."
)
async def read_users(
    db: DBSession,
    current_admin_user: CurrentAdminUser, # Ensures only admin can access
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """
    Returns a list of all registered users.
    - **skip**: Number of records to skip for pagination.
    - **limit**: Maximum number of records to return.
    """
    logger.info(f"Admin user {current_admin_user.email} (ID: {current_admin_user.id}) requested all users.")
    users = await crud_user.get_all(db, skip=skip, limit=limit)
    return users

@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID",
    description="Retrieves a specific user by ID. Requires administrator privileges or ownership."
)
async def read_user_by_id(
    user_id: int,
    db: DBSession,
    current_user: CurrentUser # Any authenticated user can check their own ID
):
    """
    Returns a user by their ID.
    - **user_id**: The ID of the user to retrieve.
    """
    logger.debug(f"User {current_user.id} requested user ID {user_id}.")
    if user_id != current_user.id and not current_user.is_admin:
        logger.warning(f"User {current_user.id} attempted to access user {user_id}'s profile without permission.")
        raise ForbiddenException(detail="Not authorized to access this user's profile.")

    user = await crud_user.get(db, user_id)
    if not user:
        logger.warning(f"User with ID {user_id} not found.")
        raise NotFoundException(detail=f"User with ID {user_id} not found")
    return user

@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user details",
    description="Updates details for a specific user. Requires administrator privileges or ownership."
)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: DBSession,
    current_user: CurrentUser
):
    """
    Updates a user's information.
    - **user_id**: The ID of the user to update.
    - **user_update**: User details to update.
    """
    logger.info(f"User {current_user.id} attempting to update user {user_id}.")

    if user_id != current_user.id and not current_user.is_admin:
        logger.warning(f"User {current_user.id} attempted to update user {user_id}'s profile without permission.")
        raise ForbiddenException(detail="Not authorized to update this user's profile.")
    
    # Non-admin users cannot change 'is_admin' status
    if not current_user.is_admin and user_update.is_admin is not None:
        if user_update.is_admin != current_user.is_admin: # Check if attempting to change admin status
            logger.warning(f"User {current_user.id} attempted to change admin status for user {user_id}.")
            raise ForbiddenException(detail="Non-admin users cannot change administrator status.")

    db_user = await crud_user.get(db, user_id)
    if not db_user:
        logger.warning(f"User with ID {user_id} not found for update.")
        raise NotFoundException(detail=f"User with ID {user_id} not found")

    # If email is being updated, check for conflict
    if user_update.email and user_update.email != db_user.email:
        existing_user_with_new_email = await crud_user.get_by_email(db, user_update.email)
        if existing_user_with_new_email and existing_user_with_new_email.id != user_id:
            logger.warning(f"Email {user_update.email} already exists for another user during update of {user_id}.")
            raise BadRequestException(detail="Email already registered by another user.")

    updated_user = await crud_user.update(db, db_user, user_update)
    logger.info(f"User {current_user.id} successfully updated user {user_id}.")
    return updated_user

@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user (Admin only)",
    description="Deletes a user account. Requires administrator privileges."
)
async def delete_user(
    user_id: int,
    db: DBSession,
    current_admin_user: CurrentAdminUser # Ensures only admin can delete
):
    """
    Deletes a user by their ID.
    - **user_id**: The ID of the user to delete.
    """
    logger.info(f"Admin user {current_admin_user.id} attempting to delete user {user_id}.")

    if user_id == current_admin_user.id:
        logger.warning(f"Admin user {current_admin_user.id} attempted to delete their own account.")
        raise BadRequestException(detail="Admin cannot delete their own account via this endpoint.")

    user = await crud_user.get(db, user_id)
    if not user:
        logger.warning(f"Attempted to delete non-existent user with ID {user_id}.")
        raise NotFoundException(detail=f"User with ID {user_id} not found")
    
    await crud_user.delete(db, user_id)
    logger.info(f"Admin user {current_admin_user.id} successfully deleted user {user_id}.")
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
```

```