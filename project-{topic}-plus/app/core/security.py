```python
import os
import time
from datetime import datetime, timedelta, UTC

from passlib.context import CryptContext
from jose import JWTError, jwt
from app.core.config import settings
from app.core.exceptions import UnauthorizedException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Password Hashing ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies if a plain password matches a hashed password.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hashes a plain password.
    """
    return pwd_context.hash(password)

# --- JWT Token Management ---
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Creates a JWT access token.
    Args:
        data: Payload for the token (e.g., {"sub": user_id, "roles": ["user"]}).
        expires_delta: Optional timedelta for token expiration.
                       If None, uses ACCESS_TOKEN_EXPIRE_MINUTES from settings.
    Returns:
        Encoded JWT token string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire.timestamp(), "iat": datetime.now(UTC).timestamp()}) # Add issued at
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """
    Decodes a JWT access token and validates it.
    Args:
        token: The JWT token string.
    Returns:
        Decoded token payload as a dictionary.
    Raises:
        UnauthorizedException: If the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # Check if token is expired, though jwt.decode should handle it with proper options
        expiration_time = datetime.fromtimestamp(payload.get("exp"), UTC)
        if expiration_time < datetime.now(UTC):
            raise UnauthorizedException("Token has expired.")
        return payload
    except JWTError:
        raise UnauthorizedException("Could not validate credentials.")
    except Exception as e:
        # Catch any other unexpected errors during decoding
        raise UnauthorizedException(f"Token decoding failed: {e}")

# --- Helper for current user extraction in FastAPI dependencies ---
# This is typically implemented in the API endpoints or a dependency file
# However, the core security logic resides here.
```