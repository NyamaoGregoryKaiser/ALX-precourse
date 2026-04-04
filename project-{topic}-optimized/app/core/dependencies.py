from typing import AsyncGenerator
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.user import user as crud_user
from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import TokenPayload
from app.core.caching import redis_client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    Dependency to get the current authenticated user.
    Validates JWT token and fetches user from DB or cache.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if token_data.sub is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Try to fetch user from cache first
    cached_user_id = await redis_client.get(f"token_user:{token}")
    if cached_user_id and cached_user_id.decode() == token_data.sub:
        # For simplicity, if token_user mapping exists, assume user is valid.
        # For full caching, we would cache user object and deserialize it.
        # Here we just re-fetch from DB as the token itself is the main cache key check.
        # This is a basic example. For real world, deserialize the cached user object.
        current_user = await crud_user.get(db, id=UUID(token_data.sub))
    else:
        current_user = await crud_user.get(db, id=UUID(token_data.sub))
        if current_user:
            # Cache the token to user_id mapping
            await redis_client.setex(f"token_user:{token}", settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, str(current_user.id))

    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency to get the current authenticated superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="The user doesn't have enough privileges"
        )
    return current_user

# Other potential dependencies:
# - get_current_active_user (similar to get_current_user but ensuring active)
# - get_current_active_admin (for role-based access control)
```