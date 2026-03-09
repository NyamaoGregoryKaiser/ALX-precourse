from typing import Annotated, AsyncGenerator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.crud.user import crud_user
from app.schemas.auth import TokenData
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging_config import logger

"""
Dependency injection functions for FastAPI.
These handle common tasks like getting a DB session, authenticating users,
and checking permissions.
"""

# OAuth2PasswordBearer for handling JWT tokens in HTTP Bearer headers
# The tokenUrl points to the endpoint where clients can obtain a token.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[str, Depends(oauth2_scheme)]
) -> User:
    """
    Dependency to get the current authenticated user from a JWT token.

    Args:
        db (AsyncSession): The database session dependency.
        token (str): The JWT token from the Authorization header.

    Returns:
        User: The authenticated User object.

    Raises:
        UnauthorizedException: If the token is invalid, expired, or user not found/inactive.
    """
    credentials_exception = UnauthorizedException(detail="Could not validate credentials")
    try:
        # Decode the token payload
        payload = decode_token(token)
        user_id: Optional[str] = payload.get("user_id")
        token_type: Optional[str] = payload.get("sub")

        if user_id is None or token_type != "access":
            logger.warning(f"Invalid token payload received: {payload}")
            raise credentials_exception

        token_data = TokenData(user_id=int(user_id))
    except (HTTPException, UnauthorizedException) as e:
        logger.error(f"Token decoding or validation failed: {e.detail}")
        raise credentials_exception
    except Exception as e:
        logger.exception("Unexpected error during token decoding")
        raise credentials_exception

    # Retrieve user from the database
    user = await crud_user.get(db, user_id=token_data.user_id)
    if user is None:
        logger.warning(f"User with ID {token_data.user_id} not found in DB from token.")
        raise credentials_exception
    if not user.is_active:
        logger.warning(f"Inactive user {user.email} tried to authenticate.")
        raise ForbiddenException(detail="Inactive user")

    return user

async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Dependency that ensures the current user is authenticated and active.
    This is redundant with the check in get_current_user, but can be explicit
    if get_current_user were to return inactive users in some scenarios.
    For this project, it just passes through.
    """
    return current_user

async def get_current_admin_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Dependency that ensures the current user is authenticated and an administrator.

    Args:
        current_user (User): The authenticated User object.

    Returns:
        User: The authenticated administrator User object.

    Raises:
        ForbiddenException: If the user is not an administrator.
    """
    if not current_user.is_admin:
        logger.warning(f"User {current_user.email} (ID: {current_user.id}) attempted unauthorized admin access.")
        raise ForbiddenException(detail="Only administrators can perform this action.")
    return current_user

# Global dependency types for FastAPI, making annotations cleaner
DBSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_active_user)]
CurrentAdminUser = Annotated[User, Depends(get_current_admin_user)]
```

```