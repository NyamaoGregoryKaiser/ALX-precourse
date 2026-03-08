```python
from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from app.core.db import AsyncSessionLocal
from app.core.security import decode_access_token
from app.core.config import get_settings
from app.crud.user import crud_user
from app.models.user import User
from app.schemas.token import TokenData

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function that provides a database session.
    It's re-exported here for convenience to avoid direct import from core.db in routes.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    Dependency that retrieves the current authenticated user from the JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username: str = payload.get("sub")
        user_id: int = payload.get("id") # Assuming 'id' is also in the token payload
        if username is None or user_id is None:
            raise credentials_exception
        token_data = TokenData(username=username, id=user_id)
    except JWTError:
        raise credentials_exception

    user = await crud_user.get(db, id=token_data.id)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that ensures the current authenticated user is active.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

```