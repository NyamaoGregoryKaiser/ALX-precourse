```python
import logging
from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_limiter.depends import RateLimiter

from app.core.config import settings
from app.core.exceptions import HTTPException400, HTTPException401, HTTPException403
from app.core.security import create_access_token, create_refresh_token, decode_token, verify_token_type
from app.core.deps import get_db, get_current_user
from app.crud.crud_user import crud_user
from app.schemas.token import Token
from app.schemas.user import UserCreate, User
from app.schemas.msg import Msg

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/login", response_model=Token, summary="Authenticate and get JWT tokens",
             dependencies=[Depends(RateLimiter(times=5, seconds=60))])
async def login_access_token(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Token:
    """
    OAuth2 compatible token login, get an access token and refresh token for future requests.
    Rate limited to 5 requests per minute per IP.
    """
    user = await crud_user.authenticate(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException400(detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException400(detail="Inactive user")

    access_token_expires = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    refresh_token_expires = settings.REFRESH_TOKEN_EXPIRE_MINUTES

    access_token = create_access_token(
        data={"user_id": user.id}, expires_delta=None # uses default from settings
    )
    refresh_token = create_refresh_token(
        data={"user_id": user.id}, expires_delta=None # uses default from settings
    )
    logger.info(f"User {user.email} logged in. Access token expires in {access_token_expires} min, refresh token in {refresh_token_expires} min.")
    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh-token", response_model=Token, summary="Refresh access token using refresh token",
             dependencies=[Depends(RateLimiter(times=3, seconds=60))])
async def refresh_access_token(
    db: AsyncSession = Depends(get_db),
    refresh_token: str = Depends(OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/refresh-token")),
) -> Token:
    """
    Refresh an access token using a valid refresh token.
    Rate limited to 3 requests per minute per IP.
    """
    try:
        payload = decode_token(refresh_token)
        verify_token_type(payload, "refresh") # Ensure it's a refresh token
        user_id: int = payload.get("user_id")
    except HTTPException401:
        raise # Re-raise 401 from decode_token
    except HTTPException403: # Invalid token type
        raise
    except Exception as e:
        logger.error(f"Error decoding refresh token: {e}")
        raise HTTPException401(detail="Could not validate refresh token")

    user = await crud_user.get(db, id=user_id)
    if not user or not user.is_active:
        raise HTTPException401(detail="Invalid refresh token or inactive user")

    new_access_token = create_access_token(data={"user_id": user.id})
    logger.info(f"Access token refreshed for user {user.email}.")
    return Token(access_token=new_access_token)


@router.post("/signup", response_model=User, status_code=status.HTTP_201_CREATED, summary="Register a new user",
             dependencies=[Depends(RateLimiter(times=2, seconds=300))])
async def register_new_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user without the need for authentication.
    Rate limited to 2 requests per 5 minutes per IP.
    """
    user = await crud_user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException409(
            detail="The user with this username already exists in the system."
        )
    user = await crud_user.create(db, obj_in=user_in)
    logger.info(f"New user registered: {user.email}")
    return user

@router.post("/test-token", response_model=User, summary="Test access token validity")
async def test_token(current_user: User = Depends(get_current_user)) -> Any:
    """
    Test access token
    """
    return current_user

```