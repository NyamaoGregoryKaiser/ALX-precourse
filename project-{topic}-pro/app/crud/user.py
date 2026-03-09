from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash

"""
CRUD (Create, Read, Update, Delete) operations for the User model.
This module encapsulates all database interactions related to users.
"""

class CRUDUser:
    def __init__(self, model):
        self.model = model

    async def get(self, db: AsyncSession, user_id: int) -> Optional[User]:
        """
        Retrieves a user by their ID.

        Args:
            db (AsyncSession): The database session.
            user_id (int): The ID of the user to retrieve.

        Returns:
            Optional[User]: The User object if found, otherwise None.
        """
        result = await db.execute(select(self.model).filter(self.model.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """
        Retrieves a user by their email address.

        Args:
            db (AsyncSession): The database session.
            email (str): The email address of the user to retrieve.

        Returns:
            Optional[User]: The User object if found, otherwise None.
        """
        result = await db.execute(select(self.model).filter(self.model.email == email))
        return result.scalar_one_or_none()

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Retrieves all users with pagination.

        Args:
            db (AsyncSession): The database session.
            skip (int): Number of records to skip.
            limit (int): Maximum number of records to return.

        Returns:
            List[User]: A list of User objects.
        """
        result = await db.execute(select(self.model).offset(skip).limit(limit))
        return result.scalars().all()

    async def count(self, db: AsyncSession) -> int:
        """
        Counts the total number of users.

        Args:
            db (AsyncSession): The database session.

        Returns:
            int: Total count of users.
        """
        result = await db.execute(select(func.count(self.model.id)))
        return result.scalar_one()

    async def create(self, db: AsyncSession, user_in: UserCreate) -> User:
        """
        Creates a new user. Hashes the password before storing.

        Args:
            db (AsyncSession): The database session.
            user_in (UserCreate): The Pydantic schema for creating a user.

        Returns:
            User: The newly created User object.
        """
        hashed_password = get_password_hash(user_in.password)
        db_user = self.model(
            email=user_in.email,
            hashed_password=hashed_password,
            is_active=True,
            is_admin=False # Default to non-admin
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user) # Refresh to get auto-generated fields like 'id', 'created_at'
        return db_user

    async def update(self, db: AsyncSession, db_user: User, user_update: UserUpdate) -> User:
        """
        Updates an existing user.

        Args:
            db (AsyncSession): The database session.
            db_user (User): The existing User object to update.
            user_update (UserUpdate): The Pydantic schema with updated user data.

        Returns:
            User: The updated User object.
        """
        update_data = user_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)
        db.add(db_user) # Mark as dirty
        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def delete(self, db: AsyncSession, user_id: int) -> Optional[User]:
        """
        Deletes a user by their ID.

        Args:
            db (AsyncSession): The database session.
            user_id (int): The ID of the user to delete.

        Returns:
            Optional[User]: The deleted User object if found and deleted, otherwise None.
        """
        user = await self.get(db, user_id)
        if user:
            await db.delete(user)
            await db.commit()
            return user
        return None

# Instantiate the CRUD operations for User
crud_user = CRUDUser(User)
```

```