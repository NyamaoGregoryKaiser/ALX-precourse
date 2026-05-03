```python
"""
Authentication service module for ALX-Shop.

This module encapsulates the business logic for user authentication,
including:
- Registering new users.
- Authenticating users with email and password.
- Creating access and refresh tokens.
- Interacting with the `user_service` and `security` modules.
"""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session
from fastapi import Depends

from app.schemas.user import UserCreate, UserRead, UserRole
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.services import user_service
from app.core.config import settings

logger = logging.getLogger(__name__)

# Constants for token expiration, imported from settings
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
ALGORITHM = settings.ALGORITHM


async def register_new_user(user_in: UserCreate, db: AsyncSession = Depends(get_db_session)) -> UserRead:
    """
    Registers a new user in the system.

    Args:
        user_in (UserCreate): The user data including email, password, full_name, role.
        db (AsyncSession): The database session.

    Returns:
        UserRead: The newly created user's data (excluding hashed password).
    """
    logger.info(f"Attempting to register new user: {user_in.email}")
    hashed_password = get_password_hash(user_in.password)
    user_data = user_in.model_dump()
    user_data["hashed_password"] = hashed_password
    del user_data["password"] # Remove plain password before passing to service

    # Create user via user_service
    created_user = await user_service.create_user(user_data, db=db)
    logger.info(f"User {created_user.email} registered successfully with role {created_user.role.value}.")
    return created_user

async def authenticate_user(email: str, password: str, db: AsyncSession = Depends(get_db_session)) -> Optional[UserRead]:
    """
    Authenticates a user by email and password.

    Args:
        email (str): The user's email address.
        password (str): The user's plain-text password.
        db (AsyncSession): The database session.

    Returns:
        Optional[UserRead]: The authenticated user's data if credentials are valid, else None.
    """
    logger.debug(f"Attempting to authenticate user: {email}")
    user = await user_service.get_user_by_email(email, db=db)
    if not user:
        logger.debug(f"Authentication failed: User {email} not found.")
        return None
    if not verify_password(password, user.hashed_password):
        logger.debug(f"Authentication failed: Invalid password for user {email}.")
        return None
    logger.info(f"User {email} authenticated successfully.")
    return user

```