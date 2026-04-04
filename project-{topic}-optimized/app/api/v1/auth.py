from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_db, get_current_user
from app.core.security import create_access_token, verify_password
from app.crud.user import user as crud_user
from app.schemas.token import Token
from app.schemas.user import UserCreate, User as UserSchema
from app.schemas.msg import Message

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_access_token(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2-compatible token login, get an access token for future requests.
    Expects 'username' (email or actual username) and 'password'.
    """
    user_by_email = await crud_user.get_by_email(db, email=form_data.username)
    user_by_username = await crud_user.get_by_username(db, username=form_data.username)

    user = user_by_email or user_by_username

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username/email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def register_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    """
    Register a new user.
    """
    user = await crud_user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )
    user = await crud_user.get_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this username already exists in the system.",
        )
    
    user = await crud_user.create(db, obj_in=user_in)
    return user

@router.post("/test-token", response_model=UserSchema)
async def test_token(current_user: UserSchema = Depends(get_current_user)) -> Any:
    """
    Test access token - requires authentication.
    Returns the current user's details if the token is valid.
    """
    return current_user
```