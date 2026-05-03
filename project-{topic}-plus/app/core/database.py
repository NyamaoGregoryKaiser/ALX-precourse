```python
"""
Database configuration and session management for the ALX-Shop application.

This module provides:
- Asynchronous database connection setup using `asyncpg` and `SQLAlchemy`.
- An `AsyncEngine` instance for executing SQL statements.
- An `AsyncSessionLocal` factory for creating session objects.
- A FastAPI dependency `get_db_session` to inject database sessions into routes.
- Base class for SQLAlchemy declarative models.
"""

import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create the asynchronous database engine
# `pool_pre_ping=True` checks connection health before use, `echo=False` for less verbose logs
database_engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    pool_pre_ping=True,
    echo=False,  # Set to True to see SQL queries in logs
    pool_size=10,  # Number of connections in the pool
    max_overflow=20, # Max connections beyond pool_size
    pool_recycle=3600, # Recycle connections after 1 hour
)

# Create an asynchronous sessionmaker
# `autocommit=False` for explicit commit/rollback, `autoflush=False` for lazy flushing
# `expire_on_commit=False` keeps objects in session after commit for easier access to relationships
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=database_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for SQLAlchemy declarative models
Base = declarative_base()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an asynchronous database session.

    This function is a generator that yields an `AsyncSession` object.
    It ensures that the session is properly closed after the request is processed,
    handling both successful responses and exceptions (rollback on error).

    Yields:
        AsyncSession: An asynchronous SQLAlchemy session.
    """
    session = AsyncSessionLocal()
    try:
        yield session
        await session.commit()
        logger.debug("Database session committed.")
    except Exception as e:
        await session.rollback()
        logger.error(f"Database session rolled back due to error: {e}")
        raise
    finally:
        await session.close()
        logger.debug("Database session closed.")


async def close_db_connection(engine):
    """
    Closes the database engine's connections.
    Should be called during application shutdown.
    """
    if engine:
        await engine.dispose()
        logger.info("Database engine connections disposed.")

```