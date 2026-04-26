```python
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from config import settings

# Create an async engine for SQLAlchemy
engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    echo=False,  # Set to True to see SQL queries in console
    pool_size=10,
    max_overflow=20,
    future=True
)

# Configure the sessionmaker for async sessions
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False # To prevent objects from being expired after commit
)

# Base class for declarative models
Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to provide a database session for each request.
    It yields a session and ensures it's closed after the request.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

---

### 2. Database Layer

**Database**: PostgreSQL
**ORM**: SQLAlchemy with Alembic for migrations.