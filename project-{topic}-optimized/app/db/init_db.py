from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.user import user as crud_user
from app.schemas.user import UserCreate
from app.core.config import settings
from loguru import logger

async def init_db(db: AsyncSession) -> None:
    """
    Initializes the database with a superuser if one doesn't exist.
    """
    superuser = await crud_user.get_by_email(db, email="admin@example.com")
    if not superuser:
        user_in = UserCreate(
            username="admin",
            email="admin@example.com",
            password=settings.SECRET_KEY, # Use a strong password in production!
            is_superuser=True,
            is_active=True,
        )
        superuser = await crud_user.create(db, obj_in=user_in)
        logger.info(f"Superuser '{superuser.username}' created.")
    else:
        logger.info("Superuser already exists.")
```