from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.schemas.user import User as DBUser
from app.models.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.core.exceptions import ConflictException, NotFoundException
from loguru import logger

async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[DBUser]:
    """Retrieve a user by their ID."""
    logger.debug(f"Attempting to retrieve user with ID: {user_id}")
    result = await db.execute(select(DBUser).filter(DBUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.debug(f"User with ID {user_id} not found.")
    return user

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[DBUser]:
    """Retrieve a user by their email address."""
    logger.debug(f"Attempting to retrieve user with email: {email}")
    result = await db.execute(select(DBUser).filter(DBUser.email == email))
    user = result.scalar_one_or_none()
    if not user:
        logger.debug(f"User with email {email} not found.")
    return user

async def get_user_by_username(db: AsyncSession, username: str) -> Optional[DBUser]:
    """Retrieve a user by their username."""
    logger.debug(f"Attempting to retrieve user with username: {username}")
    result = await db.execute(select(DBUser).filter(DBUser.username == username))
    user = result.scalar_one_or_none()
    if not user:
        logger.debug(f"User with username {username} not found.")
    return user

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[DBUser]:
    """Retrieve a list of users with pagination."""
    logger.debug(f"Retrieving users: skip={skip}, limit={limit}")
    result = await db.execute(select(DBUser).offset(skip).limit(limit))
    return result.scalars().all()

async def create_user(db: AsyncSession, user_in: UserCreate) -> DBUser:
    """Create a new user."""
    logger.info(f"Attempting to create new user: {user_in.username}")
    # Check for existing email or username
    existing_user_email = await get_user_by_email(db, user_in.email)
    if existing_user_email:
        logger.warning(f"User creation failed: Email '{user_in.email}' already registered.")
        raise ConflictException(detail="Email already registered")

    existing_user_username = await get_user_by_username(db, user_in.username)
    if existing_user_username:
        logger.warning(f"User creation failed: Username '{user_in.username}' already exists.")
        raise ConflictException(detail="Username already exists")

    hashed_password = get_password_hash(user_in.password)
    db_user = DBUser(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=user_in.is_active,
        role=user_in.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    logger.info(f"User '{db_user.username}' (ID: {db_user.id}) created successfully.")
    return db_user

async def update_user(db: AsyncSession, user_id: int, user_in: UserUpdate) -> DBUser:
    """Update an existing user."""
    logger.info(f"Attempting to update user with ID: {user_id}")
    db_user = await get_user_by_id(db, user_id)
    if not db_user:
        logger.warning(f"User update failed: User with ID {user_id} not found.")
        raise NotFoundException(detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)

    # Handle unique constraints for email and username if they are being updated
    if "email" in update_data and update_data["email"] != db_user.email:
        existing_user = await get_user_by_email(db, update_data["email"])
        if existing_user and existing_user.id != user_id:
            logger.warning(f"User update failed: Email '{update_data['email']}' already registered by another user.")
            raise ConflictException(detail="Email already registered by another user")

    if "username" in update_data and update_data["username"] != db_user.username:
        existing_user = await get_user_by_username(db, update_data["username"])
        if existing_user and existing_user.id != user_id:
            logger.warning(f"User update failed: Username '{update_data['username']}' already exists for another user.")
            raise ConflictException(detail="Username already exists for another user")

    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"] # Remove plain password before update

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.add(db_user) # Mark for update
    await db.commit()
    await db.refresh(db_user)
    logger.info(f"User '{db_user.username}' (ID: {db_user.id}) updated successfully.")
    return db_user

async def delete_user(db: AsyncSession, user_id: int) -> bool:
    """Delete a user by their ID."""
    logger.info(f"Attempting to delete user with ID: {user_id}")
    db_user = await get_user_by_id(db, user_id)
    if not db_user:
        logger.warning(f"User deletion failed: User with ID {user_id} not found.")
        raise NotFoundException(detail="User not found")

    await db.delete(db_user)
    await db.commit()
    logger.info(f"User (ID: {user_id}) deleted successfully.")
    return True
```