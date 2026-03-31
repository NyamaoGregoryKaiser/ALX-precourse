```python
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from backend.app.crud.user import user as crud_user
from backend.app.core.security import verify_password, create_access_token
from backend.app.schemas.user import UserCreate
from backend.app.schemas.token import Token
from backend.app.models.user import User

class AuthService:
    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> Optional[User]:
        db_user = await crud_user.get_by_email(db, email=email)
        if not db_user or not verify_password(password, db_user.hashed_password):
            return None
        return db_user

    async def create_user_and_token(self, db: AsyncSession, user_in: UserCreate) -> Token:
        db_user = await crud_user.get_by_email(db, email=user_in.email)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        db_user = await crud_user.get_by_username(db, username=user_in.username)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

        new_user = await crud_user.create(db, obj_in=user_in)
        access_token = create_access_token(data={"sub": str(new_user.id)})
        return Token(access_token=access_token)

    async def create_token_for_user(self, db: AsyncSession, user: User) -> Token:
        access_token = create_access_token(data={"sub": str(user.id)})
        return Token(access_token=access_token)

auth_service = AuthService()
```