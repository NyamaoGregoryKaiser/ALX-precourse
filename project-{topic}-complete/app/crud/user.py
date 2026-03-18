```python
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """
    CRUD operations for User model.
    Extends CRUDBase with user-specific logic like password hashing.
    """
    async def create(self, db: AsyncSession, *, obj_in: UserCreate, owner_id: UUID | None = None) -> User:
        """
        Create a new user with hashed password.
        """
        create_data = obj_in.model_dump()
        create_data["hashed_password"] = get_password_hash(obj_in.password)
        del create_data["password"] # Remove plain password before passing to model

        db_obj = self.model(**create_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, *, db_obj: User, obj_in: UserUpdate | dict[str, Any]) -> User:
        """
        Update a user, handling password hashing if provided.
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        if "password" in update_data and update_data["password"]:
            update_data["hashed_password"] = get_password_hash(update_data["password"])
            del update_data["password"]

        return await super().update(db, db_obj=db_obj, obj_in=update_data)

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        """
        Retrieve a user by email address.
        """
        result = await db.execute(select(self.model).filter(User.email == email))
        return result.scalars().first()

    async def is_superuser(self, user: User) -> bool:
        """
        Check if a user is a superuser.
        """
        return user.is_superuser


user = CRUDUser(User)
```