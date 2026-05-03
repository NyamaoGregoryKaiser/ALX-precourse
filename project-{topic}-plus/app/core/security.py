```python
"""
Security utilities for the ALX-Shop application.

This module handles:
- Hashing and verifying passwords using `passlib.context`.
- Creating, encoding, and decoding JWT (JSON Web Tokens) for authentication.
- FastAPI dependency functions to extract and validate JWT tokens from requests,
  and retrieve the current authenticated user or administrator.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Annotated

from jose import JWTError, jwt
from passlib.context import CryptContext

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.schemas.user import UserRead, UserRole
from app.services.user_service import get_user_by_email
from app.core.exceptions import CustomException

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2PasswordBearer for extracting token from header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/login", scopes={"user": "Standard user", "admin": "Administrator"})


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a hashed password.

    Args:
        plain_password (str): The plain-text password to verify.
        hashed_password (str): The hashed password from the database.

    Returns:
        bool: True if passwords match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hashes a plain-text password.

    Args:
        password (str): The plain-text password to hash.

    Returns:
        str: The hashed password.
    """
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a new JWT access token.

    Args:
        data (Dict[str, Any]): The payload data to encode into the token.
                               Should contain a "sub" (subject) field, typically the user's email.
                               Can also contain "scopes" for roles.
        expires_delta (Optional[timedelta]): The duration until the token expires.
                                            If None, uses `ACCESS_TOKEN_EXPIRE_MINUTES` from settings.

    Returns:
        str: The encoded JWT access token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "token_type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a new JWT refresh token.

    Args:
        data (Dict[str, Any]): The payload data to encode into the token.
                               Should contain a "sub" (subject) field, typically the user's email.
                               Can also contain "scopes" for roles.
        expires_delta (Optional[timedelta]): The duration until the token expires.
                                            If None, uses `REFRESH_TOKEN_EXPIRE_DAYS` from settings.

    Returns:
        str: The encoded JWT refresh token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "token_type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes a JWT token and returns its payload.

    Args:
        token (str): The JWT token to decode.

    Returns:
        Dict[str, Any]: The decoded payload of the token.

    Raises:
        CustomException: If the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        logger.error(f"JWT decoding error: {e}")
        raise CustomException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user_from_token(token: Annotated[str, Depends(oauth2_scheme)]) -> UserRead:
    """
    FastAPI dependency that extracts and validates a JWT token from the request,
    then fetches the corresponding user from the database.

    Args:
        token (str): The JWT token extracted from the Authorization header.

    Returns:
        UserRead: The authenticated user's details.

    Raises:
        HTTPException: If the token is invalid, expired, or the user is not found/inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        username: str = payload.get("sub")
        token_type: str = payload.get("token_type")

        if username is None or token_type != "access":
            raise credentials_exception
    except CustomException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail, headers=e.headers)

    user = await get_user_by_email(username)
    if user is None:
        logger.warning(f"Authenticated user {username} not found in DB.")
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: Annotated[UserRead, Depends(get_current_user_from_token)]
) -> UserRead:
    """
    FastAPI dependency that ensures the authenticated user is active.

    Args:
        current_user (UserRead): The user object from `get_current_user_from_token`.

    Returns:
        UserRead: The active authenticated user's details.

    Raises:
        HTTPException: If the user is inactive.
    """
    if not current_user.is_active:
        logger.warning(f"Inactive user {current_user.email} attempted access.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

async def get_current_active_admin(
    current_user: Annotated[UserRead, Depends(get_current_active_user)]
) -> UserRead:
    """
    FastAPI dependency that ensures the authenticated user is an active administrator.

    Args:
        current_user (UserRead): The user object from `get_current_active_user`.

    Returns:
        UserRead: The active authenticated administrator's details.

    Raises:
        HTTPException: If the user is not an administrator.
    """
    if current_user.role != UserRole.ADMIN:
        logger.warning(f"User {current_user.email} (Role: {current_user.role}) attempted admin access.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have administrative privileges"
        )
    return current_user

```