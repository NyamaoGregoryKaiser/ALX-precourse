```python
import logging
from typing import Generator, Annotated, AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError

from app.core.config import settings
from app.db.session import get_db
from app.crud.crud_user import crud_user
from app.db.models.user import User
from app.core.security import decode_token, verify_token_type
from app.core.exceptions import HTTPException401, HTTPException403

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    Dependency to get the current authenticated user from a JWT token.
    Raises HTTPException401 if token is invalid or user not found.
    """
    payload = decode_token(token)
    verify_token_type(payload, "access") # Ensure it's an access token
    user_id: str = payload.get("user_id")
    if user_id is None:
        logger.warning("Access token missing user_id payload.")
        raise HTTPException401(detail="Invalid authentication token")

    user = await crud_user.get(db, id=int(user_id))
    if not user:
        logger.warning(f"User with ID {user_id} not found from access token.")
        raise HTTPException401(detail="User not found")
    if not user.is_active:
        logger.warning(f"User with ID {user_id} is inactive.")
        raise HTTPException401(detail="Inactive user")

    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to get the current active authenticated user.
    """
    if not current_user.is_active:
        raise HTTPException401(detail="Inactive user")
    return current_user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Dependency to get the current active authenticated superuser.
    Raises HTTPException403 if user is not a superuser.
    """
    if not current_user.is_superuser:
        raise HTTPException403(detail="Not enough permissions")
    return current_user

CurrentUser = Annotated[User, Depends(get_current_active_user)]
CurrentSuperuser = Annotated[User, Depends(get_current_active_superuser)]
```