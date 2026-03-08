```python
from datetime import timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security
from app.crud.user import crud_user
from app.schemas.user import UserCreate
from app.models.user import User

class AuthService:
    """
    Service layer for user authentication and authorization.
    Handles user registration, login, and JWT token generation.
    """
    async def register_user(self, db: AsyncSession, user_in: UserCreate) -> User:
        """
        Registers a new user. Hashes the password before storing.
        Raises HTTPException if username or email already exists.
        """
        existing_user_by_email = await crud_user.get_by_email(db, email=user_in.email)
        if existing_user_by_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        existing_user_by_username = await crud_user.get_by_username(db, username=user_in.username)
        if existing_user_by_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

        hashed_password = security.get_password_hash(user_in.password)
        user_data = user_in.model_dump()
        user_data["hashed_password"] = hashed_password
        del user_data["password"] # Remove plain password before creating object

        user = await crud_user.create(db, obj_in=user_data)
        return user

    async def authenticate_user(
        self, db: AsyncSession, username: str, password: str
    ) -> Optional[User]:
        """
        Authenticates a user by username and password.
        Returns the user object if authentication is successful, else None.
        """
        user = await crud_user.get_by_username(db, username=username)
        if not user or not security.verify_password(password, user.hashed_password):
            return None
        return user

    def create_access_token_for_user(self, user: User, expires_delta: Optional[timedelta] = None) -> str:
        """
        Generates a JWT access token for a given user.
        """
        encode_data = {"sub": user.username, "id": user.id}
        access_token = security.create_access_token(
            data=encode_data, expires_delta=expires_delta
        )
        return access_token

auth_service = AuthService()

```