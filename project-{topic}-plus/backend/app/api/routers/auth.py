```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.schemas.user import UserCreate
from backend.app.schemas.token import Token
from backend.app.services.auth_service import auth_service
from backend.app.core.logger import app_logger

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user and return an access token.
    """
    app_logger.info(f"Attempting to register user: {user_in.email}")
    try:
        token = await auth_service.create_user_and_token(db, user_in)
        app_logger.info(f"User {user_in.email} registered successfully.")
        return token
    except HTTPException as e:
        app_logger.warning(f"User registration failed for {user_in.email}: {e.detail}")
        raise e
    except Exception as e:
        app_logger.exception(f"An unexpected error occurred during registration for {user_in.email}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration."
        )

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    app_logger.info(f"Attempting to log in user: {form_data.username}")
    user = await auth_service.authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        app_logger.warning(f"Authentication failed for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = await auth_service.create_token_for_user(db, user)
    app_logger.info(f"User {user.email} logged in successfully.")
    return token
```