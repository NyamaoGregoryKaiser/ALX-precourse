import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Union

from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.core.config import settings
from app.db.models import User
from app.schemas.auth import TokenData
from app.exceptions import CredentialException # Custom exception

logger = logging.getLogger(__name__)

# Password hashing context (Bcrypt is recommended)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against its hashed version.
    :param plain_password: The unhashed password string.
    :param hashed_password: The hashed password string.
    :return: True if passwords match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hashes a plain password.
    :param password: The plain password string.
    :return: The hashed password string.
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None) -> str:
    """
    Creates a JWT access token.
    :param data: Payload data to include in the token.
    :param expires_delta: Optional timedelta for expiration.
                          If None, uses default from settings.
    :return: Encoded JWT access token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM)
    logger.debug(f"Access token created for sub: {data.get('sub')}")
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Union[timedelta, None] = None) -> str:
    """
    Creates a JWT refresh token.
    :param data: Payload data to include in the token.
    :param expires_delta: Optional timedelta for expiration.
                          If None, uses default from settings.
    :return: Encoded JWT refresh token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM)
    logger.debug(f"Refresh token created for sub: {data.get('sub')}")
    return encoded_jwt

def decode_token(token: str) -> dict:
    """
    Decodes a JWT token.
    :param token: The JWT token string.
    :return: Decoded payload as a dictionary.
    :raises CredentialException: If token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"Invalid token: {e}")
        raise CredentialException(detail="Could not validate credentials", status_code=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        logger.error(f"Unexpected error decoding token: {e}")
        raise CredentialException(detail="An unexpected error occurred during token validation", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- FastAPI Dependency for Current User ---
# These are meant to be used with `Depends()` in FastAPI path operations.

from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login") # Point to your login endpoint

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    """
    FastAPI dependency to get the current authenticated user from an access token.
    :param token: The JWT access token from the Authorization header.
    :param db: The async database session.
    :return: The authenticated User database object.
    :raises CredentialException: If token is invalid, expired, or user not found/inactive.
    """
    payload = decode_token(token)
    user_id: int = payload.get("sub")
    token_type: str = payload.get("type")

    if user_id is None or token_type != "access":
        logger.warning("Invalid token payload or type during get_current_user.")
        raise CredentialException

    from app.db.crud import user_crud # Import here to avoid circular dependency
    user = await user_crud.get(db, user_id)
    if user is None:
        logger.warning(f"User ID {user_id} from token not found in DB.")
        raise CredentialException(detail="User not found")
    if not user.is_active:
        logger.warning(f"User ID {user_id} is inactive.")
        raise CredentialException(detail="Inactive user")
    
    logger.debug(f"Authenticated user: {user.email} (ID: {user.id}, Role: {user.role})")
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    FastAPI dependency to get the current active authenticated user.
    Ensures the user is not just authenticated but also active.
    """
    if not current_user.is_active:
        logger.warning(f"Access denied for inactive user: {current_user.email}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

async def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """
    FastAPI dependency to get the current active authenticated admin user.
    """
    from app.db.models import UserRole # Import here to avoid circular dependency
    if current_user.role != UserRole.ADMIN:
        logger.warning(f"Access denied for non-admin user: {current_user.email} (Role: {current_user.role})")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized. Admin privileges required.")
    return current_user

async def get_current_user_from_refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get the user from a refresh token.
    Validates the refresh token and ensures it's a refresh token type.
    :param refresh_token: The JWT refresh token string.
    :param db: The async database session.
    :return: The authenticated User database object.
    :raises CredentialException: If token is invalid, expired, or user not found/inactive.
    """
    try:
        payload = decode_token(refresh_token)
        user_id: int = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "refresh":
            logger.warning("Invalid refresh token payload or type.")
            raise CredentialException(detail="Invalid refresh token")

        from app.db.crud import user_crud
        user = await user_crud.get(db, user_id)
        if user is None:
            logger.warning(f"User ID {user_id} from refresh token not found in DB.")
            raise CredentialException(detail="User not found")
        if not user.is_active:
            logger.warning(f"User ID {user_id} is inactive for refresh token.")
            raise CredentialException(detail="Inactive user")

        logger.debug(f"User {user.email} authenticated via refresh token.")
        return user
    except JWTError:
        raise CredentialException(detail="Invalid or expired refresh token")
```