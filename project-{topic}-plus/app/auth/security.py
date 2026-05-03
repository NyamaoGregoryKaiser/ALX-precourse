from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings
from app.models.token import TokenPayload
from app.schemas.user import UserRole
from app.dependencies.common import get_db
from app.crud import users as crud_users
from app.schemas.user import User as DBUser
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

# OAuth2PasswordBearer is used for handling token-based authentication.
# The tokenUrl specifies where the client can send username/password to get a token.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a new JWT access token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> DBUser:
    """
    Dependency to get the current authenticated user from the JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(sub=payload.get("sub"))
    except JWTError:
        logger.warning(f"Invalid JWT token received.")
        raise credentials_exception

    if token_data.sub is None:
        logger.warning(f"JWT token missing subject (user ID).")
        raise credentials_exception

    user = await crud_users.get_user_by_id(db, user_id=token_data.sub)
    if user is None:
        logger.warning(f"User with ID {token_data.sub} not found, despite valid token.")
        raise credentials_exception
    
    if not user.is_active:
        logger.warning(f"User with ID {token_data.sub} is inactive.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    return user

def get_current_active_user(current_user: DBUser = Depends(get_current_user)) -> DBUser:
    """
    Dependency to ensure the current user is active.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

def get_current_active_admin(current_user: DBUser = Depends(get_current_user)) -> DBUser:
    """
    Dependency to ensure the current user is an active admin.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The user doesn't have enough privileges")
    return current_user

def get_current_active_manager(current_user: DBUser = Depends(get_current_user)) -> DBUser:
    """
    Dependency to ensure the current user is an active manager or admin.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    if current_user.role not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The user doesn't have enough privileges")
    return current_user

def get_current_active_member(current_user: DBUser = Depends(get_current_user)) -> DBUser:
    """
    Dependency to ensure the current user is an active member or higher.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    # All roles (admin, manager, member) are considered active members for basic access
    return current_user
```