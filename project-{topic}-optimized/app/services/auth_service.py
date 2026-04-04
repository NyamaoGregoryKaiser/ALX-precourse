import logging
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.crud import user_crud
from app.db.models import User
from app.schemas.auth import Token, LoginRequest
from app.schemas.user import UserCreate, UserRegister
from app.utils.security import verify_password, create_access_token, create_refresh_token, get_password_hash

logger = logging.getLogger(__name__)

class AuthService:
    """
    Service layer for authentication related operations.
    Handles user registration, login, and token generation.
    """
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def register_user(self, user_in: UserRegister) -> User:
        """
        Registers a new user in the system.
        :param user_in: Pydantic model containing user registration data.
        :return: The created User database object.
        :raises HTTPException: If a user with the given email already exists.
        """
        existing_user = await user_crud.get_multi(self.db_session, filters={"email": user_in.email})
        if existing_user.data:
            logger.warning(f"Registration attempt with existing email: {user_in.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        hashed_password = get_password_hash(user_in.password.get_secret_value())
        user_data = user_in.model_dump(exclude={"password"})
        user_data["hashed_password"] = hashed_password

        # Explicitly convert to UserCreate schema for CRUD method compatibility
        # This handles the SecretStr from Pydantic automatically
        user_create_schema = UserCreate(**user_data, password=user_in.password.get_secret_value())

        user = await user_crud.create(self.db_session, user_data)
        logger.info(f"User registered successfully: {user.email}")
        return user

    async def authenticate_user(self, login_data: LoginRequest) -> User:
        """
        Authenticates a user based on email and password.
        :param login_data: Pydantic model containing login credentials.
        :return: The authenticated User database object.
        :raises HTTPException: If authentication fails (incorrect credentials or inactive user).
        """
        users = await user_crud.get_multi(self.db_session, filters={"email": login_data.email})
        user = users.data[0] if users.data else None

        if not user or not verify_password(login_data.password.get_secret_value(), user.hashed_password):
            logger.warning(f"Failed login attempt for email: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user",
            )
        logger.info(f"User authenticated successfully: {user.email}")
        return user

    async def create_auth_tokens(self, user: User) -> Token:
        """
        Generates access and refresh tokens for a given user.
        :param user: The User database object.
        :return: A Token Pydantic model containing access and refresh tokens.
        """
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)

        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role},
            expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id)}, # Refresh tokens typically have minimal claims
            expires_delta=refresh_token_expires
        )
        logger.debug(f"Tokens created for user: {user.email}")
        return Token(access_token=access_token, token_type="bearer", refresh_token=refresh_token)

    async def refresh_access_token(self, user_id: int, user_email: str, user_role: str) -> Token:
        """
        Generates a new access token using a valid refresh token.
        A new refresh token is also issued for rolling token strategy.
        :param user_id: The ID of the user.
        :param user_email: The email of the user.
        :param user_role: The role of the user.
        :return: A Token Pydantic model with new access and refresh tokens.
        """
        # For refresh, we assume the refresh_token has already been validated and user_id extracted
        user = await user_crud.get(self.db_session, user_id)
        if not user or not user.is_active:
            logger.warning(f"Attempted token refresh for invalid/inactive user ID: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or inactive user for token refresh",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return await self.create_auth_tokens(user)
```