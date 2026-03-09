from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm

from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import Token, RefreshTokenRequest
from app.core.dependencies import DBSession, CurrentUser
from app.services.auth import auth_service
from app.core.exceptions import ConflictException, UnauthorizedException, BadRequestException
from app.core.logging_config import logger

"""
API Router for authentication-related endpoints.
Handles user registration, login, and token refreshing.
"""

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Creates a new user account with provided email and password."
)
async def register_user(
    user_create: UserCreate,
    db: DBSession
):
    """
    Registers a new user.
    - **email**: Unique email address.
    - **password**: User's password (min 8 characters).
    """
    logger.info(f"Attempting to register new user with email: {user_create.email}")
    try:
        user = await auth_service.register_user(db, user_create)
        return user
    except ConflictException as e:
        raise e
    except Exception as e:
        logger.error(f"Error during user registration for {user_create.email}: {e}", exc_info=True)
        raise JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An unexpected error occurred during registration."}
        ) from e


@router.post(
    "/login",
    response_model=Token,
    summary="User login",
    description="Authenticates a user with email and password, returning JWT access and refresh tokens."
)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DBSession
):
    """
    Handles user login.
    - **username**: User's email address.
    - **password**: User's password.
    """
    logger.info(f"Attempting login for user: {form_data.username}")
    try:
        # OAuth2PasswordRequestForm uses 'username' field which maps to our 'email'
        tokens = await auth_service.authenticate_user(db, form_data.username, form_data.password)
        return tokens
    except UnauthorizedException as e:
        logger.warning(f"Failed login attempt for {form_data.username}: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Error during user login for {form_data.username}: {e}", exc_info=True)
        raise JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An unexpected error occurred during login."}
        ) from e


@router.post(
    "/refresh",
    response_model=Token,
    summary="Refresh access token",
    description="Uses a refresh token to obtain a new access token without re-authenticating."
)
async def refresh_access_token(
    refresh_request: RefreshTokenRequest,
    db: DBSession
):
    """
    Refreshes the access token using a valid refresh token.
    - **refresh_token**: The refresh token.
    """
    logger.info("Attempting to refresh access token.")
    try:
        tokens = await auth_service.refresh_access_token(db, refresh_request.refresh_token)
        return tokens
    except (UnauthorizedException, BadRequestException) as e:
        raise e
    except Exception as e:
        logger.error(f"Error during token refresh: {e}", exc_info=True)
        raise JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An unexpected error occurred during token refresh."}
        ) from e


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user details",
    description="Retrieves the profile information of the currently authenticated user."
)
async def read_current_user(
    current_user: CurrentUser
):
    """
    Returns the details of the currently authenticated user.
    Requires a valid access token.
    """
    logger.debug(f"User {current_user.email} (ID: {current_user.id}) requested their own profile.")
    return current_user
```

```