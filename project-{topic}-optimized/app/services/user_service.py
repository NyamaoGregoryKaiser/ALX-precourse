import logging
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud import user_crud
from app.db.models import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.pagination import PaginatedResponse
from app.utils.security import get_password_hash # Import for password hashing

logger = logging.getLogger(__name__)

class UserService:
    """
    Service layer for User related operations.
    Handles business logic for creating, reading, updating, and deleting users.
    """
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def get_all_users(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
        role: UserRole | None = None
    ) -> PaginatedResponse[User]:
        """
        Retrieves a paginated list of all users, with optional filtering.
        :param skip: Number of users to skip.
        :param limit: Maximum number of users to return.
        :param is_active: Filter by user active status.
        :param role: Filter by user role.
        :return: PaginatedResponse containing User objects.
        """
        filters = {}
        if is_active is not None:
            filters["is_active"] = is_active
        if role:
            filters["role"] = role
        
        users = await user_crud.get_multi(self.db_session, skip=skip, limit=limit, filters=filters)
        logger.debug(f"Retrieved {len(users.data)} users.")
        return users

    async def get_user_by_id(self, user_id: int) -> User:
        """
        Retrieves a single user by their ID.
        :param user_id: The ID of the user to retrieve.
        :return: The User database object.
        :raises HTTPException: If the user is not found.
        """
        user = await user_crud.get(self.db_session, user_id)
        if not user:
            logger.warning(f"User with ID {user_id} not found.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        logger.debug(f"Retrieved user: {user.email} (ID: {user.id})")
        return user

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Retrieves a single user by their email address.
        :param email: The email address of the user to retrieve.
        :return: The User database object if found, otherwise None.
        """
        users = await user_crud.get_multi(self.db_session, filters={"email": email})
        user = users.data[0] if users.data else None
        if not user:
            logger.debug(f"User with email {email} not found.")
        return user

    async def create_user(self, user_in: UserCreate) -> User:
        """
        Creates a new user.
        :param user_in: Pydantic model containing user creation data.
        :return: The newly created User database object.
        :raises HTTPException: If a user with the given email or phone number already exists.
        """
        # Check for existing email
        existing_email_user = await self.get_user_by_email(user_in.email)
        if existing_email_user:
            logger.warning(f"Attempted to create user with existing email: {user_in.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check for existing phone number if provided
        if user_in.phone_number:
            existing_phone_users = await user_crud.get_multi(self.db_session, filters={"phone_number": user_in.phone_number})
            if existing_phone_users.data:
                logger.warning(f"Attempted to create user with existing phone number: {user_in.phone_number}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )

        hashed_password = get_password_hash(user_in.password.get_secret_value())
        user_data = user_in.model_dump(exclude={"password"}) # Exclude raw password
        user_data["hashed_password"] = hashed_password

        new_user = await user_crud.create(self.db_session, user_data)
        logger.info(f"User '{new_user.email}' created successfully (ID: {new_user.id}).")
        return new_user

    async def update_user(self, user_id: int, user_in: UserUpdate, current_user: User) -> User:
        """
        Updates an existing user.
        A user can only update their own profile, unless they are an admin.
        Admins can update any user's profile, including their role and active status.
        :param user_id: The ID of the user to update.
        :param user_in: Pydantic model containing user update data.
        :param current_user: The authenticated User object.
        :return: The updated User database object.
        :raises HTTPException: If user not found, or user is not authorized.
        """
        db_user = await self.get_user_by_id(user_id)

        # Authorization check
        if db_user.id != current_user.id and current_user.role != UserRole.ADMIN:
            logger.warning(f"User {current_user.id} (role: {current_user.role}) attempted to update user {user_id} "
                           f"without authorization.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this user")
        
        # Prevent non-admin users from changing their own role or other sensitive fields
        if current_user.role != UserRole.ADMIN:
            if user_in.role is not None and user_in.role != db_user.role:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to change user role")
            if user_in.is_active is not None and user_in.is_active != db_user.is_active:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to change user active status")
            if user_in.is_verified is not None and user_in.is_verified != db_user.is_verified:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to change user verification status")

        update_data = user_in.model_dump(exclude_unset=True)

        # Handle password update
        if "password" in update_data and update_data["password"]:
            update_data["hashed_password"] = get_password_hash(update_data["password"])
            del update_data["password"] # Remove raw password
        
        # Check for existing email if it's being updated
        if "email" in update_data and update_data["email"] != db_user.email:
            existing_email_user = await self.get_user_by_email(update_data["email"])
            if existing_email_user and existing_email_user.id != db_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered by another user"
                )

        # Check for existing phone number if it's being updated
        if "phone_number" in update_data and update_data["phone_number"] and update_data["phone_number"] != db_user.phone_number:
            existing_phone_users = await user_crud.get_multi(self.db_session, filters={"phone_number": update_data["phone_number"]})
            if existing_phone_users.data and existing_phone_users.data[0].id != db_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered by another user"
                )

        updated_user = await user_crud.update(self.db_session, db_user, update_data)
        logger.info(f"User '{updated_user.email}' (ID: {updated_user.id}) updated by user ID {current_user.id}.")
        return updated_user

    async def delete_user(self, user_id: int, current_user: User) -> User:
        """
        Deletes a user.
        Only admins can delete users.
        :param user_id: The ID of the user to delete.
        :param current_user: The authenticated User object.
        :return: The deleted User database object.
        :raises HTTPException: If user not found, or user is not authorized.
        """
        db_user = await self.get_user_by_id(user_id)

        # Authorization check
        if current_user.role != UserRole.ADMIN:
            logger.warning(f"User {current_user.id} (role: {current_user.role}) attempted to delete user {user_id} "
                           f"without authorization.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can delete users")
        
        # Prevent admin from deleting themselves (optional, but good practice)
        if db_user.id == current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An administrator cannot delete their own account.")

        deleted_user = await user_crud.delete(self.db_session, user_id)
        if not deleted_user: # Should theoretically not happen if get_user_by_id succeeded
            logger.error(f"Failed to delete user {user_id} after it was found.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete user")
        
        logger.info(f"User '{deleted_user.email}' (ID: {deleted_user.id}) deleted by admin {current_user.id}.")
        return deleted_user
```