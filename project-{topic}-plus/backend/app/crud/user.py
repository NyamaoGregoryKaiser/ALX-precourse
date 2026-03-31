```python
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.crud.base import CRUDBase
from backend.app.models.user import User
from backend.app.schemas.user import UserCreate, UserUpdate
from backend.app.core.security import get_password_hash

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        stmt = select(self.model).where(self.model.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, *, username: str) -> Optional[User]:
        stmt = select(self.model).where(self.model.username == username)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        hashed_password = get_password_hash(obj_in.password)
        db_obj = self.model(
            username=obj_in.username,
            email=obj_in.email,
            hashed_password=hashed_password
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, *, db_obj: User, obj_in: UserUpdate) -> User:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        if "password" in update_data and update_data["password"]:
            update_data["hashed_password"] = get_password_hash(update_data["password"])
            del update_data["password"]

        return await super().update(db, db_obj=db_obj, obj_in=update_data)

user = CRUDUser(User)
```