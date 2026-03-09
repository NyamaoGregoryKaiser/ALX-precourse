from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.user import UserCreate
from app.schemas.auth import Token
from app.crud.user import crud_user
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.core.exceptions import UnauthorizedException, ConflictException, BadRequestException
from app.config import settings
from app.core.logging_config import logger

"""
Business logic service for authentication related operations (registration, login, token refresh).
It orchestrates interactions between CRUD operations, security utilities, and error handling.
"""

class AuthService:
    def __init__(self, user_crud=crud_user):
        self.user_crud = user_crud

    async def register_user(self, db: AsyncSession, user_create: UserCreate):
        """
        Registers a new user in the system.

        Args:
            db (AsyncSession): The database session.
            user_create (UserCreate): Data for creating the user.

        Returns:
            User: The newly created user object.

        Raises:
            ConflictException: If a user with the given email already exists.
        """
        existing_user = await self.user_crud.get_by_email(db, email=user_create.email)
        if existing_user:
            logger.warning(f"Registration attempt with existing email: {user_create.email}")
            raise ConflictException(detail="Email already registered")

        new_user = await self.user_crud.create(db, user_create)
        logger.info(f"User registered successfully: {new_user.email} (ID: {new_user.id})")
        return new_user

    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> Token:
        """
        Authenticates a user and generates JWT tokens upon successful login.

        Args:
            db (AsyncSession): The database session.
            email (str): User's email.
            password (str): User's plain password.

        Returns:
            Token: An object containing access and refresh tokens.

        Raises:
            UnauthorizedException: If authentication fails (invalid credentials or inactive user).
        """
        user = await self.user_crud.get_by_email(db, email=email)
        if not user or not verify_password(password, user.hashed_password):
            logger.warning(f"Failed login attempt for email: {email}")
            raise UnauthorizedException(detail="Incorrect email or password")
        if not user.is_active:
            logger.warning(f"Login attempt by inactive user: {email}")
            raise UnauthorizedException(detail="Inactive user")

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)

        access_token = create_access_token(
            data={"user_id": user.id}, expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(
            data={"user_id": user.id}, expires_delta=refresh_token_expires
        )

        logger.info(f"User {user.email} (ID: {user.id}) logged in successfully.")
        return Token(
            access_token=access_token,
            token_type="bearer",
            refresh_token=refresh_token,
            expires_in=int(access_token_expires.total_seconds())
        )

    async def refresh_access_token(self, db: AsyncSession, refresh_token: str) -> Token:
        """
        Generates a new access token using a valid refresh token.

        Args:
            db (AsyncSession): The database session.
            refresh_token (str): The refresh token provided by the client.

        Returns:
            Token: An object containing a new access token and the original refresh token.

        Raises:
            UnauthorizedException: If the refresh token is invalid or expired.
            BadRequestException: If the token is not a refresh token.
        """
        try:
            payload = decode_token(refresh_token)
            user_id = payload.get("user_id")
            token_type = payload.get("sub")

            if token_type != "refresh":
                logger.warning("Attempted to refresh token with a non-refresh token.")
                raise BadRequestException(detail="Invalid token type: Expected refresh token.")
            if user_id is None:
                logger.warning("Refresh token payload missing user_id.")
                raise UnauthorizedException(detail="Invalid refresh token payload.")

            user = await self.user_crud.get(db, user_id=user_id)
            if not user or not user.is_active:
                logger.warning(f"Refresh token used by non-existent or inactive user ID: {user_id}")
                raise UnauthorizedException(detail="User not found or inactive.")

            access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            new_access_token = create_access_token(
                data={"user_id": user.id}, expires_delta=access_token_expires
            )
            
            logger.info(f"Access token refreshed for user ID: {user_id}")
            return Token(
                access_token=new_access_token,
                token_type="bearer",
                refresh_token=refresh_token, # Return the same refresh token
                expires_in=int(access_token_expires.total_seconds())
            )
        except UnauthorizedException as e:
            raise e
        except BadRequestException as e:
            raise e
        except Exception as e:
            logger.exception("Error during refresh token processing.")
            raise UnauthorizedException(detail="Invalid refresh token.") from e

auth_service = AuthService()
```

```