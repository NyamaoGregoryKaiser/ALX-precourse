```python
import logging
from typing import Any, Dict, Optional, Union

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.db.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """
        Retrieve a user by their email address.
        """
        stmt = select(self.model).where(self.model.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        """
        Create a new user, hashing their password.
        """
        hashed_password = get_password_hash(obj_in.password)
        db_obj = self.model(
            email=obj_in.email,
            hashed_password=hashed_password,
            full_name=obj_in.full_name,
            is_active=obj_in.is_active,
            is_superuser=obj_in.is_superuser,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        logger.info(f"User '{db_obj.email}' created successfully.")
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        """
        Update an existing user, re-hashing password if provided.
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        if "password" in update_data and update_data["password"]:
            update_data["hashed_password"] = get_password_hash(update_data["password"])
            del update_data["password"] # Remove plain password from update data

        for field, value in update_data.items():
            setattr(db_obj, field, value)

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        logger.info(f"User '{db_obj.email}' updated successfully.")
        return db_obj

    async def authenticate(self, db: AsyncSession, *, email: str, password: str) -> Optional[User]:
        """
        Authenticates a user by email and password.
        """
        user = await self.get_by_email(db, email=email)
        if not user or not user.is_active:
            return None
        from app.core.security import verify_password # Import here to avoid circular dependency
        if not verify_password(password, user.hashed_password):
            return None
        return user

crud_user = CRUDUser(User)
```