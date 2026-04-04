import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, status, HTTPException, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_limiter.depends import RateLimiter

from app.core.config import settings
from app.db.database import get_db
from app.db.models import User
from app.schemas.auth import Token, LoginRequest, RefreshTokenRequest
from app.schemas.user import UserResponse, UserRegister
from app.services.auth_service import AuthService
from app.utils.security import get_current_user_from_refresh_token, decode_token
from app.exceptions import CredentialException

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED,
             summary="Register a new user",
             description="Allows a new user to register with email and password.")
async def register_user(
    user_in: UserRegister,
    db_service: AuthService = Depends(lambda db=Depends(get_db): AuthService(db)),
    rate_limiter: RateLimiter = Depends(RateLimiter(times=5, seconds=60)) # 5 registrations per minute
):
    """
    Registers a new user in the system.
    Returns the created user's details.
    """
    user = await db_service.register_user(user_in)
    logger.info(f"New user registered: {user.email}")
    return user

@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK,
             summary="User login",
             description="Authenticates a user and returns access and refresh tokens.",
             response_description="Access and refresh tokens with type 'bearer'.")
async def login_for_access_token(
    response: Response, # To set httpOnly cookies for refresh token if desired
    form_data: OAuth2PasswordRequestForm = Depends(), # Standard OAuth2 form data for username/password
    db_service: AuthService = Depends(lambda db=Depends(get_db): AuthService(db)),
    rate_limiter: RateLimiter = Depends(RateLimiter(times=10, seconds=60)) # 10 login attempts per minute
):
    """
    Handles user login, authenticates credentials, and issues JWT access and refresh tokens.
    """
    # Create a LoginRequest object from form_data for service layer compatibility
    login_data = LoginRequest(email=form_data.username, password=form_data.password)
    user = await db_service.authenticate_user(login_data)
    tokens = await db_service.create_auth_tokens(user)
    
    # Optionally set refresh token as an HttpOnly cookie for enhanced security (CSRF protection)
    # response.set_cookie(
    #     key="refresh_token",
    #     value=tokens.refresh_token,
    #     httponly=True,
    #     secure=settings.ENVIRONMENT != "development", # True in production
    #     max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60, # In seconds
    #     samesite="Lax" # Or "Strict"
    # )

    logger.info(f"User {user.email} logged in successfully.")
    return tokens

@router.post("/refresh-token", response_model=Token, status_code=status.HTTP_200_OK,
             summary="Refresh access token",
             description="Uses a refresh token to obtain a new access token and a new refresh token.",
             response_description="New access and refresh tokens with type 'bearer'.")
async def refresh_access_token(
    response: Response,
    refresh_token_request: RefreshTokenRequest,
    current_user: User = Depends(get_current_user_from_refresh_token), # Uses refresh token from request body
    db_service: AuthService = Depends(lambda db=Depends(get_db): AuthService(db)),
    rate_limiter: RateLimiter = Depends(RateLimiter(times=5, seconds=30)) # 5 refreshes per 30 seconds
):
    """
    Refreshes an expired access token using a valid refresh token.
    Issues a new access token and a new refresh token (rolling refresh token strategy).
    """
    # `get_current_user_from_refresh_token` already validates the token and gets the user.
    # Now create new tokens.
    new_tokens = await db_service.refresh_access_token(current_user.id, current_user.email, current_user.role)

    # Optionally update httpOnly cookie with new refresh token
    # response.set_cookie(
    #     key="refresh_token",
    #     value=new_tokens.refresh_token,
    #     httponly=True,
    #     secure=settings.ENVIRONMENT != "development",
    #     max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
    #     samesite="Lax"
    # )

    logger.info(f"Access token refreshed for user {current_user.email}.")
    return new_tokens

# A simple endpoint to test token validity
from app.utils.security import get_current_active_user
@router.get("/me", response_model=UserResponse, summary="Get current user details",
            description="Returns details of the currently authenticated user.",
            dependencies=[Depends(RateLimiter(times=20, seconds=60))]) # 20 calls per minute
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Retrieves the details of the currently authenticated user.
    """
    return current_user
```