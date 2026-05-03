```python
"""
User service module for ALX-Shop.

This module encapsulates the business logic for managing users, including:
- CRUD operations for users.
- Querying users by various criteria.
- Ensuring data integrity and applying business rules related to users.
- Interacting with the database via SQLAlchemy.
"""

import logging
from typing import List, Optional, Dict, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.database import get_db_session
from app.models.user import User # Import the SQLAlchemy ORM model
from app.schemas.user import UserCreate, UserUpdate, UserRead, UserRole
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

async def get_user_by_id(user_id: int, db: AsyncSession = Depends(get_db_session)) -> Optional[UserRead]:
    """
    Retrieves a user by their ID.

    Args:
        user_id (int): The ID of the user to retrieve.
        db (AsyncSession): The database session.

    Returns:
        Optional[UserRead]: The user's data if found, else None.
    """
    logger.debug(f"Fetching user with ID: {user_id}")
    result = await db.execute(select(User).filter(User.id == user_id))
    user_orm = result.scalar_one_or_none()
    if user_orm:
        logger.debug(f"Found user: {user_orm.email}")
        return UserRead.model_validate(user_orm)
    logger.debug(f"User with ID {user_id} not found.")
    return None

async def get_user_by_email(email: str, db: AsyncSession = Depends(get_db_session)) -> Optional[UserRead]:
    """
    Retrieves a user by their email address.

    Args:
        email (str): The email address of the user to retrieve.
        db (AsyncSession): The database session.

    Returns:
        Optional[UserRead]: The user's data if found, else None.
    """
    logger.debug(f"Fetching user with email: {email}")
    result = await db.execute(select(User).filter(User.email == email))
    user_orm = result.scalar_one_or_none()
    if user_orm:
        logger.debug(f"Found user: {user_orm.email}")
        return UserRead.model_validate(user_orm)
    logger.debug(f"User with email {email} not found.")
    return None

async def get_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session)
) -> List[UserRead]:
    """
    Retrieves a paginated list of users, with optional search functionality.

    Args:
        skip (int): The number of records to skip.
        limit (int): The maximum number of records to return.
        search (Optional[str]): A search term to filter users by email or full name.
        db (AsyncSession): The database session.

    Returns:
        List[UserRead]: A list of user data.
    """
    logger.debug(f"Fetching users with skip={skip}, limit={limit}, search='{search}'")
    query = select(User)
    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(User.email).like(search_pattern)) |
            (func.lower(User.full_name).like(search_pattern))
        )
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    users_orm = result.scalars().all()
    logger.debug(f"Retrieved {len(users_orm)} users.")
    return [UserRead.model_validate(user) for user in users_orm]

async def create_user(user_data: Dict[str, Any], db: AsyncSession = Depends(get_db_session)) -> UserRead:
    """
    Creates a new user in the database.

    Args:
        user_data (Dict[str, Any]): A dictionary containing user data,
                                     including 'email', 'hashed_password', etc.
                                     This dictionary should already have the password hashed.
        db (AsyncSession): The database session.

    Returns:
        UserRead: The newly created user's data.
    """
    logger.info(f"Creating user with email: {user_data.get('email')}")
    # Ensure role is converted to enum if passed as string
    if isinstance(user_data.get('role'), str):
        user_data['role'] = UserRole(user_data['role'])

    db_user = User(**user_data)
    db.add(db_user)
    await db.flush() # Flush to get the ID for relationships if needed later, before commit
    await db.refresh(db_user) # Refresh to load default values like created_at, updated_at, and ID
    logger.info(f"User {db_user.email} created successfully with ID: {db_user.id}")
    return UserRead.model_validate(db_user)


async def update_user(user_id: int, user_in: UserUpdate, db: AsyncSession = Depends(get_db_session)) -> Optional[UserRead]:
    """
    Updates an existing user's details.

    Args:
        user_id (int): The ID of the user to update.
        user_in (UserUpdate): The Pydantic model with updated user data.
        db (AsyncSession): The database session.

    Returns:
        Optional[UserRead]: The updated user's data if found and updated, else None.
    """
    logger.info(f"Updating user with ID: {user_id}")
    result = await db.execute(select(User).filter(User.id == user_id))
    db_user = result.scalar_one_or_none()

    if not db_user:
        logger.warning(f"User with ID {user_id} not found for update.")
        return None

    update_data = user_in.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]

    for field, value in update_data.items():
        if field == "role" and isinstance(value, str):
            setattr(db_user, field, UserRole(value)) # Convert string to Enum
        else:
            setattr(db_user, field, value)

    db.add(db_user)
    await db.flush()
    await db.refresh(db_user)
    logger.info(f"User {user_id} updated successfully.")
    return UserRead.model_validate(db_user)

async def delete_user(user_id: int, db: AsyncSession = Depends(get_db_session)) -> bool:
    """
    Deletes a user from the database.

    Args:
        user_id (int): The ID of the user to delete.
        db (AsyncSession): The database session.

    Returns:
        bool: True if the user was deleted, False if not found.
    """
    logger.info(f"Attempting to delete user with ID: {user_id}")
    result = await db.execute(select(User).filter(User.id == user_id))
    db_user = result.scalar_one_or_none()

    if not db_user:
        logger.warning(f"User with ID {user_id} not found for deletion.")
        return False

    await db.delete(db_user)
    # The session commit in `get_db_session` will finalize the deletion
    logger.info(f"User {user_id} deleted successfully.")
    return True

```