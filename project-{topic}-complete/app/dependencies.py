```python
import logging
from typing import Annotated

from fastapi import Depends, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import ALGORITHM
from app.db.session import get_db
from app.models.user import User
from app.crud.user import user as crud_user
from app.schemas.token import TokenPayload

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/access-token")


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    Dependency to get the current authenticated user.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise UnauthorizedException(detail="Could not validate credentials")

    current_user = await crud_user.get(db, id=token_data.sub)
    if not current_user:
        raise UnauthorizedException(detail="User not found")
    if not current_user.is_active:
        raise UnauthorizedException(detail="Inactive user")
    return current_user


async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to get the current authenticated superuser.
    """
    if not current_user.is_superuser:
        raise ForbiddenException(detail="The user doesn't have enough privileges")
    return current_user

# Type hints for common dependencies
DBSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentSuperUser = Annotated[User, Depends(get_current_active_superuser)]

```