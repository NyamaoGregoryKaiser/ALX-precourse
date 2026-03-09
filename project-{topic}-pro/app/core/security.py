from datetime import datetime, timedelta, timezone
from typing import Optional, Union

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.core.exceptions import UnauthorizedException

"""
Security utilities for password hashing and JWT token management.
"""

# Password hashing context
# Schemes: algorithms used for hashing (bcrypt is recommended)
# deprecated: automatically handles updating old hashes to new ones
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies if a plain password matches a hashed password.

    Args:
        plain_password (str): The password in plain text.
        hashed_password (str): The stored hashed password.

    Returns:
        bool: True if the passwords match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hashes a plain password using the configured hashing algorithm.

    Args:
        password (str): The password in plain text.

    Returns:
        str: The hashed password.
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a new JWT access token.

    Args:
        data (dict): The payload to encode into the token.
        expires_delta (Optional[timedelta]): Custom expiration time.
                                            Defaults to ACCESS_TOKEN_EXPIRE_MINUTES from settings.

    Returns:
        str: The encoded JWT token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "sub": "access"}) # 'sub' claim to differentiate token types
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a new JWT refresh token.

    Args:
        data (dict): The payload to encode into the token.
        expires_delta (Optional[timedelta]): Custom expiration time.
                                            Defaults to REFRESH_TOKEN_EXPIRE_MINUTES from settings.

    Returns:
        str: The encoded JWT token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "sub": "refresh"}) # 'sub' claim to differentiate token types
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decodes a JWT token and returns its payload.

    Args:
        token (str): The JWT token to decode.

    Returns:
        dict: The decoded token payload.

    Raises:
        UnauthorizedException: If the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise UnauthorizedException(detail="Could not validate credentials") from e

```

```