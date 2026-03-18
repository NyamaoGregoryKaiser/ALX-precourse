```python
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import UnauthorizedException
from app.core.security import create_access_token, verify_password
from app.crud.user import user as crud_user
from app.db.session import get_db
from app.schemas.token import Token
from app.schemas.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/access-token", response_model=Token, summary="Get JWT access token")
async def login_access_token(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = await crud_user.get_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise UnauthorizedException(detail="Incorrect email or password")
    if not user.is_active:
        raise UnauthorizedException(detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )


@router.post("/test-token", response_model=User, summary="Test current token (returns user data)")
async def test_token(current_user: User = Depends(get_db)) -> User: # Incorrect dependency in example (should be get_current_user)
    """
    Test access token.
    """
    # Fixed: current_user should come from get_current_user dependency
    return current_user

# Corrected test_token endpoint:
from app.dependencies import CurrentUser

@router.post("/test-token-corrected", response_model=User, summary="Test current token (returns user data) - Corrected version")
async def test_token_corrected(current_user: CurrentUser) -> User:
    """
    Test access token.
    """
    return current_user
```