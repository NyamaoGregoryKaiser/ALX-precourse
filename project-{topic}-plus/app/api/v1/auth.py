```python
"""
API endpoints for user authentication and authorization.

This module defines routes for user registration, login, token refresh,
and retrieving the current authenticated user's details.
It integrates with the `auth_service` for business logic.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm

from app.schemas.user import UserCreate, UserRead
from app.schemas.token import Token
from app.services import auth_service, user_service
from app.core.security import get_current_active_user, ALGORITHM
from app.core.exceptions import CustomException
from app.core.rate_limiter import RateLimiter, RateLimit
from datetime import timedelta

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Creates a new user account with a unique email and password."
)
@RateLimiter(times=5, seconds=60) # Allow 5 registrations per minute from an IP
async def register_user(user_in: UserCreate):
    """
    Registers a new user in the system.

    Args:
        user_in (UserCreate): The user registration data including email, password, and full name.

    Returns:
        UserRead: The newly created user's public information.

    Raises:
        HTTPException: If the email is already registered.
    """
    logger.info(f"Attempting to register user with email: {user_in.email}")
    db_user = await user_service.get_user_by_email(user_in.email)
    if db_user:
        logger.warning(f"Registration failed: Email {user_in.email} already registered.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    user = await auth_service.register_new_user(user_in)
    logger.info(f"User {user.email} registered successfully.")
    return user

@router.post(
    "/login",
    response_model=Token,
    summary="User login",
    description="Authenticates a user and returns an access token and refresh token."
)
@RateLimiter(times=10, seconds=60) # Allow 10 login attempts per minute from an IP
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """
    Authenticates a user based on username (email) and password.

    Args:
        form_data (OAuth2PasswordRequestForm): OAuth2 compliant form data
                                               containing username (email) and password.

    Returns:
        Token: An access token and a refresh token.

    Raises:
        HTTPException: If authentication fails (invalid credentials).
    """
    logger.info(f"Attempting login for user: {form_data.username}")
    user = await auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        logger.warning(f"Login failed: Invalid credentials for {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        logger.warning(f"Login failed: User {form_data.username} is inactive.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token_expires = timedelta(minutes=auth_service.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=auth_service.REFRESH_TOKEN_EXPIRE_DAYS)

    access_token = auth_service.create_access_token(
        data={"sub": user.email, "scopes": [user.role]}, expires_delta=access_token_expires
    )
    refresh_token = auth_service.create_refresh_token(
        data={"sub": user.email, "scopes": [user.role]}, expires_delta=refresh_token_expires
    )

    logger.info(f"User {user.email} logged in successfully.")
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post(
    "/refresh",
    response_model=Token,
    summary="Refresh access token",
    description="Uses a refresh token to obtain a new access token and refresh token pair."
)
@RateLimiter(times=5, seconds=300) # Allow 5 token refreshes per 5 minutes per user
async def refresh_access_token(refresh_token: str):
    """
    Refreshes an access token using a valid refresh token.

    Args:
        refresh_token (str): The refresh token.

    Returns:
        Token: A new access token and refresh token pair.

    Raises:
        HTTPException: If the refresh token is invalid or expired.
    """
    logger.info("Attempting to refresh token.")
    try:
        payload = auth_service.decode_token(refresh_token)
        username: str = payload.get("sub")
        if username is None:
            raise CustomException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token payload")
        user = await user_service.get_user_by_email(username)
        if user is None or not user.is_active:
            raise CustomException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token user")

        # Ensure it's actually a refresh token
        token_type = payload.get("token_type")
        if token_type != "refresh":
            raise CustomException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Provided token is not a refresh token")

        access_token_expires = timedelta(minutes=auth_service.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=auth_service.REFRESH_TOKEN_EXPIRE_DAYS)

        new_access_token = auth_service.create_access_token(
            data={"sub": user.email, "scopes": [user.role]}, expires_delta=access_token_expires
        )
        new_refresh_token = auth_service.create_refresh_token(
            data={"sub": user.email, "scopes": [user.role]}, expires_delta=refresh_token_expires
        )

        logger.info(f"Tokens refreshed for user: {username}")
        return {"access_token": new_access_token, "token_type": "bearer", "refresh_token": new_refresh_token}
    except CustomException as e:
        logger.warning(f"Token refresh failed: {e.detail}")
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current user details",
    description="Retrieves the details of the currently authenticated user."
)
async def read_current_user(current_user: Annotated[UserRead, Depends(get_current_active_user)]):
    """
    Retrieves the details of the currently authenticated user.

    Args:
        current_user (UserRead): The authenticated user object, injected by the dependency.

    Returns:
        UserRead: The details of the current user.
    """
    logger.info(f"Fetching details for current user: {current_user.email}")
    return current_user

```