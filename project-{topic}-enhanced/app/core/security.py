```python
import logging
from datetime import datetime, timedelta, UTC
from typing import Optional, Dict, Any

from passlib.context import CryptContext
from jose import jwt, JWTError

from app.core.config import settings
from app.core.exceptions import HTTPException401, HTTPException403

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against a hashed password.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hashes a plain password.
    """
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a JWT access token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "sub": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a JWT refresh token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "sub": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes a JWT token.
    Raises HTTPException401 if token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"Invalid token received: {e}")
        raise HTTPException401(detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})

def verify_token_type(payload: Dict[str, Any], expected_type: str):
    """
    Verifies the 'sub' (subject) claim of a JWT payload to ensure it matches the expected token type.
    """
    token_type = payload.get("sub")
    if token_type != expected_type:
        logger.warning(f"Token type mismatch: expected '{expected_type}', got '{token_type}'")
        raise HTTPException403(detail=f"Invalid token type: expected {expected_type}")
```