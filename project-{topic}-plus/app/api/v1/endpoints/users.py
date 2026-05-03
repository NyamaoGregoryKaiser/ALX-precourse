from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, UserCreate, UserUpdate
from app.schemas.user import User as DBUser, UserRole
from app.crud import users as crud_users
from app.dependencies.common import get_async_db_session, get_current_admin_dependency, get_current_user_dependency
from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from loguru import logger

router = APIRouter()

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED, summary="Create a new user")
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_admin_dependency) # Only admins can create users
):
    """
    Create a new user with all information.
    **Requires admin privileges.**
    """
    logger.info(f"Admin user {current_user.id} attempting to create a new user: {user_in.username}")
    try:
        user = await crud_users.create_user(db, user_in)
        return user
    except ConflictException as e:
        logger.warning(f"User creation failed due to conflict: {e.detail}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.detail)
    except Exception as e:
        logger.error(f"Error creating user {user_in.username}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("/", response_model=List[User], summary="Retrieve multiple users")
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_admin_dependency) # Only admins can list all users
):
    """
    Retrieve multiple users with pagination.
    **Requires admin privileges.**
    """
    logger.info(f"Admin user {current_user.id} retrieving list of users (skip={skip}, limit={limit}).")
    users = await crud_users.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/me", response_model=User, summary="Retrieve current user's profile")
async def read_user_me(
    current_user: DBUser = Depends(get_current_user_dependency)
):
    """
    Retrieve the profile of the current authenticated user.
    """
    logger.info(f"User {current_user.id} retrieving their own profile.")
    return current_user

@router.put("/me", response_model=User, summary="Update current user's profile")
async def update_user_me(
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_user_dependency)
):
    """
    Update the profile of the current authenticated user.
    Users can only update their own `full_name`, `email`, `username`, and `password`.
    `is_active` and `role` cannot be changed by the user themselves.
    """
    logger.info(f"User {current_user.id} attempting to update their own profile.")
    # Exclude fields that regular users shouldn't be able to update for themselves
    update_data = user_in.model_dump(exclude_unset=True)
    if 'is_active' in update_data:
        del update_data['is_active']
    if 'role' in update_data:
        del update_data['role']

    # Create a new UserUpdate object with filtered data
    filtered_user_in = UserUpdate(**update_data)

    try:
        updated_user = await crud_users.update_user(db, current_user.id, filtered_user_in)
        return updated_user
    except NotFoundException as e:
        # Should not happen for current_user, but handled defensively
        logger.error(f"Error updating user {current_user.id}: {e.detail}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
    except ConflictException as e:
        logger.warning(f"User update failed due to conflict: {e.detail}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating user {current_user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/{user_id}", response_model=User, summary="Retrieve a user by ID")
async def read_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_admin_dependency) # Only admins can get other users by ID
):
    """
    Retrieve a specific user by their ID.
    **Requires admin privileges.**
    """
    logger.info(f"Admin user {current_user.id} retrieving user with ID: {user_id}")
    user = await crud_users.get_user_by_id(db, user_id)
    if not user:
        logger.warning(f"User with ID {user_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.put("/{user_id}", response_model=User, summary="Update a user by ID")
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_admin_dependency) # Only admins can update other users
):
    """
    Update an existing user by their ID.
    **Requires admin privileges.**
    """
    logger.info(f"Admin user {current_user.id} attempting to update user with ID: {user_id}")
    try:
        updated_user = await crud_users.update_user(db, user_id, user_in)
        return updated_user
    except NotFoundException as e:
        logger.warning(f"User update failed: {e.detail}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
    except ConflictException as e:
        logger.warning(f"User update failed due to conflict: {e.detail}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a user by ID")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_async_db_session),
    current_user: DBUser = Depends(get_current_admin_dependency) # Only admins can delete users
):
    """
    Delete a user by their ID.
    **Requires admin privileges.**
    """
    logger.info(f"Admin user {current_user.id} attempting to delete user with ID: {user_id}")
    if current_user.id == user_id:
        raise BadRequestException(detail="You cannot delete your own account via this endpoint.")
    try:
        success = await crud_users.delete_user(db, user_id)
        if not success: # This case is already handled by NotFoundException in crud, but good to double check
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return # 204 No Content
    except NotFoundException as e:
        logger.warning(f"User deletion failed: {e.detail}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
```