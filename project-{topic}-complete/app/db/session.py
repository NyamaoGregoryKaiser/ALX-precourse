```python
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Create the async engine
# echo=True is useful for debugging to see SQL queries in logs
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Configure AsyncSession for database interactions
# expire_on_commit=False prevents objects from being detached after commit
AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get a database session.
    Yields an AsyncSession object and ensures it's closed after use.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```