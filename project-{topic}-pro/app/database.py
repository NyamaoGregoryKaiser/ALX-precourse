from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

"""
Database configuration and session management for SQLAlchemy.
Uses an asynchronous engine and session for compatibility with FastAPI's async nature.
"""

# Create an asynchronous SQLAlchemy engine
# `pool_pre_ping=True` helps maintain active connections
# `echo=True` will print all SQL statements to console (useful for debugging)
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG, pool_pre_ping=True)

# Create a sessionmaker for producing new AsyncSession objects.
# `autocommit=False` and `autoflush=False` mean that transactions
# must be explicitly committed or rolled back.
# `expire_on_commit=False` means objects will not be expired after commit,
# allowing them to be used outside the session's scope if needed (with caution).
AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base class for our declarative models
# All SQLAlchemy models will inherit from this Base.
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to provide a database session.
    This function is used by FastAPI's dependency injection system.
    It ensures that a new session is created for each request and properly closed afterwards.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# For running Alembic migrations, we sometimes need a synchronous engine
# especially if alembic.ini is configured with `sqlalchemy.url` directly.
# However, `env.py` has been updated to use the settings.DATABASE_URL
# which should be an async URL. Alembic can handle async URLs internally
# by creating a synchronous connection, or we can use a helper.
# For simplicity, if `sqlalchemy.url` is set to an async URL, Alembic's
# `engine_from_config` will handle it.
```

```