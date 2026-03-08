```python
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_limiter.depends import RateLimiter

from app.core.dependencies import get_db
from app.schemas.user import UserCreate, UserPublic
from app.schemas.token import Token
from app.core.config import get_settings
from app.services.auth import auth_service

router = APIRouter()
settings = get_settings()

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register_user_api(
    user_in: UserCreate, db: AsyncSession = Depends(get_db)
):
    """
    Register a new user.
    - **username**: Unique username.
    - **email**: Unique email address.
    - **password**: Strong password.
    - **full_name**: Optional full name.
    """
    try:
        user = await auth_service.register_user(db, user_in)
        return user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during registration: {e}"
        )

@router.post("/token", response_model=Token, dependencies=[Depends(RateLimiter(times=5, seconds=60))])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 login endpoint to get an access token.
    Rate limited to 5 attempts per minute to prevent brute-force attacks.
    """
    user = await auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token_for_user(
        user, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

```